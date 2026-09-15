"""Transport-neutral local llama.cpp invocation worker, commissioned by Agent Control.

Request arrives from the authenticated controller, never from model output.
Every temporary service change is paired with bounded restoration in finally.
"""
import hashlib
import shutil
import platform
import sys
import datetime
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import threading
import time
import urllib.request


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(4 * 1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def memory():
    result = {}
    for line in Path('/proc/meminfo').read_text().splitlines():
        key, value = line.split(':', 1)
        result[key] = int(value.split()[0]) * 1024
    return result


def health(url):
    try:
        with urllib.request.urlopen(url + '/health', timeout=2) as response:
            return response.status == 200
    except Exception:
        return False


def process_identity(pid):
    p = Path('/proc') / str(pid)
    # starttime comes after the closing parenthesis in proc stat, so spaces in comm are safe.
    stat = (p / 'stat').read_text().rsplit(')', 1)[1].split()
    return stat[19]


def terminate(pid, identity):
    try:
        if process_identity(pid) != identity:
            raise RuntimeError('process_identity_changed')
        os.kill(pid, signal.SIGTERM)
        for _ in range(100):
            p = Path('/proc') / str(pid)
            if not p.exists() or (p / 'stat').read_text().rsplit(')', 1)[1].split()[0] == 'Z':
                return
            time.sleep(.1)
        raise RuntimeError('graceful_termination_unconfirmed')
    except FileNotFoundError:
        return


def emit_lifecycle(request, kind, **data):
    row = {'schema': 'agent-control.runtime-lifecycle/v1', 'type': kind,
           'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
           'clock': 'target', 'producer': request['producer'], 'data': data}
    try:
        print(json.dumps({'runtimeEvent': row}), flush=True)
    except BrokenPipeError:
        request['_event_delivery_failed'] = True


def run(request):
    profile = request['profile']
    def request_cancel(signum, frame):
        request['_cancel_requested'] = True
    signal.signal(signal.SIGTERM, request_cancel)
    signal.signal(signal.SIGHUP, request_cancel)
    started = time.time()
    result = {'status': 'FAILED', 'input': request['input'], 'output': '', 'error': None,
              'tokens': {'input': None, 'cached': None, 'output': None}, 'metrics': {},
              'configuration': profile, 'rawResponse': {'events': [], 'samples': []},
              'evidenceAvailability': {'input-output': 'RECORDED', 'tokens': 'UNAVAILABLE',
                                      'cachedTokens': 'UNAVAILABLE', 'physical-telemetry': 'UNAVAILABLE'}}
    raw = result['rawResponse']
    raw['provenance'] = 'AGENT_CONTROL_RUNTIME_EVIDENCE'
    raw['producer'] = request['producer']
    emit_lifecycle(request, 'runtime.request_received', operation='invoke')
    original = request.get('originalService')
    suspended = False
    restored = original is None
    child = None
    monitor_stop = threading.Event()
    root = Path(request['stateDirectory'])
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    log_path = root / (request['attemptId'] + '.log')
    abort_path = root / (request['attemptId'] + '.abort')
    receipt_path = root / (request['attemptId'] + '.result.json')
    try:
        for field, expected in [('runtimePath', 'runtimeSha256'), ('modelPath', 'modelSha256')]:
            if digest(profile[field]) != profile[expected]:
                raise RuntimeError('artifact_identity_mismatch')
        for dependency in profile.get('runtimeDependencies', []):
            if digest(dependency['path']) != dependency['sha256']:
                raise RuntimeError('runtime_dependency_identity_mismatch')
        if request.get('_cancel_requested'):
            raise RuntimeError('runtime_cancelled_before_preparation')
        if original:
            args = original['args']
            endpoint = 'http://127.0.0.1:' + args[args.index('--port') + 1]
            candidates = []
            for p in Path('/proc').iterdir():
                if not p.name.isdigit():
                    continue
                try:
                    if p.stat().st_uid != os.getuid():
                        continue
                    observed = [b.decode() for b in (p / 'cmdline').read_bytes().split(b'\0') if b]
                    if observed == args:
                        candidates.append(int(p.name))
                except OSError:
                    pass
            if len(candidates) != 1:
                raise RuntimeError('original_service_identity_ambiguous')
            for _ in range(2):
                slots = json.load(urllib.request.urlopen(endpoint + '/slots', timeout=3))
                if not slots or not all(s.get('is_processing') is False for s in slots):
                    raise RuntimeError('original_service_busy')
                time.sleep(.5)
            pid = candidates[0]
            raw['originalServicePid'] = pid
            suspended = True  # Cleanup is required even if termination partially fails.
            emit_lifecycle(request, 'service.suspending', pid=pid)
            terminate(pid, process_identity(pid))
            emit_lifecycle(request, 'service.suspended', pid=pid)
        before = memory()
        raw['beforeMemory'] = before
        emit_lifecycle(request, 'admission.memory', availableBytes=before.get('MemAvailable'), minimumBytes=request['minimumAvailableBytes'], allowed=before.get('MemAvailable', 0) >= request['minimumAvailableBytes'])
        if before.get('MemAvailable', 0) < request['minimumAvailableBytes']:
            raise RuntimeError('insufficient_available_memory')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        url = 'http://127.0.0.1:' + str(port)
        args = [profile['runtimePath'], '--model', profile['modelPath'], '--alias', profile['model'],
                '--host', '127.0.0.1', '--port', str(port), '--ctx-size', str(profile['context']),
                '--threads', str(profile['threads']), '--threads-batch', str(profile['threads']),
                '--n-gpu-layers', str(profile['gpuLayers']), '--batch-size', str(profile['batch']),
                '--ubatch-size', str(profile['microBatch']), '--parallel', '1', '--no-warmup',
                '--jinja', '--reasoning', 'off']
        raw['command'] = args
        load_start = time.monotonic()
        with open(log_path, 'xb', buffering=0) as log:
            child = subprocess.Popen(args, stdin=subprocess.DEVNULL, stdout=log, stderr=log)
        owned_identity = process_identity(child.pid)
        raw['runtimePid'] = child.pid
        raw['runtimeStartIdentity'] = owned_identity
        emit_lifecycle(request, 'runtime.started', pid=child.pid, startIdentity=owned_identity, command=args)

        def monitor():
            while not monitor_stop.is_set():
                try:
                    if request.get('_cancel_requested') or abort_path.exists() or time.time()-started > profile['startupTimeoutSeconds']+profile['inferenceTimeoutSeconds']+60:
                        emit_lifecycle(request, 'runtime.abort_requested', reason='controller_abort_or_target_deadline')
                        terminate(child.pid, owned_identity)
                        return
                    status = (Path('/proc') / str(child.pid) / 'status').read_text()
                    values = {line.split(':')[0]: int(line.split()[1]) * 1024
                              for line in status.splitlines() if line.startswith(('VmRSS:', 'VmHWM:'))}
                    stat = (Path('/proc') / str(child.pid) / 'stat').read_text().rsplit(')', 1)[1].split()
                    raw['samples'].append({'at': time.time(), 'memory': values,
                                           'cpuTicks': int(stat[11]) + int(stat[12]),
                                           'availableBytes': memory().get('MemAvailable')})
                except OSError:
                    pass
                monitor_stop.wait(1)

        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
        deadline = time.monotonic() + profile['startupTimeoutSeconds']
        while not health(url):
            if child.poll() is not None:
                raise RuntimeError('runtime_exited_during_load')
            if time.monotonic() > deadline:
                raise TimeoutError('runtime_load_timeout')
            time.sleep(.25)
        result['metrics']['modelLoadSeconds'] = time.monotonic() - load_start
        raw['coldLoadDefinition'] = 'Fresh process and context; OS filesystem cache not cleared.'
        models = json.load(urllib.request.urlopen(url + '/v1/models', timeout=3))
        if not any(m.get('id') == profile['model'] for m in models.get('data', [])):
            raise RuntimeError('runtime_model_identity_mismatch')
        inference_start = time.monotonic()
        first = None
        done = False
        payload = request['input']
        query = urllib.request.Request(url + '/v1/chat/completions', data=json.dumps(payload).encode(),
                                       headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(query, timeout=profile['inferenceTimeoutSeconds']) as response:
            byte_count = 0
            for line in response:
                if time.monotonic() - inference_start > profile['inferenceTimeoutSeconds']:
                    raise TimeoutError('inference_timeout')
                byte_count += len(line)
                if byte_count > 8 * 1024 * 1024:
                    raise RuntimeError('response_limit')
                if not line.startswith(b'data:'):
                    continue
                data = line[5:].strip()
                if data == b'[DONE]':
                    done = True
                    break
                event = json.loads(data)
                raw['events'].append(event)
                if event.get('error'):
                    raise RuntimeError('runtime_stream_error')
                for choice in event.get('choices', []):
                    delta = choice.get('delta', {})
                    content = delta.get('content') or ''
                    if content:
                        if first is None:
                            first = time.monotonic() - inference_start
                        result['output'] += content
                if event.get('usage'):
                    raw['usage'] = event['usage']
                if event.get('timings'):
                    raw['timings'] = event['timings']
        if not done:
            raise RuntimeError('incomplete_runtime_stream')
        usage = raw.get('usage', {})
        timings = raw.get('timings', {})
        result['tokens'] = {'input': usage.get('prompt_tokens'),
                            'cached': usage.get('prompt_tokens_details', {}).get('cached_tokens'),
                            'output': usage.get('completion_tokens')}
        result['metrics'].update({'elapsedSeconds': time.monotonic() - inference_start,
                                 'timeToFirstTokenSeconds': first,
                                 'promptTokPerSecond': timings.get('prompt_per_second'),
                                 'generationTokPerSecond': timings.get('predicted_per_second')})
        result['status'] = 'SUCCEEDED'
        emit_lifecycle(request, 'inference.completed', tokens=result['tokens'])
    except Exception as error:
        result['error'] = str(error) if isinstance(error, (RuntimeError, TimeoutError)) else type(error).__name__
        result['status'] = 'TIMED_OUT' if isinstance(error, TimeoutError) else 'FAILED'
    finally:
        monitor_stop.set()
        if child and child.poll() is None:
            try:
                terminate(child.pid, owned_identity)
                child.wait(timeout=5)
            except Exception:
                result['error'] = 'owned_runtime_termination_unconfirmed'
                result['status'] = 'FAILED'
        if log_path.exists():
            raw['runtimeLog'] = log_path.read_text(errors='replace')[-150000:]
        raw['afterMemory'] = memory()
        if suspended:
            env = os.environ.copy()
            env.update(original.get('environment', {}))
            existing = []
            for proc in Path('/proc').iterdir():
                try:
                    if proc.name.isdigit() and proc.stat().st_uid == os.getuid() and [x.decode() for x in (proc/'cmdline').read_bytes().split(b'\0') if x] == original['args']:
                        existing.append(int(proc.name))
                except OSError:
                    pass
            if len(existing) == 1 and health(endpoint):
                restored = True
                raw['restoredPid'] = existing[0]
            elif not existing:
                with open(root / 'original-restoration.log', 'ab', buffering=0) as log:
                    replacement = subprocess.Popen(original['args'], cwd=original['cwd'], env=env,
                                                   stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                                   start_new_session=True)
                for _ in range(120):
                    if replacement.poll() is not None:
                        break
                    if health(endpoint):
                        restored = True
                        break
                    time.sleep(1)
                raw['restoredPid'] = replacement.pid
        raw['originalServiceRestored'] = restored
        emit_lifecycle(request, 'service.restoration', restored=restored, pid=raw.get('restoredPid'))
        if not restored:
            result['status'] = 'FAILED'
            result['error'] = 'original_service_restoration_unconfirmed'
        samples = raw['samples']
        metrics = result['metrics']
        metrics['peakRamBytes'] = max((s['memory'].get('VmHWM', 0) for s in samples), default=None)
        metrics['availableRamBeforeBytes'] = raw.get('beforeMemory', {}).get('MemAvailable')
        metrics['availableRamAfterBytes'] = raw['afterMemory'].get('MemAvailable')
        if len(samples) > 1 and samples[-1]['at'] > samples[0]['at']:
            metrics['processCpuPercent'] = (samples[-1]['cpuTicks'] - samples[0]['cpuTicks']) / os.sysconf('SC_CLK_TCK') / (samples[-1]['at'] - samples[0]['at']) * 100
        for key in ['gpuUtilisationPercent', 'powerWatts', 'thermalThrottling']:
            metrics[key] = None
        result['evidenceAvailability']['physical-telemetry'] = 'RECORDED' if samples else 'UNAVAILABLE'
        result['evidenceAvailability']['tokens'] = 'RECORDED' if all(result['tokens'][k] is not None for k in ['input', 'output']) else 'UNAVAILABLE'
        result['evidenceAvailability']['cachedTokens'] = 'RECORDED' if result['tokens']['cached'] is not None else 'UNAVAILABLE'
        raw['startedAt'] = started
        raw['endedAt'] = time.time()
    raw['eventDeliveryFailed'] = request.get('_event_delivery_failed', False)
    receipt_path.write_text(json.dumps(result))
    emit_lifecycle(request, 'runtime.result_retained', restored=restored)
    return result


def dispatch(request):
    operation = request['operation']
    if operation == 'invoke':
        return run(request)
    root = Path(request['stateDirectory'])
    if operation == 'abort':
        root.mkdir(mode=0o700, parents=True, exist_ok=True)
        (root / (request['attemptId'] + '.abort')).touch()
        receipt = root / (request['attemptId'] + '.result.json')
        for _ in range(150):
            if receipt.exists():
                result = json.loads(receipt.read_text())
                return {'restored': result['rawResponse'].get('originalServiceRestored') is True,
                        'result': result}
            time.sleep(1)
        return {'restored': False, 'reason': 'target_restoration_unconfirmed'}
    if operation != 'observe':
        raise RuntimeError('runtime_operation_invalid')
    original = request.get('originalService')
    available = memory().get('MemAvailable')
    healthy = idle = None
    if original:
        args = original['args']
        endpoint = 'http://127.0.0.1:' + args[args.index('--port')+1]
        healthy = health(endpoint)
        try:
            slots = json.load(urllib.request.urlopen(endpoint+'/slots', timeout=3))
            idle = bool(slots) and all(x.get('is_processing') is False for x in slots)
        except Exception:
            idle = False
    return {'architecture': platform.machine(), 'osName': platform.system(), 'osVersion': platform.release(), 'availableRamBytes': available, 'freeStorageBytes': shutil.disk_usage(Path.home()).free,
            'serviceHealthy': healthy, 'serviceIdle': idle,
            'targetAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}

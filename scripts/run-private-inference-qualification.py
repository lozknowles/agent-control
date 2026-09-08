import json, os, pathlib, secrets, signal, subprocess, sys, time, urllib.request

settings = pathlib.Path(sys.argv[1]).resolve()
cfg = json.loads(settings.read_text())
root = pathlib.Path(cfg['stateDir'])
repo = pathlib.Path(__file__).resolve().parents[1]
env = os.environ.copy()
env['AGENT_CONTROL_QUALIFICATION_OPERATOR_TOKEN'] = secrets.token_urlsafe(32)
proxylog = open(str(root) + '-proxy.log', 'w')
serverlog = open(str(root) + '-server.log', 'w')
browserlog = open(str(root) + '-browser.log', 'w')
proxy = subprocess.Popen(['python3', str(repo / 'scripts/record-private-inference-http.py'), '--port', '19482', '--target', 'http://127.0.0.1:19483', '--output', str(root) + '-http', '--timeout', str(cfg.get('timeoutMinutes', 4)*60+15)], stdout=proxylog, stderr=proxylog)
server = browser = None

def disconnect_owned_forward(phase):
    pid = int((settings.parent / 'tunnel.pid').read_text())
    expected = (settings.parent / 'tunnel.start').read_text().strip()
    actual = pathlib.Path(f'/proc/{pid}/stat').read_text().split(') ')[1].split()[19]
    assert actual == expected, 'refuse_tunnel_identity_mismatch'
    os.kill(pid, signal.SIGTERM)
    (root / 'controlled-disconnection.json').write_text(json.dumps({'at': time.time(), 'pid': pid, 'startTicks': actual, 'phase': phase, 'action': 'SIGTERM owned private SSH forward only', 'fallbackAllowed': False}, indent=2))

try:
    for _ in range(50):
        try:
            with urllib.request.urlopen('http://127.0.0.1:19482/health', timeout=2) as response:
                assert response.status == 200
            break
        except Exception:
            time.sleep(.2)
    else:
        raise RuntimeError('private_endpoint_preflight_failed')
    server = subprocess.Popen(['node', '--import', 'tsx', 'scripts/qualify-private-inference.ts', str(settings)], cwd=repo, env=env, stdout=serverlog, stderr=serverlog)
    for _ in range(200):
        if (root / 'ready.json').exists():
            break
        if server.poll() is not None:
            raise RuntimeError('dashboard_start_failed; inspect server log')
        time.sleep(.2)
    else:
        raise RuntimeError('dashboard_start_timeout')
    if cfg.get('disconnectTunnel') and cfg.get('disconnectPhase', 'before-submit') == 'before-submit':
        disconnect_owned_forward('after healthy preflight; before dashboard submission')
        time.sleep(1)
    print('AUTHENTICATED_DASHBOARD_SUBMISSION_START', flush=True)
    browser = subprocess.Popen(['node', 'scripts/record-private-inference.mjs', str(root)], cwd=repo, env=env, stdout=browserlog, stderr=browserlog)
    if cfg.get('disconnectTunnel') and cfg.get('disconnectPhase') == 'inflight':
        http_root = pathlib.Path(str(root) + '-http')
        for _ in range(600):
            if list(http_root.glob('*-request.json')):
                break
            if browser.poll() is not None:
                raise RuntimeError('No model request before browser exit')
            time.sleep(.1)
        else:
            raise RuntimeError('No model request observed for bounded disconnection')
        time.sleep(5)
        disconnect_owned_forward('five seconds after genuine model request reached private proxy')
    print('BROWSER_EXIT', browser.wait(timeout=700), flush=True)
    print('SERVER_EXIT', server.wait(timeout=110), flush=True)
finally:
    for process in [browser, server, proxy]:
        if process is not None and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    proxylog.close()
    serverlog.close()
    browserlog.close()

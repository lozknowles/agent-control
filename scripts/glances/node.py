"""Fixed optional Glances operations. Input is supplied by the governed adapter."""
import base64
import datetime
import hashlib
import http.client
import json
import os
import pathlib
import platform
import socket
import signal
import subprocess
import sys
import time
import urllib.request

VERSION = '4.5.6'


def command(args, timeout=30, check=False):
    process = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                               start_new_session=os.name != 'nt')
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        if os.name == 'nt':
            subprocess.run(['taskkill.exe', '/PID', str(process.pid), '/T', '/F'], capture_output=True)
        else:
            os.killpg(process.pid, signal.SIGKILL)
        process.communicate()
        raise RuntimeError('command_timeout:' + pathlib.Path(args[0]).name)
    result = subprocess.CompletedProcess(args, process.returncode, stdout, stderr)
    if check and result.returncode:
        raise RuntimeError('command_failed:' + pathlib.Path(args[0]).name + ':' + result.stderr[-1200:])
    return {'code': result.returncode, 'stdout': result.stdout[-6000:], 'stderr': result.stderr[-1500:]}


def main(settings):
    operation = settings['operation']
    if operation not in ('inspect', 'install', 'central', 'start', 'stop', 'restart', 'qualify'):
        raise ValueError('operation_not_allowed')
    windows = platform.system() == 'Windows'
    android = bool(os.environ.get('TERMUX_VERSION')) or '/com.termux/' in sys.executable
    root = (pathlib.Path(os.environ['LOCALAPPDATA']) / 'AgentControl' / 'Glances') if windows else pathlib.Path.home() / '.local/share/agent-control-glances'
    python = root / 'venv' / ('Scripts/python.exe' if windows else 'bin/python')
    service = 'agent-control-glances.service'
    report = {'schema': 'agent-control.glances-operation/v1', 'operation': operation,
              'hostname': socket.gethostname(), 'platform': platform.platform(), 'python': sys.version.split()[0],
              'root': str(root), 'android': android, 'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    if operation == 'inspect':
        report['existingManagedInstall'] = root.exists()
        report['portAvailable'] = {}
        for port in (61208, 61210):
            sock = socket.socket()
            try:
                sock.bind((settings['address'], port))
                report['portAvailable'][str(port)] = True
            except OSError as error:
                report['portAvailable'][str(port)] = str(error)
            finally:
                sock.close()
        if not windows:
            report['disk'] = command(['df', '-h', str(pathlib.Path.home())])
            if not android:
                report['userManager'] = command(['systemctl', '--user', 'is-system-running'])
                report['lingering'] = command(['loginctl', 'show-user', str(os.getuid()), '-p', 'Linger'])
        if android:
            try:
                import psutil
                report['androidMetrics'] = {}
                for name, method in [('memory', psutil.virtual_memory), ('cpu', psutil.cpu_times), ('network', psutil.net_io_counters), ('diskio', psutil.disk_io_counters)]:
                    try:
                        value = method()
                        report['androidMetrics'][name] = value._asdict() if hasattr(value, '_asdict') else value
                    except Exception as error:
                        report['androidMetrics'][name] = {'error': str(error)}
            except ImportError:
                report['androidMetrics'] = 'psutil unavailable'
        print(json.dumps(report)); return
    if operation == 'install':
        if root.exists() and not (root / 'owned-by-agent-control').exists():
            raise RuntimeError('existing_unowned_directory')
        root.mkdir(parents=True, exist_ok=True)
        if not windows:
            root.chmod(0o700)
        (root / 'owned-by-agent-control').write_text('optional-glances-v1\n')
        if not python.exists():
            command([sys.executable, '-m', 'venv', str(root / 'venv')], timeout=90, check=True)
        if android:
            # Termux's maintained patch provides Android psutil support upstream lacks.
            # No interpreter upgrade, root operation, or change to existing environments.
            report['termuxDependencies'] = command(['apt-get', 'install', '-y', '--no-upgrade', 'python-psutil', 'python-cryptography'], timeout=180, check=True)
            venv_config = root / 'venv/pyvenv.cfg'
            venv_config.write_text(venv_config.read_text().replace('include-system-site-packages = false', 'include-system-site-packages = true'))
        previous_report = root / 'pip-install-report.json'
        if previous_report.exists():
            archived = root / ('pip-install-report-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.json')
            archived.write_bytes(previous_report.read_bytes())
        command([str(python), '-m', 'pip', 'install', '--disable-pip-version-check',
                 '--report', str(root / 'pip-install-report.json'), 'glances[web,gpu]==' + VERSION], timeout=420, check=True)
        (root / 'requirements-installed.txt').write_text(command([str(python), '-m', 'pip', 'freeze'], check=True)['stdout'])
        (root / 'launch.py').write_text(base64.b64decode(settings['launcher']).decode())
        (root / 'access.json').write_text(json.dumps({'allowed': settings['allowed']}))
        config = '[global]\nrefresh=3\ncheck_update=false\n[outputs]\nwebui_allowed_hosts=' + ','.join([settings['address'], settings['id']]) + '\ncors_origins=http://' + settings['address'] + ':61208\ncors_credentials=false\n[processlist]\nhide_kernel_threads=true\n'
        (root / 'glances.conf').write_text(config)
        args = [str(python), str(root / 'launch.py'), '-w', '-B', settings['address'], '-p', '61208', '-C', str(root / 'glances.conf'), '--disable-autodiscover', '--process-short-name']
        (root / 'args.json').write_text(json.dumps(args))
        if windows:
            # Task runs in the existing operator session without storing credentials.
            script = "$ErrorActionPreference='Stop'\n$a=New-ScheduledTaskAction -Execute '" + str(python).replace("'", "''") + "' -Argument '" + subprocess.list2cmdline(args[1:]).replace("'", "''") + "'\n$t=New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME\n$p=New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited\n$s=New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)\nRegister-ScheduledTask -TaskName 'AgentControl-Glances' -Action $a -Trigger $t -Principal $p -Settings $s -Force | Out-Null\nStart-ScheduledTask -TaskName 'AgentControl-Glances'\n"
            guard = "$existing=Get-ScheduledTask -TaskName 'AgentControl-Glances' -ErrorAction SilentlyContinue\nif ($existing -and @($existing.Actions | Where-Object {$_.Execute -eq '" + str(python).replace("'", "''") + "'}).Count -ne 1) { throw 'existing_unowned_task' }\n"
            script = script.replace("$a=New-ScheduledTaskAction", guard + "$a=New-ScheduledTaskAction")
            report['task'] = command(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', script], check=True)
        elif android:
            report['lifecycle'] = 'experimental: no service installed; foreground qualification only'
        else:
            units = pathlib.Path.home() / '.config/systemd/user'
            units.mkdir(parents=True, exist_ok=True)
            unit = '[Unit]\nDescription=Agent Control optional Glances collector\nAfter=network-online.target\n[Service]\nType=simple\nExecStart=' + ' '.join('"' + arg.replace('"', '\\"') + '"' for arg in args) + '\nRestart=on-failure\nRestartSec=10\nNoNewPrivileges=true\nUMask=0077\n[Install]\nWantedBy=default.target\n'
            existing = units / service
            if existing.exists() and 'Agent Control optional Glances' not in existing.read_text():
                raise RuntimeError('existing_unowned_unit')
            existing.write_text(unit)
            command(['systemctl', '--user', 'daemon-reload'], check=True)
            command(['systemctl', '--user', 'enable', '--now', service], check=True)
            command(['systemctl', '--user', 'restart', service], check=True)
            # This is a normal self-service polkit request, bounded and noninteractive.
            report['enableLinger'] = command(['loginctl', 'enable-linger'], timeout=10)
        report['version'] = command([str(python), '-m', 'glances', '-V'])
    elif operation == 'central':
        if windows or android or not (root / 'owned-by-agent-control').exists():
            raise RuntimeError('central_requires_owned_linux_install')
        config = (root / 'glances.conf').read_text()
        config += '\n[serverlist]\ncolumns=system:hr_name,cpu:total,mem:percent\n'
        for index, server in enumerate(settings['servers'], 1):
            prefix = 'server_' + str(index) + '_'
            config += prefix + 'name=' + server['address'] + '\n' + prefix + 'alias=' + server['id'] + '\n' + prefix + 'port=61208\n' + prefix + 'protocol=rest\n'
        (root / 'browser.conf').write_text(config)
        args = [str(python), str(root / 'launch.py'), '--browser', '-w', '-B', settings['address'], '-p', '61210', '-C', str(root / 'browser.conf'), '--disable-autodiscover']
        units = pathlib.Path.home() / '.config/systemd/user'
        unit = '[Unit]\nDescription=Agent Control optional Glances browser\nAfter=network-online.target\n[Service]\nType=simple\nExecStart=' + ' '.join('"' + arg + '"' for arg in args) + '\nRestart=on-failure\nRestartSec=10\nNoNewPrivileges=true\nUMask=0077\n[Install]\nWantedBy=default.target\n'
        unit_path = units / 'agent-control-glances-browser.service'
        if unit_path.exists() and 'Agent Control optional Glances browser' not in unit_path.read_text():
            raise RuntimeError('existing_unowned_unit')
        unit_path.write_text(unit)
        command(['systemctl', '--user', 'daemon-reload'], check=True)
        command(['systemctl', '--user', 'enable', '--now', 'agent-control-glances-browser.service'], check=True)
        command(['systemctl', '--user', 'restart', 'agent-control-glances-browser.service'], check=True)
        report['url'] = 'http://' + settings['address'] + ':61210/browser'
    elif operation in ('start', 'stop', 'restart'):
        if not (root / 'owned-by-agent-control').exists():
            raise RuntimeError('owned_install_required')
        if windows:
            verb = {'start': 'Start', 'stop': 'Stop', 'restart': 'Stop'}[operation]
            script = verb + "-ScheduledTask -TaskName 'AgentControl-Glances'"
            if operation == 'restart':
                script += "; Start-Sleep -Seconds 2; Start-ScheduledTask -TaskName 'AgentControl-Glances'"
            report['service'] = command(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', script], check=True)
        elif android:
            raise RuntimeError('android_service_not_qualified')
        else:
            report['service'] = command(['systemctl', '--user', operation, service], check=True)
    elif operation == 'qualify':
        for attempt in range(15):
            try:
                with urllib.request.urlopen('http://' + settings['address'] + ':61208/api/4/cpu', timeout=3) as response:
                    json.load(response)
                break
            except OSError:
                if attempt == 14:
                    raise
                time.sleep(1)
        report['installedVersions'] = (root / 'requirements-installed.txt').read_text()
        report['provenanceFiles'] = [str(item) for item in root.glob('pip-install-report*.json')]
        if not windows and not android:
            report['service'] = command(['systemctl', '--user', 'show', service, '-p', 'ActiveState', '-p', 'SubState', '-p', 'UnitFileState', '-p', 'MainPID'])
            report['lingering'] = command(['loginctl', 'show-user', str(os.getuid()), '-p', 'Linger'])
        elif windows:
            report['service'] = command(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', "Get-ScheduledTask -TaskName 'AgentControl-Glances' | Select-Object TaskName,State | ConvertTo-Json"])
        report['samples'] = []
        for _ in range(2):
            sample = {}
            for plugin in ('cpu', 'mem', 'diskio', 'network', 'fs', 'gpu', 'processcount'):
                try:
                    with urllib.request.urlopen('http://' + settings['address'] + ':61208/api/4/' + plugin, timeout=10) as response:
                        sample[plugin] = json.load(response)
                except Exception as error:
                    sample[plugin] = {'error': str(error)}
            report['samples'].append(sample)
            time.sleep(4)
        with urllib.request.urlopen('http://' + settings['address'] + ':61208/api/4/processlist', timeout=10) as response:
            processes = json.load(response)
        report['processes'] = [{key: process.get(key) for key in ('pid', 'name', 'cpu_percent', 'memory_percent')} for process in processes[:10]]
        report['accessChecks'] = {}
        for name, host, source in [('badHost', 'invalid.example', None), ('unapprovedLoopbackPeer', settings['address'], ('127.0.0.1', 0))]:
            connection = http.client.HTTPConnection(settings['address'], 61208, timeout=4, source_address=source)
            try:
                connection.request('GET', '/api/4/cpu', headers={'Host': host, 'X-Forwarded-For': settings['address']})
                report['accessChecks'][name] = connection.getresponse().status
            except OSError as error:
                report['accessChecks'][name] = str(error)
            finally:
                connection.close()
    print(json.dumps(report))


if __name__ == '__main__':
    main(PAYLOAD)

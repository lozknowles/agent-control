# Fixed Agent Control collector, supplied on stdin by the native SSH adapter.
# REQUEST is data decoded by the adapter prefix, not executable caller input.
import datetime, hashlib, os, platform, re, subprocess

identity = subprocess.check_output(['systemd-id128', 'machine-id'], text=True, timeout=2).strip()
if not re.fullmatch('[a-fA-F0-9]{32}', identity):
    raise RuntimeError('machine_identity_unavailable')
identity_hash = hashlib.sha256(('agent-control-machine/v1:' + identity.lower()).encode()).hexdigest()
del identity
cpu = os.cpu_count()
try:
    memory = os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_PHYS_PAGES')
except (ValueError, OSError):
    memory = None
missing = ([] if cpu else ['CPU_UNAVAILABLE']) + ([] if memory else ['MEMORY_UNAVAILABLE'])
print(json.dumps({
    'schema': 'agent-control.estate-remote/v1',
    'method': 'systemd-machine-identity+python-os-metadata/v1',
    'resourceAlias': REQUEST['resourceAlias'], 'nonce': REQUEST['nonce'],
    'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'),
    'status': 'PARTIAL' if missing else 'COMPLETE',
    'host': {'identitySha256': identity_hash, 'platform': platform.system().lower(), 'architecture': platform.machine()},
    'cpuCount': cpu, 'memoryBytes': memory, 'missing': missing
}, separators=(',', ':')))

import assert from 'node:assert/strict';
import test from 'node:test';
import type {ResourceConfig} from './config.js';
import {WorkerRegistry} from './job-runtime.js';
import {MAINTENANCE_APPROVAL, ManagedNodeManager, PROTECTED_WORKLOAD_OVERRIDE, parseManagedNodeProbe, projectManagedNode, type ManagedNodeObservation, type ManagedNodeRequest, type ManagedNodeTransport} from './managed-node.js';

const resource = (id = 'node-alpha'): ResourceConfig => ({
  id, name: id, platform: 'linux', transport: {type: 'ssh', host: `${id}.example`, user: 'operator'}, capabilities: ['compute.intensive'],
  managedNode: {
    enabled: true, probeIntervalSeconds: 10, offlineAfterSeconds: 30,
    approvedServices: ['disc-watch.service'],
    connectivity: [{id: 'private-overlay', label: 'Private overlay', capability: 'transport.secure-overlay', serviceUnit: 'overlay-agent.service', interfaceName: 'overlay0'}],
    workloads: [{id: 'disc-copy', capability: 'workload.dvd-rip', protected: true, systemdUnit: 'disc-watch.service', processExecutables: ['disc-copy'], opticalAccess: true}],
  },
});

const observation = (active = false, at = '2026-08-26T08:00:00.000Z'): ManagedNodeObservation => ({
  observedAt: at, hostname: 'arbitrary-linux-host', os: {id: 'ubuntu', name: 'Ubuntu 24.04 LTS', version: '24.04', kernel: '6.8-test', architecture: 'x86_64'}, cpu: {model: 'Example CPU', logical: 8}, memory: {totalBytes: 8_000_000_000, availableBytes: 6_000_000_000}, uptimeSeconds: 86400, load: {one: .2, five: .3, fifteen: .4},
  storage: [{source: '/dev/vda1', mount: '/', totalBytes: 100_000, availableBytes: 60_000, usedPercent: 40}], optical: [{name: 'optical0', model: 'Example drive', transport: 'sata', holders: active ? [77] : []}], network: ['eth0 UP 192.0.2.2/24', 'overlay0 UNKNOWN 198.51.100.10/32'], temperatures: [{name: 'cpu', celsius: 52}], services: ['disc-watch.service', 'ssh.service', 'overlay-agent.service'], tools: ['sh', 'apt-get', 'dpkg', 'systemctl', 'journalctl', 'git', 'makemkvcon'], processes: active ? [{pid: 77, names: ['bash', 'disc-copy'], unit: 'disc-watch.service'}] : [{pid: 10, names: ['sleep'], unit: 'disc-watch.service'}],
});

class FakeTransport implements ManagedNodeTransport {
  fail = false; active = false; probeStates: boolean[] = []; probeCalls = 0; calls: ManagedNodeRequest[] = [];
  async probe(_resource: ResourceConfig, at: string) { this.probeCalls += 1; if (this.fail) throw new Error('transport_unreachable'); return observation(this.probeStates.shift() ?? this.active, at); }
  async execute(_resource: ResourceConfig, request: ManagedNodeRequest) { this.calls.push(request); return {exitCode: 0, stdout: 'qualified\n', stderr: ''}; }
}

function encoded(entries: Array<[string, string]>) { return entries.map(([key, value]) => `${key}\t${Buffer.from(value).toString('base64')}`).join('\n'); }

test('fixed probe records parse without trusting host-provided framing', () => {
  const output = encoded([
    ['protocol', 'agent-control.managed-node-probe/v1'], ['hostname', 'node-with-any-name'], ['cpu_logical', '4'], ['memory_total_bytes', '1000'], ['memory_available_bytes', '800'], ['uptime_seconds', '42'], ['load_1', '.1'], ['load_5', '.2'], ['load_15', '.3'], ['storage', '/dev/vda1\t1000\t800\t20%\t/'], ['optical', 'drive7\tGeneric DVD\tusb'], ['optical_holder', 'drive7\t99'], ['network', 'overlay0 UNKNOWN 198.51.100.10/32'], ['service', 'example.service'], ['tool', 'sh'], ['process', '99\tbash\tbash\tdisc-copy\texample.service'], ['probe_complete', 'true'],
  ]);
  const parsed = parseManagedNodeProbe(output, '2026-08-26T08:00:00.000Z');
  assert.equal(parsed.hostname, 'node-with-any-name'); assert.equal(parsed.storage[0].availableBytes, 800); assert.deepEqual(parsed.optical[0].holders, [99]); assert.deepEqual(parsed.processes[0].names, ['bash', 'disc-copy']);
  assert.throws(() => parseManagedNodeProbe('protocol\tnot-base64***', new Date().toISOString()), /record_invalid/);
});

test('arbitrarily named Linux resources use the same discovered capability and state logic', () => {
  for (const id of ['node-alpha', 'node-zeta']) {
    const snapshot = projectManagedNode(resource(id), observation(false));
    assert.equal(snapshot.resourceId, id); assert.equal(snapshot.state, 'IDLE'); assert.equal(snapshot.hostname, 'arbitrary-linux-host');
    for (const capability of ['platform.linux', 'transport.ssh', 'transport.secure-overlay', 'tool.shell', 'tool.package.manage', 'tool.service.manage', 'storage.inspect', 'device.optical', 'workload.dvd-rip']) assert.ok(snapshot.capabilities.includes(capability), capability);
    assert.deepEqual(snapshot.connectivity[0], {id: 'private-overlay', label: 'Private overlay', capability: 'transport.secure-overlay', state: 'RUNNING', interfaceName: 'overlay0', addresses: ['198.51.100.10/32'], evidence: ['interface:overlay0:present', 'service:overlay-agent.service:active']});
    assert.equal(snapshot.workloads[0].state, 'IDLE'); assert.equal(snapshot.maintenance.state, 'APPROVAL_REQUIRED');
  }
});

test('configured connectivity and workload availability are discovered instead of assumed', () => {
  const configured = resource();
  const missing = observation(false);
  missing.network = missing.network.filter(row => !row.startsWith('overlay0 '));
  missing.services = missing.services.filter(unit => !['overlay-agent.service', 'disc-watch.service'].includes(unit));
  missing.tools = missing.tools.filter(tool => tool !== 'makemkvcon');
  const snapshot = projectManagedNode(configured, missing);
  assert.equal(snapshot.state, 'DEGRADED');
  assert.equal(snapshot.connectivity[0].state, 'UNAVAILABLE');
  assert.equal(snapshot.capabilities.includes('transport.secure-overlay'), false);
  assert.equal(snapshot.capabilities.includes('workload.dvd-rip'), false);
});

test('healthy reachability without a discovered workload projects ONLINE', () => {
  const configured = resource();
  configured.managedNode!.workloads = [];
  configured.managedNode!.connectivity = [];
  const value = observation(false);
  value.optical = [];
  value.tools = value.tools.filter(tool => tool !== 'makemkvcon');
  const snapshot = projectManagedNode(configured, value);
  assert.equal(snapshot.state, 'ONLINE');
  assert.equal(snapshot.health, 'healthy');
});

test('active optical workload marks node BUSY and fences disruptive scheduler capabilities', async () => {
  const workers = new WorkerRegistry(), transport = new FakeTransport(); transport.active = true;
  const manager = new ManagedNodeManager([resource()], workers, transport, () => new Date('2026-08-26T08:00:00.000Z'));
  const snapshot = await manager.poll('node-alpha');
  assert.equal(snapshot.state, 'BUSY'); assert.equal(snapshot.currentWorkload, 'disc-copy'); assert.equal(snapshot.maintenance.state, 'BLOCKED_PROTECTED_WORKLOAD');
  assert.match(workers.resolve(['compute.intensive']).rationale.rejected[0].reasons.join(','), /workload_blocked:compute\.intensive/);
  assert.equal(workers.resolve(['managed-node.inspect']).worker?.id, 'node-alpha');
});

test('managed-node observations preserve active scheduler claims', async () => {
  const workers = new WorkerRegistry(), transport = new FakeTransport();
  const configured = resource(); configured.metadata = {capacity: 1};
  const manager = new ManagedNodeManager([configured], workers, transport, () => new Date('2026-08-26T08:00:00.000Z'));
  await manager.poll('node-alpha');
  workers.claim('node-alpha');
  await manager.poll('node-alpha');
  assert.equal(workers.list()[0].active, 1);
  assert.match(workers.resolve(['compute.intensive']).rationale.rejected[0].reasons.join(','), /capacity_exhausted/);
});

test('managed-node monitor contains and reports a throwing observer callback', async () => {
  const workers = new WorkerRegistry(), transport = new FakeTransport(), manager = new ManagedNodeManager([resource()], workers, transport, () => new Date('2026-08-26T08:00:00.000Z'));
  let resolveFailure!: (value: string) => void; const failure = new Promise<string>(resolve => { resolveFailure = resolve; });
  const stop = manager.start(() => { throw new Error('observer_fixture_failure'); }, error => resolveFailure(error.message));
  try { assert.equal(await failure, 'observer_fixture_failure'); } finally { stop(); }
});

test('heartbeat failure degrades, expires offline, and recovers from a later successful probe', async () => {
  let now = new Date('2026-08-26T08:00:00.000Z'); const workers = new WorkerRegistry(), transport = new FakeTransport(), manager = new ManagedNodeManager([resource()], workers, transport, () => now);
  assert.equal((await manager.poll('node-alpha')).state, 'IDLE');
  now = new Date('2026-08-26T08:00:10.000Z'); transport.fail = true; assert.equal((await manager.poll('node-alpha')).state, 'DEGRADED');
  await assert.rejects(manager.execute('node-alpha', {operation: 'package.update'}, [MAINTENANCE_APPROVAL]), /maintenance_unavailable_while_degraded/);
  now = new Date('2026-08-26T08:00:31.000Z'); assert.equal(manager.get('node-alpha')?.state, 'OFFLINE'); assert.equal(workers.list()[0].health, 'offline');
  transport.fail = false; assert.equal((await manager.poll('node-alpha')).state, 'IDLE'); assert.equal(workers.list()[0].health, 'healthy');
});

test('typed maintenance requires approval and an additional protected-workload override while busy', async () => {
  const workers = new WorkerRegistry(), transport = new FakeTransport(); transport.active = true;
  const manager = new ManagedNodeManager([resource()], workers, transport, () => new Date('2026-08-26T08:00:00.000Z')); await manager.poll('node-alpha');
  await assert.rejects(manager.execute('node-alpha', {operation: 'package.update'}, []), /maintenance_approval_required/);
  await assert.rejects(manager.execute('node-alpha', {operation: 'package.update'}, [MAINTENANCE_APPROVAL]), /protected_workload_active/);
  const result = await manager.execute('node-alpha', {operation: 'package.update'}, [PROTECTED_WORKLOAD_OVERRIDE]); assert.equal(result.exitCode, 0); assert.deepEqual(transport.calls[0], {operation: 'package.update'});
});

test('package and approved-service inspection use typed parameters and reject an SSH escape payload', async () => {
  const workers = new WorkerRegistry(), transport = new FakeTransport(), manager = new ManagedNodeManager([resource()], workers, transport, () => new Date('2026-08-26T08:00:00.000Z')); await manager.poll('node-alpha');
  await manager.execute('node-alpha', {operation: 'package.query', target: 'openssh-server'}, []);
  await manager.execute('node-alpha', {operation: 'service.status', target: 'disc-watch.service'}, []);
  await assert.rejects(manager.execute('node-alpha', {operation: 'service.status', target: 'ssh.service;reboot'}, []), /service_invalid/);
  await assert.rejects(manager.execute('node-alpha', {operation: 'service.restart', target: 'ssh.service'}, [PROTECTED_WORKLOAD_OVERRIDE]), /service_not_approved/);
  assert.deepEqual(transport.calls.map(item => item.operation), ['package.query', 'service.status']);
});

test('maintenance revalidates immediately before execution and proceeds when protected state stays idle', async () => {
  const workers = new WorkerRegistry(), transport = new FakeTransport(), manager = new ManagedNodeManager([resource()], workers, transport, () => new Date('2026-08-26T08:00:00.000Z'));
  await manager.poll('node-alpha');
  const result = await manager.execute('node-alpha', {operation: 'package.update'}, [MAINTENANCE_APPROVAL]);
  assert.equal(result.exitCode, 0); assert.equal(transport.probeCalls, 2); assert.equal(transport.calls.length, 1);
});

test('new protected workload at final revalidation aborts maintenance even with override', async () => {
  const workers = new WorkerRegistry(), transport = new FakeTransport(); transport.probeStates = [false, true];
  const manager = new ManagedNodeManager([resource()], workers, transport, () => new Date('2026-08-26T08:00:00.000Z'));
  await manager.poll('node-alpha');
  await assert.rejects(manager.execute('node-alpha', {operation: 'system.reboot'}, [PROTECTED_WORKLOAD_OVERRIDE]), /managed_node_protected_workload_changed:operation=system\.reboot:initial=IDLE:final=BUSY:new=disc-copy/);
  assert.equal(transport.probeCalls, 2); assert.equal(transport.calls.length, 0);
});

test('read-only operations do not add a final revalidation probe', async () => {
  const workers = new WorkerRegistry(), transport = new FakeTransport(), manager = new ManagedNodeManager([resource()], workers, transport, () => new Date('2026-08-26T08:00:00.000Z'));
  await manager.poll('node-alpha');
  await manager.execute('node-alpha', {operation: 'system.identity'}, []);
  assert.equal(transport.probeCalls, 1); assert.equal(transport.calls.length, 1);
});

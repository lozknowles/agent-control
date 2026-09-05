import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import type {ResourceConfig} from './config.js';
import {ActionFailure, ActionRegistry, WorkerRegistry, createJobRuntime} from './job-runtime.js';
import {JobCatalog} from './job-catalog.js';
import {executeSsh, sshResourceArgs, type SshExecutor} from './managed-node-ssh.js';

export interface GlancesNode {id: string; address: string; platform: 'linux' | 'windows' | 'android'; transport: ResourceConfig['transport']; python: string; allowed: string[]; servers?: Array<{id: string; address: string}>;}
const operations = ['inspect', 'install', 'central', 'start', 'stop', 'restart', 'qualify'];
export function validateNode(node: GlancesNode) {
  if (!/^[a-z][a-z0-9-]{0,50}$/.test(node.id)) throw new Error('invalid_node_id');
  const ip = (value: string) => /^100\.(\d+)\.(\d+)\.(\d+)$/.test(value) && Number(value.split('.')[1]) >= 64 && Number(value.split('.')[1]) <= 127 && value.split('.').every(v => Number(v) <= 255);
  if (!ip(node.address) || !node.allowed.length || node.allowed.some(value => !ip(value))) throw new Error('tailnet_addresses_required');
  if (!['linux', 'windows', 'android'].includes(node.platform) || !['ssh', 'local'].includes(node.transport.type)) throw new Error('unsupported_transport');
  if (node.transport.type === 'ssh' && !node.transport.host) throw new Error('ssh_host_required');
  for (const value of [node.transport.host, node.transport.user].filter(Boolean) as string[]) if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) throw new Error('invalid_transport');
  if (node.transport.port && (!Number.isInteger(node.transport.port) || node.transport.port < 1 || node.transport.port > 65535)) throw new Error('invalid_port');
  if (!/^[a-zA-Z0-9_/:.\\-]+$/.test(node.python)) throw new Error('invalid_python_path');
  if (node.servers?.some(server => !/^[a-z][a-z0-9-]{0,50}$/.test(server.id) || !ip(server.address))) throw new Error('invalid_server_list');
  return node;
}

export function buildGlancesRuntime(nodes: GlancesNode[], stateRoot: string, executor: SshExecutor = executeSsh) {
  nodes.forEach(validateNode);
  const scriptDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/glances');
  const source = fs.readFileSync(path.join(scriptDir, 'node.py'), 'utf8');
  const launcher = fs.readFileSync(path.join(scriptDir, 'launch.py')).toString('base64');
  const actions = new ActionRegistry();
  const workers = new WorkerRegistry();
  const catalog = new JobCatalog(actions.ids());
  for (const node of nodes) {
    const capability = `monitoring.glances.${node.id}`;
    workers.register({id: node.id, capabilities: [capability], health: 'healthy', capacity: 1, active: 0, observedAt: new Date().toISOString()});
    const action = `monitoring.glances.${node.id}@1.0.0`;
    actions.registerControl(action, async context => {
      const operation = String(context.parameters.operation);
      if (!operations.includes(operation)) throw new ActionFailure('operation_not_allowed', 'configuration');
      if (!['inspect', 'qualify'].includes(operation) && !context.run.approvals.includes('monitoring.glances.change')) throw new ActionFailure('approval_required', 'policy_rejection');
      const payload = Buffer.from(JSON.stringify({...node, transport: undefined, operation, launcher})).toString('base64');
      const input = `import json,base64\nPAYLOAD=json.loads(base64.b64decode('${payload}'))\n${source}`;
      const resource: ResourceConfig = {...node, capabilities: [capability]};
      const remote = node.platform === 'windows' ? [node.python, '-'] : [node.python, '-'];
      const result = await executor(node.transport.type === 'local' ? node.python : 'ssh', node.transport.type === 'local' ? ['-'] : sshResourceArgs(resource, remote), input,
        {timeoutMs: 600_000, maxBytes: 1024 * 1024, signal: context.signal});
      if (result.status !== 0 || result.timedOut || result.aborted) throw new ActionFailure(`glances_remote_failed:${result.status}:${result.timedOut ? 'timeout' : result.aborted ? 'cancelled' : result.stderr.slice(-1600)}`, 'execution');
      let report: Record<string, unknown>;
      try { report = JSON.parse(result.stdout.trim()); } catch { throw new ActionFailure('invalid_glances_report', 'verification'); }
      if (report.schema !== 'agent-control.glances-operation/v1' || report.operation !== operation) throw new ActionFailure('unexpected_glances_report', 'verification');
      if (operation === 'qualify') {
        const samples = report.samples as Array<Record<string, any>> | undefined;
        if (!samples || samples.length !== 2 || samples.some(sample => typeof sample.cpu?.total !== 'number' || typeof sample.mem?.percent !== 'number')) throw new ActionFailure('glances_live_metrics_missing', 'verification');
      }
      return {artifacts: [{name: 'report', value: {...report, scriptSha256: createHash('sha256').update(source).digest('hex')}}], evidence: [`Glances ${operation} executed through the Agent Control SSH adapter on ${node.id}`], verification: ['glances-operation-report'], detail: `${operation} completed on ${node.id}`};
    });
    // Refresh known Actions after registration; each optional Job is scoped to one reviewed node.
    catalog.knownActions?.add(action);
    for (const change of [false, true]) catalog.addJob({apiVersion: 'agent-control/v1', kind: 'Job', metadata: {id: `glances-${node.id}-${change ? 'change' : 'inspect'}`, name: `Glances ${node.id}`, version: '1.0.0'}, spec: {priority: 'normal', concurrency: 'no-overlap', parameters: {operation: {type: 'string', required: true, enum: change ? operations.filter(v => !['inspect', 'qualify'].includes(v)) : ['inspect', 'qualify']}}, steps: [{id: 'execute', action, requires: [capability], resources: [`monitoring-glances-${node.id}`], ...(change ? {approval: 'monitoring.glances.change'} : {}), timeoutSeconds: 620, outputs: [{name: 'report', type: 'application/json', schema: 'agent-control.glances-operation/v1', version: '1.0.0', retention: 'run-history'}], verification: ['glances-operation-report']}]}});
  }
  return createJobRuntime(stateRoot, catalog, actions, workers);
}

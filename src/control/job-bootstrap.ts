import path from 'node:path';
import type {AgentControlConfig} from './config.js';
import {JobCatalog} from './job-catalog.js';
import {createJobRuntime, WorkerRegistry} from './job-runtime.js';
import {registerReferenceActions} from './reference-actions.js';
import {ManagedNodeManager, type ManagedNodeSnapshot} from './managed-node.js';
import {registerManagedNodeActions} from './managed-node-actions.js';
import {SshManagedNodeTransport} from './managed-node-ssh.js';
import {configuredHarnessProfileRouter, configuredHarnessProfiles, ContextPacketBuilder, FileHarnessEfficiencyLedger} from './harness-efficiency.js';

export function buildJobRuntime(config: AgentControlConfig, stateRoot = process.env.AGENT_CONTROL_STATE_DIR || path.resolve('.agent-control'), manifestDir = process.env.AGENT_CONTROL_JOB_DIR || path.resolve('config/jobs')) {
  const workers = WorkerRegistry.fromConfig(config.resources), managedNodes = new ManagedNodeManager(config.resources, workers, new SshManagedNodeTransport()), actions = registerManagedNodeActions(managedNodes, registerReferenceActions()), catalog = new JobCatalog(actions.ids()).loadDirectory(manifestDir);
  const harnessProfiles = configuredHarnessProfiles(config.harnessEfficiency), harnessProfileRouter = configuredHarnessProfileRouter(config.harnessEfficiency), contextPacketBuilder = new ContextPacketBuilder(harnessProfiles);
  const harnessEfficiency = new FileHarnessEfficiencyLedger(path.join(stateRoot, 'harness-efficiency', 'model-invocations.json'));
  for (const resource of config.resources) if (resource.transport.type === 'local') workers.setHealth(resource.id, 'healthy');
  return Object.assign(createJobRuntime(stateRoot, catalog, actions, workers, {efficiency: harnessEfficiency}), {managedNodes, harnessEfficiency, harnessProfiles, harnessProfileRouter, contextPacketBuilder});
}

export function startManagedNodeMonitoring(runtime: ReturnType<typeof buildJobRuntime>, onChange?: (snapshot: ManagedNodeSnapshot) => void) { return runtime.managedNodes.start(onChange); }

export function startJobScheduler(runtime: ReturnType<typeof buildJobRuntime>, onChange?: (runId: string, status: string) => void, intervalMs = 1000) {
  let busy = false;
  const tick = async () => { if (busy) return; busy = true; try { const created = await runtime.tickSchedules(); for (const run of created) onChange?.(run.id, run.status); const changed = await runtime.tick(); if (changed) onChange?.(changed.id, changed.status); } finally { busy = false; } };
  const timer = setInterval(() => void tick(), intervalMs); timer.unref(); void tick(); return () => clearInterval(timer);
}

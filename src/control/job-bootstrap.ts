import path from 'node:path';
import type {AgentControlConfig} from './config.js';
import {JobCatalog} from './job-catalog.js';
import {createJobRuntime, WorkerRegistry} from './job-runtime.js';
import {registerReferenceActions} from './reference-actions.js';
import {ManagedNodeManager, type ManagedNodeSnapshot} from './managed-node.js';
import {registerManagedNodeActions} from './managed-node-actions.js';
import {SshManagedNodeTransport} from './managed-node-ssh.js';
import {configuredHarnessProfileRouter, configuredHarnessProfiles, ContextPacketBuilder, FileHarnessEfficiencyLedger} from './harness-efficiency.js';

/** Shared production definition path so qualification cannot drift from registered typed Actions. */
export function buildJobRuntimeDefinition(config: AgentControlConfig, manifestDir = process.env.AGENT_CONTROL_JOB_DIR || path.resolve('config/jobs')) {
  const workers = WorkerRegistry.fromConfig(config.resources), managedNodes = new ManagedNodeManager(config.resources, workers, new SshManagedNodeTransport()), actions = registerManagedNodeActions(managedNodes, registerReferenceActions()), catalog = new JobCatalog(actions.ids()).loadDirectory(manifestDir);
  return {workers, managedNodes, actions, catalog};
}

export function buildJobRuntime(config: AgentControlConfig, stateRoot = process.env.AGENT_CONTROL_STATE_DIR || path.resolve('.agent-control'), manifestDir = process.env.AGENT_CONTROL_JOB_DIR || path.resolve('config/jobs')) {
  const {workers, managedNodes, actions, catalog} = buildJobRuntimeDefinition(config, manifestDir);
  const harnessProfiles = configuredHarnessProfiles(config.harnessEfficiency), harnessProfileRouter = configuredHarnessProfileRouter(config.harnessEfficiency), contextPacketBuilder = new ContextPacketBuilder(harnessProfiles);
  const harnessEfficiency = new FileHarnessEfficiencyLedger(path.join(stateRoot, 'harness-efficiency', 'model-invocations.json'));
  for (const resource of config.resources) if (resource.transport.type === 'local') workers.setHealth(resource.id, 'healthy');
  return Object.assign(createJobRuntime(stateRoot, catalog, actions, workers, {efficiency: harnessEfficiency}), {managedNodes, harnessEfficiency, harnessProfiles, harnessProfileRouter, contextPacketBuilder});
}

export function startManagedNodeMonitoring(runtime: ReturnType<typeof buildJobRuntime>, onChange?: (snapshot: ManagedNodeSnapshot) => void, onError?: (error: Error) => void) { return runtime.managedNodes.start(onChange, onError); }

export async function runJobSchedulerTick(runtime: Pick<ReturnType<typeof buildJobRuntime>, 'tickSchedules' | 'tick'>, onChange?: (runId: string, status: string) => void, onError?: (error: Error) => void) {
  try { const created = await runtime.tickSchedules(); for (const run of created) onChange?.(run.id, run.status); const changed = await runtime.tick(); if (changed) onChange?.(changed.id, changed.status); }
  catch (error) { const failure = error instanceof Error ? error : new Error(String(error)); if (onError) onError(failure); else throw failure; }
}

export function startJobScheduler(runtime: ReturnType<typeof buildJobRuntime>, onChange?: (runId: string, status: string) => void, intervalMs = 1000, onError?: (error: Error) => void) {
  let busy = false;
  const report = onError ?? (error => process.emitWarning(`job scheduler failure: ${error.message}`));
  const tick = async () => { if (busy) return; busy = true; try { await runJobSchedulerTick(runtime, onChange, report); } finally { busy = false; } };
  const timer = setInterval(() => void tick(), intervalMs); timer.unref(); void tick(); return () => clearInterval(timer);
}

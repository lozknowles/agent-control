import path from 'node:path';
import type {AgentControlConfig} from './config.js';
import {JobCatalog} from './job-catalog.js';
import {createJobRuntime, WorkerRegistry} from './job-runtime.js';
import {registerReferenceActions} from './reference-actions.js';
import {ManagedNodeManager, type ManagedNodeSnapshot} from './managed-node.js';
import {registerManagedNodeActions} from './managed-node-actions.js';
import {SshManagedNodeTransport} from './managed-node-ssh.js';
import {AndroidNodeManager, type AndroidNodeSnapshot} from './android-node.js';
import {registerAndroidNodeActions} from './android-node-actions.js';
import {createSecureOverlayDiscovery} from '../integrations/secure-overlay.js';

export function buildJobRuntime(config: AgentControlConfig, stateRoot = process.env.AGENT_CONTROL_STATE_DIR || path.resolve('.agent-control'), manifestDir = process.env.AGENT_CONTROL_JOB_DIR || path.resolve('config/jobs')) {
  const workers = WorkerRegistry.fromConfig(config.resources), managedNodes = new ManagedNodeManager(config.resources, workers, new SshManagedNodeTransport());
  const androidNodes = new AndroidNodeManager(config.androidDiscovery, workers, config.androidDiscovery ? createSecureOverlayDiscovery(config.androidDiscovery) : undefined);
  const actions = registerAndroidNodeActions(androidNodes, registerManagedNodeActions(managedNodes, registerReferenceActions())), catalog = new JobCatalog(actions.ids()).loadDirectory(manifestDir);
  for (const resource of config.resources) if (resource.transport.type === 'local') workers.setHealth(resource.id, 'healthy');
  return Object.assign(createJobRuntime(stateRoot, catalog, actions, workers), {managedNodes, androidNodes});
}

export function startManagedNodeMonitoring(runtime: ReturnType<typeof buildJobRuntime>, onChange?: (snapshot: ManagedNodeSnapshot) => void) { return runtime.managedNodes.start(onChange); }
export function startAndroidNodeMonitoring(runtime: ReturnType<typeof buildJobRuntime>, onChange?: (snapshot: AndroidNodeSnapshot) => void) { return runtime.androidNodes.start(onChange); }

export function startJobScheduler(runtime: ReturnType<typeof buildJobRuntime>, onChange?: (runId: string, status: string) => void, intervalMs = 1000) {
  let busy = false;
  const tick = async () => { if (busy) return; busy = true; try { const created = await runtime.tickSchedules(); for (const run of created) onChange?.(run.id, run.status); const changed = await runtime.tick(); if (changed) onChange?.(changed.id, changed.status); } finally { busy = false; } };
  const timer = setInterval(() => void tick(), intervalMs); timer.unref(); void tick(); return () => clearInterval(timer);
}

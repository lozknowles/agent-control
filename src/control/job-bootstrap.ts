import path from 'node:path';
import type {AgentControlConfig} from './config.js';
import {JobCatalog} from './job-catalog.js';
import {createJobRuntime, WorkerRegistry} from './job-runtime.js';
import {registerReferenceActions} from './reference-actions.js';

export function buildJobRuntime(config: AgentControlConfig, stateRoot = process.env.AGENT_CONTROL_STATE_DIR || path.resolve('.agent-control'), manifestDir = process.env.AGENT_CONTROL_JOB_DIR || path.resolve('config/jobs')) {
  const actions = registerReferenceActions(), catalog = new JobCatalog(actions.ids()).loadDirectory(manifestDir), workers = WorkerRegistry.fromConfig(config.resources);
  for (const resource of config.resources) if (resource.transport.type === 'local') workers.setHealth(resource.id, 'healthy');
  return createJobRuntime(stateRoot, catalog, actions, workers);
}

export function startJobScheduler(runtime: ReturnType<typeof buildJobRuntime>, onChange?: (runId: string, status: string) => void, intervalMs = 1000) {
  let busy = false;
  const tick = async () => { if (busy) return; busy = true; try { const created = await runtime.tickSchedules(); for (const run of created) onChange?.(run.id, run.status); const changed = await runtime.tick(); if (changed) onChange?.(changed.id, changed.status); } finally { busy = false; } };
  const timer = setInterval(() => void tick(), intervalMs); timer.unref(); void tick(); return () => clearInterval(timer);
}

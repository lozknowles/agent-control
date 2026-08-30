import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {AgentControlConfig} from './config.js';
import {JobCatalog} from './job-catalog.js';
import {createJobRuntime, WorkerRegistry} from './job-runtime.js';
import {registerReferenceActions} from './reference-actions.js';
import {ManagedNodeManager, type ManagedNodeSnapshot} from './managed-node.js';
import {registerManagedNodeActions} from './managed-node-actions.js';
import {SshManagedNodeTransport} from './managed-node-ssh.js';
import {configuredHarnessProfileRouter, configuredHarnessProfiles, ContextPacketBuilder, FileHarnessEfficiencyLedger} from './harness-efficiency.js';
import {registerFreeTokenQualificationActions} from './freetoken-actions.js';
import {CatalogNaturalLanguagePlanner, WorkParcelCoordinator, WorkParcelStore, type WorkParcelPlanner} from './work-parcels.js';
import {registerOperatorReviewActions} from './operator-review-actions.js';
import {registerBrowserActions} from './browser-actions.js';

/** Shared production definition path so qualification cannot drift from registered typed Actions. */
export function buildJobRuntimeDefinition(config: AgentControlConfig, manifestDir = process.env.AGENT_CONTROL_JOB_DIR || path.resolve('config/jobs')) {
  const parcelJobs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../config/work-parcels/jobs');
  const operatorJobs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../config/operator-jobs');
  const workers = WorkerRegistry.fromConfig(config.resources), managedNodes = new ManagedNodeManager(config.resources, workers, new SshManagedNodeTransport()), actions = registerOperatorReviewActions(config, registerFreeTokenQualificationActions(registerManagedNodeActions(managedNodes, registerBrowserActions(registerReferenceActions())))), catalog = new JobCatalog(actions.ids()).loadDirectory(manifestDir).loadDirectory(parcelJobs);
  if (process.env.AGENT_CONTROL_ENABLE_OPERATOR_REVIEW === 'true') catalog.loadDirectory(operatorJobs);
  return {workers, managedNodes, actions, catalog};
}

export function buildJobRuntime(config: AgentControlConfig, stateRoot = process.env.AGENT_CONTROL_STATE_DIR || path.resolve('.agent-control'), manifestDir = process.env.AGENT_CONTROL_JOB_DIR || path.resolve('config/jobs'), reasoningPlanner?: WorkParcelPlanner) {
  const {workers, managedNodes, actions, catalog} = buildJobRuntimeDefinition(config, manifestDir);
  const harnessProfiles = configuredHarnessProfiles(config.harnessEfficiency), harnessProfileRouter = configuredHarnessProfileRouter(config.harnessEfficiency), contextPacketBuilder = new ContextPacketBuilder(harnessProfiles);
  const harnessEfficiency = new FileHarnessEfficiencyLedger(path.join(stateRoot, 'harness-efficiency', 'model-invocations.json'));
  for (const resource of config.resources) if (resource.transport.type === 'local') workers.setHealth(resource.id, 'healthy');
  const runtime = createJobRuntime(stateRoot, catalog, actions, workers, {efficiency: harnessEfficiency});
  const workParcels = new WorkParcelCoordinator(runtime, new WorkParcelStore(path.join(stateRoot, 'work-parcels', 'parcels.json')), new CatalogNaturalLanguagePlanner(runtime, reasoningPlanner), harnessEfficiency);
  return Object.assign(runtime, {managedNodes, harnessEfficiency, harnessProfiles, harnessProfileRouter, contextPacketBuilder, workParcels});
}

export function startManagedNodeMonitoring(runtime: ReturnType<typeof buildJobRuntime>, onChange?: (snapshot: ManagedNodeSnapshot) => void, onError?: (error: Error) => void) { return runtime.managedNodes.start(onChange, onError); }

export async function runJobSchedulerTick(runtime: Pick<ReturnType<typeof buildJobRuntime>, 'tickSchedules' | 'tick'>, onChange?: (runId: string, status: string) => void, onError?: (error: Error) => void) {
  try { const created = await runtime.tickSchedules(); for (const run of created) onChange?.(run.id, run.status); const changed = await runtime.tick(); if (changed) onChange?.(changed.id, changed.status); }
  catch (error) { const failure = error instanceof Error ? error : new Error(String(error)); if (onError) onError(failure); else throw failure; }
}

export async function runWorkParcelTick(runtime: Pick<ReturnType<typeof buildJobRuntime>, 'workParcels'>, onChange?: (parcelId: string, status: string) => void, onError?: (error: Error) => void) { try { const changed = await runtime.workParcels.tick(); if (changed) onChange?.(changed.id, changed.status); } catch (error) { const failure = error instanceof Error ? error : new Error(String(error)); if (onError) onError(failure); else throw failure; } }

export function startJobScheduler(runtime: ReturnType<typeof buildJobRuntime>, onChange?: (runId: string, status: string) => void, intervalMs = 1000, onError?: (error: Error) => void) {
  let scheduling = false, stopped = false;
  const inFlight = new Set<Promise<unknown>>();
  const report = onError ?? (error => process.emitWarning(`job scheduler failure: ${error.message}`));
  const schedule = async () => {
    if (scheduling || stopped) return;
    scheduling = true;
    try {
      const created = await runtime.tickSchedules(); for (const run of created) onChange?.(run.id, run.status);
      await runWorkParcelTick(runtime, onChange, report);
      while (!stopped && inFlight.size < runtime.schedulerConcurrencyLimit()) {
        const dispatched = runtime.dispatch(); if (!dispatched) break;
        const completion = dispatched.completion.then(changed => { if (changed) onChange?.(changed.id, changed.status); }).catch(error => report(error instanceof Error ? error : new Error(String(error)))).finally(() => { inFlight.delete(completion); queueMicrotask(() => void schedule()); });
        inFlight.add(completion);
      }
    } catch (error) { report(error instanceof Error ? error : new Error(String(error))); }
    finally { scheduling = false; }
  };
  const timer = setInterval(() => void schedule(), intervalMs); timer.unref(); void schedule(); return () => { stopped = true; clearInterval(timer); };
}

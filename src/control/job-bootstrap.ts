import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {AgentControlConfig} from './config.js';
import {JobCatalog} from './job-catalog.js';
import {createJobRuntime, WorkerRegistry} from './job-runtime.js';
import {registerReferenceActions} from './reference-actions.js';
import {ManagedNodeManager, type ManagedNodeSnapshot} from './managed-node.js';
import {registerManagedNodeActions} from './managed-node-actions.js';
import {SshManagedNodeTransport} from './managed-node-ssh.js';
import {configuredHarnessProfileRouter, configuredHarnessProfiles, ContextPacketBuilder, FileHarnessEfficiencyLedger, InMemoryContextGraph, type HarnessEfficiencyLedgerPort} from './harness-efficiency.js';
import {registerFreeTokenQualificationActions} from './freetoken-actions.js';
import {CatalogNaturalLanguagePlanner, WorkParcelCoordinator, WorkParcelStore, type WorkParcelPlanner} from './work-parcels.js';
import {registerOperatorReviewActions} from './operator-review-actions.js';
import {registerBrowserActions} from './browser-actions.js';
import type {ModelRegistry} from './model-registry.js';
import {ParameterizedJobRegistry} from './parameterized-job-registry.js';
import {repositoryCodeReviewDefinition} from './repository-review-definition.js';
import {createParameterizedJobEngine} from './parameterized-job-engine.js';
import {DirectRepositoryReviewExecutor} from './direct-repository-review-executor.js';
import type {TokenAwareBatonRuntime} from './token-aware-baton-routing.js';
import type {ContractExecutionRuntime} from './contract-runtime.js';
import type {GovernedHandoffRuntime} from './handoff-runtime.js';
import type {CodexNodeExecutionPort} from './codex-node-execution.js';
import {GovernedRetrievalRuntime, RepositoryTextRetrievalProvider, RetrievedEvidenceContextCompiler, SpawnZgSearchExecutor, ZgRetrievalProvider, type RetrievalStrategy} from './governed-retrieval.js';
import {ResourceRepositoryResolver} from './resource-repository-resolver.js';

/** Shared production definition path so qualification cannot drift from registered typed Actions. */
export function buildJobRuntimeDefinition(config: AgentControlConfig, manifestDir = process.env.AGENT_CONTROL_JOB_DIR || path.resolve('config/jobs'), harnessEfficiency?: HarnessEfficiencyLedgerPort) {
  const parcelJobs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../config/work-parcels/jobs');
  const operatorJobs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../config/operator-jobs');
  const workers = WorkerRegistry.fromConfig(config.resources), managedNodes = new ManagedNodeManager(config.resources, workers, new SshManagedNodeTransport()), actions = registerOperatorReviewActions(config, registerFreeTokenQualificationActions(registerManagedNodeActions(managedNodes, registerBrowserActions(registerReferenceActions()))), harnessEfficiency), catalog = new JobCatalog(actions.ids()).loadDirectory(manifestDir).loadDirectory(parcelJobs);
  if (process.env.AGENT_CONTROL_ENABLE_OPERATOR_REVIEW === 'true') catalog.loadDirectory(operatorJobs);
  return {workers, managedNodes, actions, catalog};
}

export function buildJobRuntime(config: AgentControlConfig, stateRoot = process.env.AGENT_CONTROL_STATE_DIR || path.resolve('.agent-control'), manifestDir = process.env.AGENT_CONTROL_JOB_DIR || path.resolve('config/jobs'), reasoningPlanner?: WorkParcelPlanner, modelRegistry?: ModelRegistry) {
  const harnessEfficiency = new FileHarnessEfficiencyLedger(path.join(stateRoot, 'harness-efficiency', 'model-invocations.json'));
  const {workers, managedNodes, actions, catalog} = buildJobRuntimeDefinition(config, manifestDir, harnessEfficiency);
  const harnessProfiles = configuredHarnessProfiles(config.harnessEfficiency), harnessProfileRouter = configuredHarnessProfileRouter(config.harnessEfficiency), contextPacketBuilder = new ContextPacketBuilder(harnessProfiles);
  for (const resource of config.resources) if (resource.transport.type === 'local') workers.setHealth(resource.id, 'healthy');
  const runtime = createJobRuntime(stateRoot, catalog, actions, workers, {efficiency: harnessEfficiency});
  const workParcels = new WorkParcelCoordinator(runtime, new WorkParcelStore(path.join(stateRoot, 'work-parcels', 'parcels.json')), new CatalogNaturalLanguagePlanner(runtime, reasoningPlanner), harnessEfficiency, modelRegistry);
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

export function buildGovernedRetrievalRuntime(config: AgentControlConfig, stateRoot = process.env.AGENT_CONTROL_STATE_DIR || path.resolve('.agent-control')) {
  const names=config.retrieval?.providers??['exact','lexical'];
  const providers=names.map(name=>name==='exact'?new RepositoryTextRetrievalProvider('exact'):name==='lexical'?new RepositoryTextRetrievalProvider('lexical'):new ZgRetrievalProvider(new SpawnZgSearchExecutor(config.retrieval?.zgExecutable??'zg')));
  const progression:RetrievalStrategy[]=['EXACT','LEXICAL',...(names.includes('zg')?['SEMANTIC' as const,'HYBRID' as const]:[])];
  return new GovernedRetrievalRuntime(providers,{enabled:config.retrieval?.enabled??false,maximumCalls:config.retrieval?.maximumCalls,maximumEvidenceItems:config.retrieval?.maximumEvidenceItems,maximumEvidenceTokens:config.retrieval?.maximumEvidenceTokens,minimumConfidence:config.retrieval?.minimumConfidence,requiredCoverage:config.retrieval?.requiredCoverage,contextPressurePercent:config.retrieval?.contextPressurePercent,contextPressureEvidenceFraction:config.retrieval?.contextPressureEvidenceFraction,allowedLocality:config.retrieval?.allowRemote?['LOCAL','REMOTE','HYBRID']:['LOCAL'],progression},{file:path.join(stateRoot,'retrieval','evidence.json')});
}

export function buildParameterizedJobRuntime(config: AgentControlConfig, modelRegistry: ModelRegistry, workParcels: WorkParcelCoordinator, stateRoot = process.env.AGENT_CONTROL_STATE_DIR || path.resolve('.agent-control'), tokenRouting?: TokenAwareBatonRuntime, contracts?: ContractExecutionRuntime, handoffs?: GovernedHandoffRuntime, codexNodeExecution?: CodexNodeExecutionPort, retrieval = buildGovernedRetrievalRuntime(config,stateRoot),contextPacketBuilder=new ContextPacketBuilder(configuredHarnessProfiles(config.harnessEfficiency))) {
  const definitions = new ParameterizedJobRegistry(); definitions.register(repositoryCodeReviewDefinition);
  const roots = config.jobs?.repositoryRoots ?? (process.env.AGENT_CONTROL_REPOSITORY_ROOTS?.split(path.delimiter).filter(Boolean) || [path.resolve('.')]);
  const lifecycle = tokenRouting && contracts && handoffs ? {routing: tokenRouting, contracts, handoffs} : undefined;
  const executor = new DirectRepositoryReviewExecutor(modelRegistry, workParcels.store, tokenRouting, lifecycle, undefined, codexNodeExecution, retrieval,new RetrievedEvidenceContextCompiler(contextPacketBuilder,new InMemoryContextGraph()));
  return createParameterizedJobEngine(stateRoot, definitions, modelRegistry, executor, {allowedRepositoryRoots: roots, allowedRepositoryRemotes: config.jobs?.repositoryRemotes, nodeHealthy: nodeId => { const resource = config.resources.find(item => item.id === nodeId); if (!resource) return false; if (resource.transport.type === 'local') return true; const node = workParcels.runtime.workers.list().find(item => item.id === nodeId); return node?.health === 'healthy'; }}, new ResourceRepositoryResolver(config.resources));
}

export function startParameterizedJobScheduler(runtime: ReturnType<typeof buildParameterizedJobRuntime>, onChange?: (runId: string, status: string) => void, intervalMs = 1000, onError?: (error: Error) => void) {
  let active = false, stopped = false;
  const tick = async () => { if (active || stopped) return; active = true; try { const created = await runtime.tickSchedules(); for (const run of created) onChange?.(run.id, run.status); const completed = await runtime.executeNext(); if (completed) onChange?.(completed.id, completed.status); } catch (error) { (onError ?? (failure => process.emitWarning(failure.message)))(error instanceof Error ? error : new Error(String(error))); } finally { active = false; } };
  const timer = setInterval(() => void tick(), intervalMs); timer.unref(); void tick(); return () => { stopped = true; clearInterval(timer); };
}

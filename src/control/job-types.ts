import type {CapabilityRequest} from './capabilities.js';
import type {ExecutionCleanupReport, OwnedExecution} from './owned-process.js';

export type JobPriority = 'background' | 'low' | 'normal' | 'high' | 'urgent';
export type ConcurrencyPolicy = 'allow' | 'no-overlap' | 'replace-running' | 'queue';
export type MissedRunPolicy = 'skip' | 'run-next-available' | 'run-once-immediately';
export type RunStatus = 'SCHEDULED' | 'QUEUED' | 'WAITING' | 'AUTHENTICATION_BLOCKED' | 'RECONNECTING' | 'RUNNING' | 'VERIFYING' | 'CANCELLING' | 'CLEANUP_UNCERTAIN' | 'SUCCEEDED' | 'FAILED' | 'DEGRADED' | 'CANCELLED' | 'MISSED' | 'DISCONNECTED';
export type StepStatus = 'QUEUED' | 'WAITING_FOR_WORKER' | 'WAITING_FOR_DEPENDENCY' | 'WAITING_FOR_RESOURCE' | 'WAITING_FOR_APPROVAL' | 'AUTHENTICATION_BLOCKED' | 'RECONNECTING' | 'DISPATCHED' | 'RUNNING' | 'VERIFYING' | 'RETRY_PENDING' | 'CANCEL_PENDING' | 'CLEANUP_UNCERTAIN' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED';

export interface RetryPolicy {attempts: number; backoffSeconds: number; backoffMultiplier?: number; maxBackoffSeconds?: number; overallDeadlineSeconds?: number;}
export interface ParameterDefinition {type: 'string' | 'integer' | 'number' | 'boolean'; default?: unknown; required?: boolean; secretRef?: boolean; minimum?: number; maximum?: number; enum?: unknown[];}
export interface ArtifactDeclaration {name: string; type: string; schema: string; version: string; retention?: string;}
export interface JobStepDefinition {
  id: string;
  name?: string;
  action: string;
  requires: string[];
  resources?: string[];
  dependsOn?: string[];
  inputs?: Record<string, string>;
  outputs?: ArtifactDeclaration[];
  timeoutSeconds?: number;
  retry?: RetryPolicy;
  approval?: string;
  verification?: string[];
}
export interface JobDefinition {
  apiVersion: 'agent-control/v1';
  kind: 'Job';
  metadata: {id: string; name: string; version: string; description?: string};
  spec: {enabled?: boolean; priority: JobPriority; concurrency: ConcurrencyPolicy; parameters?: Record<string, ParameterDefinition>; retry?: RetryPolicy; steps: JobStepDefinition[]};
}
export interface ScheduleDefinition {
  apiVersion: 'agent-control/v1';
  kind: 'Schedule';
  metadata: {id: string; name: string};
  spec: {enabled?: boolean; job: string; cron: string; timezone: string; missedRunPolicy: MissedRunPolicy; parameters?: Record<string, unknown>};
}
export interface ScheduleState {scheduleId: string; enabled: boolean; previousScheduledAt?: string; nextScheduledAt?: string; lastRunId?: string; lastSuccessAt?: string; lastFailureAt?: string; lastError?: string; missedCount: number; updatedAt: string;}
export interface WorkerRegistration {
  id: string;
  capabilities: string[];
  health: 'unknown' | 'healthy' | 'degraded' | 'offline';
  capacity: number;
  active: number;
  labels?: Record<string, string>;
  blockedCapabilities?: string[];
  capabilityExpiresAt?: Record<string, string>;
  observedAt: string;
}
export interface PlacementRationale {selected?: string; eligible: string[]; rejected: Array<{workerId: string; reasons: string[]}>; reasons: string[];}
export interface ArtifactRecord {
  id: string; runId: string; stepId: string; name: string; type: string; schema: string; version: string;
  createdAt: string; size: number; sha256: string; storageRef: string; retention: string;
  provenance: {jobId: string; jobVersion: string; action: string; workerId: string};
}
export type RecoveryFailureKind = 'transient-transport' | 'expired-enrolment' | 'authentication-required' | 'permanent-configuration' | 'execution';
export interface StepAttempt {attempt: number; startedAt: string; endedAt?: string; workerId?: string; outcome?: string; retryable?: boolean; errorClass?: ActionFailureClass; recoveryKind?: RecoveryFailureKind; efficiencyInvocationIds?: string[]; timeoutSeconds?: number; elapsedMs?: number; terminalReason?: string; cleanup?: ExecutionCleanupReport;}
export type ActionFailureClass = 'execution' | 'capability_unavailable' | 'authentication' | 'policy_rejection' | 'verification' | 'configuration';
export interface RunStep {
  id: string; action: string; status: StepStatus; dependsOn: string[]; capabilityRequest: CapabilityRequest; resources: string[];
  attempts: StepAttempt[]; artifactIds: string[]; placement?: PlacementRationale; waitingReason?: string; approval?: string;
  startedAt?: string; endedAt?: string; nextAttemptAt?: string; recoveryDeadlineAt?: string; remainingRetryBudget?: number; cleanup?: ExecutionCleanupReport; error?: string; verification?: {required: string[]; passed: string[]; failed: string[]};
}
export interface RunRecord {
  id: string; jobId: string; jobVersion: string; trigger: {type: 'manual' | 'schedule' | 'retry'; id?: string; actor: string; modelRoute?: {requestedModel: string | null; requestedRole: string | null; modelId: string; providerId: string; accountProfileId?: string | null; accountLabel?: string | null; accountPlan?: string | null; accountPlanAuthority?: 'operator-configured' | 'provider-reported' | null; accountQualification?: string | null; accountAvailability?: string | null; providerModel: string; nodeId: string; workloadNodeId?: string; providerExecutionNodeId?: string; credentialNodeId?: string | null; qualificationVersion: string; fallback: boolean; fallbackReason: string | null}};
  requestedAt: string; updatedAt?: string; scheduledAt?: string; startedAt?: string; endedAt?: string; status: RunStatus; priority: JobPriority;
  concurrency: ConcurrencyPolicy; parameters: Record<string, unknown>; steps: RunStep[]; artifacts: string[]; errors: string[];
  effectiveJob: JobDefinition; selectedWorkers: string[]; approvals: string[]; provenance: Array<{type: string; at: string; detail: string}>;
  lineage?: {replacesRunId?: string; replacedByRunId?: string; retryOfRunId?: string; retriedByRunId?: string};
}
export interface ActionContext {run: RunRecord; step: RunStep; worker: WorkerRegistration; parameters: Record<string, unknown>; inputArtifacts: ArtifactRecord[]; readArtifact: (id: string) => unknown; signal: AbortSignal; ownedExecution: OwnedExecution;}
export interface ActionOutput {artifacts?: Array<{name: string; value: unknown; type?: string; schema?: string; version?: string; retention?: string}>; evidence?: string[]; verification?: string[]; detail?: string; efficiencyInvocationIds?: string[]; executionState?: 'verification-pending';}
export type ActionHandler = (context: ActionContext) => Promise<ActionOutput>;
export interface AgentActionHandler {readonly path: 'adaptive-harness'; execute(context: ActionContext): Promise<ActionOutput>;}

export const jobPriorityRank: Record<JobPriority, number> = {background: 1, low: 2, normal: 3, high: 4, urgent: 5};

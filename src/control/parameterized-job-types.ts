import type {ModelRouteDecision} from './model-registry.js';

export type JobParameterType = 'string' | 'integer' | 'boolean' | 'enum' | 'repository' | 'path' | 'git-ref' | 'node' | 'model-role' | 'duration';
export interface JobParameterSchema {
  type: JobParameterType;
  description: string;
  required?: boolean;
  default?: unknown;
  values?: Array<string | number | boolean>;
  minimum?: number;
  maximum?: number;
}
export interface JobBudgetPolicy {timeoutMinutes: number; maxCost?: number; maximumRetries: number; maximumInputTokens?: number; maximumOutputTokens?: number;}
export interface JobDefinitionRouting {modelRole: string; allowFallback: boolean;}
export interface ParameterizedJobDefinition {
  schema: 'agent-control.job-definition/v1';
  id: string;
  version: number;
  displayName: string;
  description: string;
  parameters: Record<string, JobParameterSchema>;
  routing: JobDefinitionRouting;
  permissions: {repository: 'read-only'; shell: 'none' | 'bounded-read'; network: 'none' | 'provider-only'};
  budgets: JobBudgetPolicy;
  outputs: {schema: string};
  validation: {requireEvidence: boolean; requireReviewedCommit: boolean};
  template: {id: string; version: number; instruction: string};
  compatibleWith?: number[];
}

export type SavedJobDefinitionReference = {id: string; version: number; follow: 'pinned'} | {id: string; version: number; follow: 'latest-compatible'};
export type SavedJobSchedule =
  | {kind: 'once'; at: string; timezone: string; enabled: boolean; missedRunPolicy: MissedSchedulePolicy}
  | {kind: 'cron'; cron: string; timezone: string; enabled: boolean; missedRunPolicy: MissedSchedulePolicy};
export type MissedSchedulePolicy = 'run-once-immediately' | 'skip' | 'queue';
export type SavedJobConcurrency = 'forbid-overlap' | 'queue' | 'allow';
export interface SavedJob {
  schema: 'agent-control.saved-job/v1';
  id: string;
  name: string;
  definition: SavedJobDefinitionReference;
  parameters: Record<string, unknown>;
  routing?: {modelRole?: string; model?: string; accountProfile?: string; allowFallback?: boolean};
  contextProfile: 'THIN' | 'STANDARD' | 'DEEP';
  budgets?: Partial<JobBudgetPolicy>;
  schedule?: SavedJobSchedule;
  concurrency: SavedJobConcurrency;
  enabled: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedRepository {
  identity: string;
  name: string;
  nodeId: string;
  sourcePath?: string;
  remote?: string;
  requestedRef: string;
  reviewedSha: string;
  dirty: boolean;
  dirtyPaths: string[];
  dirtyFingerprint?: string;
  comparisonSha?: string;
  snapshotPath: string;
  snapshotKind: 'local-shared-clone' | 'remote-clone' | 'remote-immutable-archive';
  bundleSha256?: string;
  bundlePath?: string;
}

export type ParameterizedRunStatus = 'SCHEDULED' | 'QUEUED' | 'RESOLVING' | 'RUNNING' | 'VALIDATING' | 'SUCCEEDED' | 'SUCCEEDED_WITH_FINDINGS' | 'FAILED' | 'CANCELLED' | 'DEGRADED';
export interface JobFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  category: string;
  file?: string;
  startLine?: number;
  endLine?: number;
  evidence: string;
  reasoning: string;
  impact: string;
  suggestedRemediation: string;
  confidence: number;
  validation: {state: 'VALID' | 'REJECTED' | 'UNVERIFIED'; reasons: string[]};
}
export interface RepositoryReviewResult {
  schema: 'agent-control.repository-review/v1';
  executiveSummary: string;
  findings: JobFinding[];
  positiveObservations: string[];
  areasReviewed: string[];
  areasNotReviewed: string[];
  verdict: 'PASS' | 'PASS_WITH_FINDINGS' | 'REVIEW_REQUIRED' | 'FAILED';
}
export interface JobRunUsage {inputTokens?: number; freshInputTokens?: number; cachedInputTokens?: number; outputTokens?: number; totalTokens?: number; providerReportedCost?: number; calculatedCost?: number; cost?: number; currency?: string; source: 'provider' | 'calculated' | 'unavailable';}
export interface ParameterizedJobRun {
  schema: 'agent-control.job-run/v1';
  id: string;
  occurrenceId: string;
  savedJobId?: string;
  definition: ParameterizedJobDefinition;
  resolvedParameters: Record<string, unknown>;
  trigger: {type: 'manual' | 'schedule'; actor: string; scheduledFor?: string; scheduleCursor?: string};
  status: ParameterizedRunStatus;
  transitions: Array<{status: ParameterizedRunStatus; at: string; detail?: string}>;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  repository?: ResolvedRepository;
  modelRoute?: ModelRouteDecision;
  context?: {profile: 'THIN' | 'STANDARD' | 'DEEP'; files: string[]; changedFiles: string[]; omittedFiles: string[]; chunks: Array<{id: string; files: string[]; sha256: string}>; truncated: boolean};
  workParcelIds: string[];
  evidence: string[];
  providerResponseIds: string[];
  usage: JobRunUsage;
  result?: RepositoryReviewResult;
  errors: string[];
  fallbackHistory: Array<{at: string; reason: string; selectedModel: string}>;
  retryHistory: Array<{at: string; attempt: number; reason: string}>;
  /** Durable, monotonically increasing provider-execution identity across retries and controller restarts. */
  executionSequence?: number;
  immutable: boolean;
}

export interface ReviewExecutionRequest {
  run: ParameterizedJobRun;
  executionAttempt: number;
  route: ModelRouteDecision;
  instruction: string;
  contextChunks: Array<{id: string; content: string; files: string[]; sha256: string}>;
  maximumOutputTokens?: number;
  maximumCost?: number;
  signal: AbortSignal;
}
export interface ReviewExecutionResponse {result: RepositoryReviewResult; usage: JobRunUsage; evidence: string[]; providerResponseIds: string[]; workParcelIds: string[];}
export interface RepositoryReviewExecutor {execute(request: ReviewExecutionRequest): Promise<ReviewExecutionResponse>; recordVerification?(workParcelIds: string[], verdict: RepositoryReviewResult['verdict']): void;}

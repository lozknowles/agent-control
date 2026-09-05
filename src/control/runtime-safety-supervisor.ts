import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {redactSensitiveText} from './context-readers.js';

export type RuntimeSafetyOutcome = 'ALLOW' | 'ALLOW_WITH_AUDIT' | 'REQUIRE_APPROVAL' | 'DENY' | 'PAUSE' | 'ESCALATE';
export type RuntimeActionCategory = 'READ_ONLY' | 'REPOSITORY_WRITE' | 'FILESYSTEM_WRITE' | 'REMOTE_NODE' | 'DESTRUCTIVE' | 'DEPLOYMENT' | 'CREDENTIAL_USE' | 'EXTERNAL_COMMUNICATION' | 'UNKNOWN';

export interface RuntimeActionIntent {
  runId: string;
  parcelId?: string;
  stageId?: string;
  stepId: string;
  actor: string;
  action: string;
  goal: string;
  categories: RuntimeActionCategory[];
  filesystemScope: string[];
  repositoryScope: string[];
  remoteNodeIds: string[];
  credentialReferences: string[];
  externalDestinations: string[];
  production: boolean;
  destructive: boolean;
  requestedCapabilities: string[];
  /** True when pre-redaction inspection detected credential material. The material itself is never retained. */
  sensitiveMaterialDetected?: boolean;
}

export interface RuntimeSafetyDecision {
  schema: 'agent-control.runtime-safety-decision/v1';
  id: string;
  at: string;
  intentHash: string;
  runId: string;
  parcelId?: string;
  stageId?: string;
  stepId: string;
  action: string;
  categories: RuntimeActionCategory[];
  outcome: RuntimeSafetyOutcome;
  reason: string;
  policyId: string;
  approvalId?: string;
  evidence: string[];
}

export interface RuntimeSafetyPolicy {
  id: string;
  allowRepositoryWrite?: boolean;
  approvedFilesystemRoots?: string[];
  approvedRepositoryRoots?: string[];
  approvedRemoteNodes?: string[];
  requireApprovalForExternalCommunication?: boolean;
  requireApprovalForCredentialUse?: boolean;
  requireApprovalForDeployment?: boolean;
  denyDestructiveWithoutApproval?: boolean;
}

export interface RuntimeSafetySupervisorPort { assess(intent: RuntimeActionIntent): RuntimeSafetyDecision; approve(decisionId: string, actor: string): RuntimeSafetyDecision; list(): RuntimeSafetyDecision[]; subscribe?(listener: (decision: RuntimeSafetyDecision) => void): () => void; }

interface Snapshot {schema: 'agent-control.runtime-safety-ledger/v1'; decisions: RuntimeSafetyDecision[]; approvals: Array<{decisionId: string; actor: string; at: string}>}

export class RuntimeSafetySupervisor implements RuntimeSafetySupervisorPort {
  private readonly decisions = new Map<string, RuntimeSafetyDecision>();
  private readonly approvals = new Map<string, {decisionId: string; actor: string; at: string}>();
  private readonly listeners = new Set<(decision: RuntimeSafetyDecision) => void>();
  private readonly policy: Required<RuntimeSafetyPolicy>;
  constructor(policy: RuntimeSafetyPolicy = {id: 'agent-control.default-runtime-safety/v1'}, readonly file?: string, private readonly clock = () => new Date().toISOString()) {
    this.policy = {id: policy.id, allowRepositoryWrite: policy.allowRepositoryWrite ?? true, approvedFilesystemRoots: [...(policy.approvedFilesystemRoots ?? [])], approvedRepositoryRoots: [...(policy.approvedRepositoryRoots ?? [])], approvedRemoteNodes: [...(policy.approvedRemoteNodes ?? [])], requireApprovalForExternalCommunication: policy.requireApprovalForExternalCommunication ?? true, requireApprovalForCredentialUse: policy.requireApprovalForCredentialUse ?? false, requireApprovalForDeployment: policy.requireApprovalForDeployment ?? true, denyDestructiveWithoutApproval: policy.denyDestructiveWithoutApproval ?? true};
    if (!file || !fs.existsSync(file)) return; const snapshot = JSON.parse(fs.readFileSync(file, 'utf8')) as Snapshot; if (snapshot.schema !== 'agent-control.runtime-safety-ledger/v1') throw new Error('runtime_safety_snapshot_invalid'); for (const item of snapshot.decisions) this.decisions.set(item.id, item); for (const item of snapshot.approvals ?? []) this.approvals.set(item.decisionId, item);
  }
  assess(raw: RuntimeActionIntent) {
    const sensitiveMaterialDetected = raw.sensitiveMaterialDetected === true || containsSecretMaterial(raw), intent = sanitizeIntent({...raw, ...(sensitiveMaterialDetected ? {sensitiveMaterialDetected: true} : {})}), intentHash = sha(intent), existing = [...this.decisions.values()].find(item => item.intentHash === intentHash && item.runId === intent.runId && item.stepId === intent.stepId);
    if (existing) return structuredClone(existing);
    const assessment = this.evaluate(intent), id = `safety-${randomUUID()}`, approvalId = ['REQUIRE_APPROVAL','PAUSE','ESCALATE'].includes(assessment.outcome) ? `runtime-safety:${id}` : undefined;
    const decision: RuntimeSafetyDecision = {schema: 'agent-control.runtime-safety-decision/v1', id, at: this.clock(), intentHash, runId: intent.runId, ...(intent.parcelId ? {parcelId: intent.parcelId} : {}), ...(intent.stageId ? {stageId: intent.stageId} : {}), stepId: intent.stepId, action: intent.action, categories: intent.categories, outcome: assessment.outcome, reason: assessment.reason, policyId: this.policy.id, ...(approvalId ? {approvalId} : {}), evidence: assessment.evidence};
    this.decisions.set(id, decision); this.save(); this.publish(decision); return structuredClone(decision);
  }
  approve(decisionId: string, actor: string) { const decision = this.decisions.get(decisionId); if (!decision) throw new Error('runtime_safety_decision_missing'); if (!['REQUIRE_APPROVAL','PAUSE','ESCALATE'].includes(decision.outcome)) throw new Error('runtime_safety_decision_not_approvable'); this.approvals.set(decision.id, {decisionId: decision.id, actor: safeIdentifier(actor), at: this.clock()}); decision.outcome = 'ALLOW_WITH_AUDIT'; decision.reason = `${decision.reason}; explicitly approved`; decision.evidence = [...decision.evidence, `approval:${safeIdentifier(actor)}`]; this.save(); this.publish(decision); return structuredClone(decision); }
  list() { return [...this.decisions.values()].sort((left, right) => Date.parse(left.at) - Date.parse(right.at)).map(item => structuredClone(item)); }
  subscribe(listener: (decision: RuntimeSafetyDecision) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private evaluate(intent: RuntimeActionIntent): {outcome: RuntimeSafetyOutcome; reason: string; evidence: string[]} {
    const evidence = [`goal:${sha(intent.goal).slice(0, 16)}`, `action:${intent.action}`, ...intent.categories.map(item => `category:${item}`)];
    if (intent.sensitiveMaterialDetected) return {outcome: 'DENY', reason: 'Plain credential material is forbidden; only opaque credential references may cross the control boundary', evidence};
    if (!insideApprovedScopes(intent.filesystemScope, this.policy.approvedFilesystemRoots) || !insideApprovedScopes(intent.repositoryScope, this.policy.approvedRepositoryRoots)) return {outcome: 'DENY', reason: 'Requested filesystem or repository target falls outside configured scope', evidence};
    if (this.policy.approvedRemoteNodes.length && intent.remoteNodeIds.some(id => !this.policy.approvedRemoteNodes.includes(id))) return {outcome: 'DENY', reason: 'Requested remote node is outside configured scope', evidence};
    if (intent.destructive || intent.categories.includes('DESTRUCTIVE')) return this.policy.denyDestructiveWithoutApproval ? {outcome: 'REQUIRE_APPROVAL', reason: 'Destructive action requires explicit Agent Control approval', evidence} : {outcome: 'ALLOW_WITH_AUDIT', reason: 'Destructive action allowed by configured policy with durable audit', evidence};
    if (intent.production || intent.categories.includes('DEPLOYMENT')) return this.policy.requireApprovalForDeployment ? {outcome: 'REQUIRE_APPROVAL', reason: 'Production or deployment action requires explicit approval', evidence} : {outcome: 'ALLOW_WITH_AUDIT', reason: 'Deployment allowed by configured policy with durable audit', evidence};
    if (intent.categories.includes('EXTERNAL_COMMUNICATION') && this.policy.requireApprovalForExternalCommunication) return {outcome: 'REQUIRE_APPROVAL', reason: 'External communication requires explicit approval', evidence};
    if (intent.categories.includes('CREDENTIAL_USE') && this.policy.requireApprovalForCredentialUse) return {outcome: 'REQUIRE_APPROVAL', reason: 'Credential use requires explicit approval', evidence};
    if (intent.categories.includes('REPOSITORY_WRITE') && !this.policy.allowRepositoryWrite) return {outcome: 'DENY', reason: 'Repository writes are disabled by runtime safety policy', evidence};
    if (intent.categories.some(item => ['REPOSITORY_WRITE','FILESYSTEM_WRITE','REMOTE_NODE','CREDENTIAL_USE'].includes(item))) return {outcome: 'ALLOW_WITH_AUDIT', reason: 'Scoped governed action is allowed with durable independent audit', evidence};
    return {outcome: 'ALLOW', reason: 'Read-only bounded action satisfies configured scope', evidence};
  }
  private save() { if (!this.file) return; fs.mkdirSync(path.dirname(this.file), {recursive: true}); const temporary = `${this.file}.${process.pid}.tmp`, snapshot: Snapshot = {schema: 'agent-control.runtime-safety-ledger/v1', decisions: this.list(), approvals: [...this.approvals.values()]}; fs.writeFileSync(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, {mode: 0o600}); fs.renameSync(temporary, this.file); }
  private publish(decision: RuntimeSafetyDecision) { for (const listener of this.listeners) listener(structuredClone(decision)); }
}

export function deriveRuntimeActionIntent(input: {runId: string; parcelId?: string; stageId?: string; stepId: string; actor: string; action: string; goal: string; parameters: Record<string, unknown>; requestedCapabilities: string[]; resources: string[]; workerId?: string}) {
  const text = `${input.action} ${input.goal} ${input.requestedCapabilities.join(' ')}`.toLowerCase(), categories = new Set<RuntimeActionCategory>();
  if (/delete|destroy|wipe|drop|force-push|reset-hard|remove-recursive/.test(text)) categories.add('DESTRUCTIVE'); if (/deploy|release|publish|production|promote/.test(text)) categories.add('DEPLOYMENT'); if (/repository\.write|repo.*write|git\.mutation|code.*modify/.test(text)) categories.add('REPOSITORY_WRITE'); if (/file.*write|filesystem\.write|package\.install/.test(text)) categories.add('FILESYSTEM_WRITE'); if (/remote|ssh|adb|node\./.test(text) || input.workerId && input.workerId !== 'controller') categories.add('REMOTE_NODE'); if (/credential|oauth|auth|api.?key/.test(text)) categories.add('CREDENTIAL_USE'); if (/email|message|post|external\.communication/.test(text)) categories.add('EXTERNAL_COMMUNICATION'); if (!categories.size) categories.add('READ_ONLY');
  const entries = flatten(input.parameters), filesystemScope = entries.filter(item => /(?:path|file|directory|cwd)$/i.test(item.key) && typeof item.value === 'string').map(item => String(item.value)), repositoryScope = entries.filter(item => /repo(?:sitory)?(?:root|path)?$/i.test(item.key) && typeof item.value === 'string').map(item => String(item.value)), credentialReferences = entries.filter(item => /(?:credential|auth|token|key).*ref|(?:credential|auth).*env/i.test(item.key) && typeof item.value === 'string').map(item => String(item.value)), externalDestinations = entries.filter(item => /(?:url|destination|recipient|endpoint)$/i.test(item.key) && typeof item.value === 'string').map(item => String(item.value));
  const raw: RuntimeActionIntent = {runId: input.runId, ...(input.parcelId ? {parcelId: input.parcelId} : {}), ...(input.stageId ? {stageId: input.stageId} : {}), stepId: input.stepId, actor: input.actor, action: input.action, goal: input.goal, categories: [...categories], filesystemScope, repositoryScope, remoteNodeIds: input.workerId ? [input.workerId] : [], credentialReferences, externalDestinations, production: categories.has('DEPLOYMENT'), destructive: categories.has('DESTRUCTIVE'), requestedCapabilities: input.requestedCapabilities, sensitiveMaterialDetected: containsSecretMaterial(input.parameters)};
  return sanitizeIntent(raw);
}

function sanitizeIntent(input: RuntimeActionIntent): RuntimeActionIntent { return {...input, runId: safeIdentifier(input.runId), ...(input.parcelId ? {parcelId: safeIdentifier(input.parcelId)} : {}), ...(input.stageId ? {stageId: safeIdentifier(input.stageId)} : {}), stepId: safeIdentifier(input.stepId), actor: safeIdentifier(input.actor), action: safeIdentifier(input.action), goal: safeText(input.goal, 8_192), categories: [...new Set(input.categories)], filesystemScope: safeList(input.filesystemScope), repositoryScope: safeList(input.repositoryScope), remoteNodeIds: input.remoteNodeIds.map(safeIdentifier), credentialReferences: input.credentialReferences.map(value => safeIdentifier(value)), externalDestinations: input.externalDestinations.map(value => safeText(value, 512)), requestedCapabilities: input.requestedCapabilities.map(safeIdentifier), ...(input.sensitiveMaterialDetected ? {sensitiveMaterialDetected: true} : {})}; }
function containsSecretMaterial(value: unknown, key = ''): boolean {
  if (typeof value === 'string') {
    if (/(?:sk-(?:proj-)?[A-Za-z0-9_-]{12,}|bearer\s+[A-Za-z0-9._-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) return true;
    if (/(?:password|access.?token|refresh.?token|api.?key)\s*[:=]\s*\S+/i.test(value)) return true;
    return sensitiveKey(key) && value.trim().length > 0;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return sensitiveKey(key);
  if (Array.isArray(value)) return value.some(item => containsSecretMaterial(item, key));
  return Boolean(value && typeof value === 'object' && Object.entries(value).some(([name, item]) => containsSecretMaterial(item, name)));
}
function sensitiveKey(key: string) { return /(?:password|access.?token|refresh.?token|api.?key|client.?secret|private.?key)$/i.test(key) && !/(?:ref(?:erence)?|env|store|id)$/i.test(key); }
function insideApprovedScopes(values: string[], approved: string[]) {
  if (!approved.length) return true;
  return values.every(value => approved.some(root => scopeContains(root, value)));
}
function scopeContains(root: string, candidate: string) {
  const windows = path.win32.isAbsolute(root) || path.win32.isAbsolute(candidate), api = windows ? path.win32 : path.posix;
  if (!api.isAbsolute(root) || !api.isAbsolute(candidate)) return false;
  const normalizedRoot = api.normalize(root), normalizedCandidate = api.normalize(candidate);
  if (windows) {
    const foldedRelative = api.relative(normalizedRoot.toLowerCase(), normalizedCandidate.toLowerCase());
    return foldedRelative === '' || (!foldedRelative.startsWith('..') && !api.isAbsolute(foldedRelative));
  }
  const relative = api.relative(normalizedRoot, normalizedCandidate);
  return relative === '' || (!relative.startsWith('..') && !api.isAbsolute(relative));
}
function flatten(value: unknown, prefix = ''): Array<{key: string; value: unknown}> { if (!value || typeof value !== 'object' || Array.isArray(value)) return [{key: prefix, value}]; return Object.entries(value).flatMap(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key)); }
function safeList(values: string[]) { return [...new Set(values.map(value => safeText(value, 2_048)).filter(Boolean))]; }
function safeText(value: string, maximum: number) { const safe = redactSensitiveText(String(value)).replace(/[\r\n]+/g, ' ').trim(); return safe.length <= maximum ? safe : `${safe.slice(0, maximum - 3)}...`; }
function safeIdentifier(value: string) { const safe = safeText(value, 256); if (!/^[a-z0-9][a-z0-9:._/@-]*$/i.test(safe)) return `sha256:${sha(safe)}`; return safe; }
function sha(value: unknown) { return createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex'); }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`; return JSON.stringify(value); }

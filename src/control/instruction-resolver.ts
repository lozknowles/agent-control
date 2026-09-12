import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {redactSensitiveText} from './security-redaction.js';
import {INSTRUCTION_CAPABILITIES, negotiateInstructionCapabilities, type InstructionCapability, type InstructionCapabilityOffer, type InstructionCapabilityResult} from './instruction-capabilities.js';

const Ajv2020=createRequire(import.meta.url)('ajv/dist/2020') as new (options:Record<string,unknown>)=>{compile(schema:unknown):(value:unknown)=>boolean};
const validateManifestSchema=new Ajv2020({strict:true}).compile(JSON.parse(fs.readFileSync(new URL('../../config/schemas/effective-instruction-manifest-v1.schema.json',import.meta.url),'utf8')));

export const INSTRUCTION_SOURCE_TYPES = ['PLATFORM_POLICY','GOVERNANCE','USER_TASK','TEMPORARY','REPOSITORY','SKILL','CONTINUATION','PROVIDER_OVERLAY','MEMORY','PERSONA'] as const;
export type InstructionSourceType = typeof INSTRUCTION_SOURCE_TYPES[number];
export type InstructionDomain = 'AUTHORITY' | 'TASK' | 'GUIDANCE' | 'CAPABILITY' | 'ADVISORY' | 'PERSONA';
const precedence: Record<InstructionSourceType, number> = {PLATFORM_POLICY: 100, GOVERNANCE: 90, USER_TASK: 80, TEMPORARY: 85, REPOSITORY: 60, SKILL: 50, CONTINUATION: 40, PROVIDER_OVERLAY: 30, MEMORY: 20, PERSONA: 10};
const domain: Record<InstructionSourceType, InstructionDomain> = {PLATFORM_POLICY:'AUTHORITY',GOVERNANCE:'AUTHORITY',USER_TASK:'TASK',TEMPORARY:'TASK',REPOSITORY:'GUIDANCE',SKILL:'GUIDANCE',CONTINUATION:'ADVISORY',PROVIDER_OVERLAY:'CAPABILITY',MEMORY:'ADVISORY',PERSONA:'PERSONA'};
export interface InstructionSource {
  type: InstructionSourceType;
  uri: string;
  revision?: string | null;
  /** Transient only. Never present in a persisted manifest. */
  content?: string;
  contentHash?: string | null;
  scope?: string;
  audience?: string[];
  selected?: boolean;
  reason?: string;
  exclusion?: string;
  skillId?: string;
  sensitive?: boolean;
  expiresAt?: string;
}
export interface InstructionIdentity {parcelId: string; runId: string | null; stageId: string | null; workerId: string | null; providerId: string | null; modelId: string | null; providerModel: string | null; accountProfileId: string | null; invocationId: string | null;}
export interface InstructionResolutionInput {
  identity: InstructionIdentity;
  repository?: {id: string; revision: string | null};
  targetPaths?: string[];
  sources: InstructionSource[];
  selectedSkillIds?: string[];
  currentInstructions?: string;
  actualInstructions?: string;
  transformations?: Array<{adapter: string; operation: string; inputHash: string; outputHash: string; wireHash: string | null; boundary: string}>;
  offers?: InstructionCapabilityOffer[];
  requestedCapabilities?: InstructionCapability[];
  continuation?: {id: string; hash: string} | null;
  amendments?: Array<{id: string; hash: string; status: string}>;
  now?: string;
  maximumBytes?: number;
  maximumSourceBytes?: number;
}
export interface ManifestSource {
  id: string; type: InstructionSourceType; uri: string; revision: string | null; contentHash: string | null; scope: string; audience: string[];
  domain: InstructionDomain; precedence: number; selection: 'SELECTED' | 'EXCLUDED'; reason: string;
  originalBytes: number | null; renderedBytes: number; renderedHash: string | null; truncated: boolean;
  skillId: string | null;
  semanticAssessment: 'BOUNDED_DIRECTIVES_ONLY' | 'NOT_PARSED';
}
export interface EffectiveInstructionManifest {
  schema: 'agent-control.effective-instruction-manifest/v1'; mode: 'SHADOW'; id: string; hash: string;
  identity: InstructionIdentity; repository: {id: string; revision: string | null} | null; targetPaths: string[];
  selectedSources: ManifestSource[]; excludedSources: ManifestSource[];
  precedenceDecisions: Array<{target: string; key: string; winningSourceId: string; winningValueHash: string; reason: string}>;
  conflicts: Array<{target: string; key: string; winningSourceId: string | null; losingSourceIds: string[]; resolution: 'PRECEDENCE' | 'UNRESOLVED_EQUAL_PRECEDENCE' | 'SOURCE_IDENTITY_CONFLICT'}>;
  capabilities: InstructionCapabilityResult[];
  transformations: NonNullable<InstructionResolutionInput['transformations']>;
  temporaryInstructionIds: string[]; continuation: {id: string; hash: string} | null; amendments: NonNullable<InstructionResolutionInput['amendments']>;
  shadow: {currentHash: string | null; proposedHash: string; actualHash: string | null; proposalTruncated: boolean; comparison: 'DIFFERENT' | 'EQUAL' | 'UNOBSERVED'; sourceCoverage: Array<{sourceId: string; presentInCurrent: boolean | null}>; applied: false};
  effectiveInstructionHash: string | null;
  verification: {integrity: 'VERIFIED'; resolution: 'PASS_WITH_LIMITATIONS' | 'FAIL'; freeTextConflictCoverage: 'NOT_EXHAUSTIVE'; providerReceipt: 'NOT_ATTESTED'; warnings: string[]};
}

/** Stable JSON hashing deliberately excludes clocks and transient content. */
export function canonicalInstructionJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalInstructionJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).filter(key => (value as Record<string, unknown>)[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonicalInstructionJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  throw new Error('instruction_hash_value_invalid');
}
export function instructionHash(value: string) { return createHash('sha256').update(value).digest('hex'); }
function safe(value: string) { const redacted = redactSensitiveText(value); return redacted === value && value.length <= 1024 ? value : `redacted:${instructionHash(value)}`; }
export function instructionPath(value: string): string {
  if (!value || value.includes('\\') || value.includes('\0') || path.posix.isAbsolute(value) || /^[a-z]:/i.test(value)) throw new Error('instruction_scope_invalid');
  const normalized = path.posix.normalize(value);
  if (normalized === '..' || normalized.startsWith('../')) throw new Error('instruction_scope_escape');
  return normalized.replace(/\/$/, '') || '.';
}
export function instructionScopeApplies(scope: string, target: string) { return scope === '.' || target === scope || target.startsWith(`${scope}/`); }
function boundedText(text: string, budget: number) { let value = Buffer.from(text).subarray(0, budget).toString('utf8'); while (Buffer.byteLength(value) > budget || value.endsWith('\ufffd')) value = value.slice(0, -1); return value; }
/** Only this documented syntax is semantically compared. Unrestricted prose remains explicitly unassessed. */
function directives(text: string) { return [...text.matchAll(/^instruction\.([a-z][a-z0-9_.-]{0,63})[ \t]*=[ \t]*([^\r\n]{1,512})$/gm)].map(match => ({key: match[1]!, value: match[2]!.trim()})); }

export function resolveInstructions(input: InstructionResolutionInput): {manifest: EffectiveInstructionManifest; proposedInstructions: string} {
  const maximumBytes = input.maximumBytes ?? 65536, sourceLimit = input.maximumSourceBytes ?? Math.min(16384,maximumBytes);
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 128 || maximumBytes > 1048576 || !Number.isSafeInteger(sourceLimit) || sourceLimit < 1 || sourceLimit > maximumBytes) throw new Error('instruction_budget_invalid');
  if (input.sources.length > 256) throw new Error('instruction_source_limit');
  const targets = [...new Set((input.targetPaths?.length ? input.targetPaths : ['.']).map(instructionPath))].sort();
  const warnings = ['Shadow resolution does not replace the current prompt.', 'Natural-language contradictions require review; only instruction.key=value directives are compared.'];
  const conflicts: EffectiveInstructionManifest['conflicts'] = [];
  const prepared = input.sources.map(source => {
    if (!INSTRUCTION_SOURCE_TYPES.includes(source.type)) throw new Error('instruction_source_type_invalid');
    const scope = instructionPath(source.scope ?? '.'), uri = safe(source.uri), revision = source.revision ? safe(source.revision) : null;
    const hash = source.content === undefined ? source.contentHash ?? null : instructionHash(source.content);
    if (hash !== null && !/^[a-f0-9]{64}$/.test(hash)) throw new Error('instruction_source_hash_invalid');
    if (source.content !== undefined && source.contentHash && source.contentHash !== hash) throw new Error('instruction_source_hash_mismatch');
    const identity = canonicalInstructionJson({type: source.type, uri, revision, scope});
    return {source, identity, scope, uri, revision, hash, rank: precedence[source.type], depth: scope === '.' ? 0 : scope.split('/').length};
  }).sort((a,b) => b.rank-a.rank || (a.source.type === 'REPOSITORY' && b.source.type === 'REPOSITORY' ? b.depth-a.depth : 0) || (a.identity<b.identity?-1:a.identity>b.identity?1:0) || ((a.hash??'')<(b.hash??'')?-1:(a.hash??'')>(b.hash??'')?1:0) || (canonicalInstructionJson(a.source)<canonicalInstructionJson(b.source)?-1:canonicalInstructionJson(a.source)>canonicalInstructionJson(b.source)?1:0));
  const selected: Array<{record: ManifestSource; text: string; depth: number}> = [], excluded: ManifestSource[] = [], seen = new Set<string>();
  let remaining = maximumBytes;
  for (const item of prepared) {
    const {source, identity, scope, uri, revision, hash, rank, depth} = item;
    const id = `source-${instructionHash(canonicalInstructionJson({identity, hash})).slice(0,24)}`;
    let reason = source.exclusion ?? (source.selected === false ? 'NOT_SELECTED' : undefined);
    if (!reason && !targets.some(target => instructionScopeApplies(scope,target))) reason = 'OUTSIDE_SCOPE';
    if (!reason && source.audience?.length && !source.audience.includes('*') && !source.audience.includes(input.identity.workerId ?? 'unassigned')) reason = 'AUDIENCE_MISMATCH';
    if (!reason && source.type === 'SKILL' && (!source.skillId || !input.selectedSkillIds?.includes(source.skillId))) reason = 'SKILL_NOT_SELECTED';
    if (!reason && source.expiresAt && (!input.now || !Number.isFinite(Date.parse(input.now)) || !Number.isFinite(Date.parse(source.expiresAt)) || Date.parse(source.expiresAt) <= Date.parse(input.now))) reason = 'TEMPORARY_EXPIRED_OR_TIME_UNPROVEN';
    if (!reason && (source.sensitive || source.content !== undefined && redactSensitiveText(source.content) !== source.content)) reason = 'SENSITIVE_CONTENT_HASH_ONLY';
    if (!reason && source.content === undefined) reason = 'CONTENT_UNAVAILABLE';
    if (!reason && !source.content?.trim()) reason = 'EMPTY_CONTENT';
    if (!reason && prepared.some(other => other.identity === identity && other.hash !== hash)) {
      reason = 'SOURCE_IDENTITY_CONFLICT';
      if (!conflicts.some(conflict => conflict.key === identity)) conflicts.push({target: scope, key: identity, winningSourceId: null, losingSourceIds: prepared.filter(other => other.identity === identity).map(other => `source-${instructionHash(canonicalInstructionJson({identity, hash: other.hash})).slice(0,24)}`), resolution: 'SOURCE_IDENTITY_CONFLICT'});
    }
    if (!reason && seen.has(identity)) reason = 'DUPLICATE_SOURCE';
    if (!reason) seen.add(identity);
    const header = `[${source.type}; ${domain[source.type]}; priority=${rank}; scope=${scope}; source=${id}]\n`;
    const available = Math.max(0, Math.min(sourceLimit, remaining-Buffer.byteLength(header)-2));
    if (!reason && !available) reason = 'TOTAL_BUDGET_EXCLUDED';
    const text = reason ? '' : boundedText(source.content ?? '', available);
    const record: ManifestSource = {id,type:source.type,uri,revision,contentHash:hash,scope,audience:[...(source.audience ?? ['*'])].map(safe).sort(),domain:domain[source.type],precedence:rank,selection:reason?'EXCLUDED':'SELECTED',reason:reason ?? safe(source.reason ?? 'Applicable source selected by controller policy.'),originalBytes:source.content === undefined ? null : Buffer.byteLength(source.content),renderedBytes:Buffer.byteLength(text),renderedHash:reason?null:instructionHash(text),truncated:!reason && text !== source.content,skillId:source.skillId?safe(source.skillId):null,semanticAssessment:source.type === 'MEMORY' || source.type === 'CONTINUATION' || source.type === 'PROVIDER_OVERLAY' || source.type === 'PERSONA' ? 'NOT_PARSED':'BOUNDED_DIRECTIVES_ONLY'};
    if (reason) excluded.push(record);
    else {selected.push({record,text,depth}); remaining -= Buffer.byteLength(header)+record.renderedBytes+2;}
  }
  const decisions: EffectiveInstructionManifest['precedenceDecisions'] = [];
  const resolvedLines=new Map<string,string[]>();
  const assessedText=(item:typeof selected[number])=>item.record.truncated?item.text.slice(0,Math.max(0,item.text.lastIndexOf('\n'))):item.text;
  for (const target of targets) {
    const candidates = selected.filter(item => instructionScopeApplies(item.record.scope,target) && item.record.semanticAssessment === 'BOUNDED_DIRECTIVES_ONLY');
    const keys = [...new Set(candidates.flatMap(item => directives(assessedText(item)).map(d => d.key)))].sort();
    for (const key of keys) {
      const claims = candidates.flatMap(item => directives(assessedText(item)).filter(d => d.key === key).map(d => ({...item, value:d.value}))), first=claims[0]!;
      const peers=claims.filter(item => item.record.precedence===first.record.precedence && (item.record.type!=='REPOSITORY' || item.depth===first.depth));
      const ambiguous=new Set(peers.map(item=>item.value)).size>1;
      if (new Set(claims.map(item=>item.value)).size>1) conflicts.push({target,key,winningSourceId:ambiguous?null:first.record.id,losingSourceIds:claims.filter(item=>ambiguous || item.value!==first.value).map(item=>item.record.id),resolution:ambiguous?'UNRESOLVED_EQUAL_PRECEDENCE':'PRECEDENCE'});
      if (!ambiguous) {
        decisions.push({target,key,winningSourceId:first.record.id,winningValueHash:instructionHash(first.value),reason:'Higher source-class precedence; more-specific repository scope breaks repository ties.'});
        resolvedLines.set(first.record.id,[...(resolvedLines.get(first.record.id)??[]),`For target ${target}: instruction.${key}=${first.value}`]);
      }
    }
  }
  const rendered = selected.map(({record,text})=> {
    const context=record.semanticAssessment==='BOUNDED_DIRECTIVES_ONLY'?text.split('\n').filter(line=>directives(line).length===0).join('\n'):text;
    const resolved=[context,...(resolvedLines.get(record.id)??[])].filter(Boolean).join('\n');
    record.renderedBytes=Buffer.byteLength(resolved); record.renderedHash=instructionHash(resolved);
    return `[${record.type}; ${record.domain}; priority=${record.precedence}; scope=${record.scope}; source=${record.id}]\n${resolved}`;
  }).join('\n\n');
  const proposalTruncated=Buffer.byteLength(rendered)>maximumBytes;
  const proposedInstructions=boundedText(rendered,maximumBytes);
  if(proposalTruncated) warnings.push('Resolved rendering exceeds the total budget. Candidate was truncated; enforcement must remain disabled.');
  const currentHash=input.currentInstructions===undefined?null:instructionHash(input.currentInstructions), actualHash=input.actualInstructions===undefined?null:instructionHash(input.actualInstructions);
  if (excluded.some(item=>item.reason!=='DUPLICATE_SOURCE' && ['PLATFORM_POLICY','GOVERNANCE','USER_TASK'].includes(item.type)) || selected.some(item=>item.record.truncated && ['PLATFORM_POLICY','GOVERNANCE','USER_TASK'].includes(item.record.type))) warnings.push('A required high-precedence source was excluded or truncated. Enforcement must remain disabled.');
  const payload: Omit<EffectiveInstructionManifest,'id'|'hash'> = {schema:'agent-control.effective-instruction-manifest/v1',mode:'SHADOW',identity:JSON.parse(canonicalInstructionJson(input.identity)),repository:input.repository??null,targetPaths:targets,selectedSources:selected.map(item=>item.record),excludedSources:excluded,precedenceDecisions:decisions,conflicts,capabilities:negotiateInstructionCapabilities(input.requestedCapabilities??[...INSTRUCTION_CAPABILITIES],input.offers??[]),transformations:input.transformations??[],temporaryInstructionIds:selected.filter(item=>item.record.type==='TEMPORARY').map(item=>item.record.id),continuation:input.continuation??null,amendments:input.amendments??[],shadow:{currentHash,proposedHash:instructionHash(proposedInstructions),actualHash,proposalTruncated,comparison:currentHash===null?'UNOBSERVED':currentHash===instructionHash(proposedInstructions)?'EQUAL':'DIFFERENT',sourceCoverage:selected.map(item=>({sourceId:item.record.id,presentInCurrent:input.currentInstructions===undefined?null:input.currentInstructions.includes(item.text)})),applied:false},effectiveInstructionHash:actualHash,verification:{integrity:'VERIFIED',resolution:conflicts.some(item=>item.resolution!=='PRECEDENCE') || warnings.length>2?'FAIL':'PASS_WITH_LIMITATIONS',freeTextConflictCoverage:'NOT_EXHAUSTIVE',providerReceipt:'NOT_ATTESTED',warnings}};
  // Untrusted metadata must not turn provenance into a secret-bearing store.
  const serialized=canonicalInstructionJson(payload);
  if (redactSensitiveText(serialized)!==serialized) throw new Error('instruction_manifest_sensitive_metadata');
  const hash=instructionHash(serialized);
  return {manifest:{...payload,id:`instructions-${hash}`,hash},proposedInstructions};
}

export function verifyInstructionManifest(manifest: EffectiveInstructionManifest) {
  try {
  if(!validateManifestSchema(manifest))return false;
  const {id,hash,...payload}=manifest;
  return /^[a-f0-9]{64}$/.test(hash) && id===`instructions-${hash}` && instructionHash(canonicalInstructionJson(payload))===hash && manifest.schema==='agent-control.effective-instruction-manifest/v1' && manifest.mode==='SHADOW' && manifest.shadow.applied===false && Array.isArray(manifest.selectedSources) && Array.isArray(manifest.excludedSources) && typeof manifest.identity.parcelId==='string';
  } catch {return false;}
}

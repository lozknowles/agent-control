import type {ModelQualificationState} from './config.js';
import {probeCodexChatGptAuth, type CodexChatGptAuth} from './codex-exec-provider.js';
import type {AccountProfileQualificationRecord, ModelRegistry} from './model-registry.js';
import {resolveCodexAccountProfile} from './provider-account-profile.js';

export interface AccountProfileQualificationEvidence {
  schema: 'agent-control.account-profile-qualification/v1';
  providerId: string;
  accountProfileId: string;
  state: ModelQualificationState;
  startedAt: string;
  completedAt: string;
  checks: Array<{id: 'codex-chatgpt-auth'; passed: boolean}>;
  detail?: string;
}

export async function qualifyAccountProfile(input: {registry: ModelRegistry; providerId: string; accountProfileId: string; command?: string; cwd?: string; timeoutMs?: number; environment?: NodeJS.ProcessEnv; probe?: (command: string, cwd: string, timeoutMs: number, environment: NodeJS.ProcessEnv) => Promise<CodexChatGptAuth>; version?: string}) {
  const provider = input.registry.provider(input.providerId);
  if (!provider) throw new Error('provider_missing');
  const startedAt = new Date().toISOString(), version = input.version ?? `account-qualification-${startedAt.slice(0, 10)}`;
  input.registry.setAccountQualification({providerId: input.providerId, accountProfileId: input.accountProfileId, state: 'QUALIFYING', version, checkedAt: startedAt, capabilities: [], evidence: []});
  try {
    const resolved = resolveCodexAccountProfile(provider, input.accountProfileId, input.environment);
    await (input.probe ?? probeCodexChatGptAuth)(input.command ?? process.env.CODEX_COMMAND ?? 'codex', input.cwd ?? process.cwd(), input.timeoutMs ?? 30_000, resolved.environment);
    const completedAt = new Date().toISOString(), profileCapabilities = resolved.profile.capabilities ?? [];
    const record: AccountProfileQualificationRecord = {providerId: provider.id, accountProfileId: resolved.profile.id, state: 'QUALIFIED', version, checkedAt: completedAt, qualifiedAt: completedAt, capabilities: [...new Set([...profileCapabilities, 'codex-chatgpt-authenticated'])], evidence: ['codex-login-status:chatgpt']};
    input.registry.setAccountQualification(record);
    return {record, evidence: {schema: 'agent-control.account-profile-qualification/v1', providerId: provider.id, accountProfileId: resolved.profile.id, state: 'QUALIFIED', startedAt, completedAt, checks: [{id: 'codex-chatgpt-auth', passed: true}]} satisfies AccountProfileQualificationEvidence};
  } catch (error) {
    const completedAt = new Date().toISOString(), detail = safe(error);
    const record: AccountProfileQualificationRecord = {providerId: provider.id, accountProfileId: input.accountProfileId, state: 'FAILED', version, checkedAt: completedAt, capabilities: [], evidence: [], detail};
    input.registry.setAccountQualification(record);
    return {record, evidence: {schema: 'agent-control.account-profile-qualification/v1', providerId: provider.id, accountProfileId: input.accountProfileId, state: 'FAILED', startedAt, completedAt, checks: [{id: 'codex-chatgpt-auth', passed: false}], detail} satisfies AccountProfileQualificationEvidence};
  }
}

function safe(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /^(?:account_profile_[a-z_]+|codex_chatgpt_auth_required)$/.test(message) ? message : 'account_profile_qualification_failed';
}

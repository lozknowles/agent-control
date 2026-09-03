import fs from 'node:fs';
import path from 'node:path';
import type {ProviderAccountProfileConfig, ProviderConfig} from './config.js';

export interface ResolvedCodexAccountProfile {
  profile: ProviderAccountProfileConfig;
  environment: NodeJS.ProcessEnv;
}

/** Resolve one pre-authenticated Codex home for one child process without reading or copying its credentials. */
export function resolveCodexAccountProfile(provider: ProviderConfig, accountProfileId: string, environment: NodeJS.ProcessEnv = process.env): ResolvedCodexAccountProfile {
  if (provider.kind !== 'cli') throw new Error('account_profile_codex_provider_required');
  const profile = provider.accountProfiles?.find(value => value.id === accountProfileId);
  if (!profile) throw new Error('account_profile_missing');
  if (profile.enabled === false) throw new Error('account_profile_disabled');
  return resolveCodexAccountEnvironment(profile, environment);
}

export function resolveCodexAccountEnvironment(profile: ProviderAccountProfileConfig, environment: NodeJS.ProcessEnv = process.env, nodeId = profile.nodeId ?? 'controller'): ResolvedCodexAccountProfile {
  if (profile.credentialStore.type !== 'codex-home-env') throw new Error('account_profile_credential_store_unsupported');
  if (profile.nodeId && profile.nodeId !== nodeId) throw new Error('account_profile_remote_resolution_forbidden');
  const codexHome = environment[profile.credentialStore.env]?.trim();
  if (!codexHome) throw new Error('account_profile_authentication_required');
  if (!path.isAbsolute(codexHome)) throw new Error('account_profile_codex_home_must_be_absolute');
  let stat: fs.Stats;
  try { stat = fs.statSync(codexHome); } catch { throw new Error('account_profile_codex_home_unavailable'); }
  if (!stat.isDirectory()) throw new Error('account_profile_codex_home_unavailable');
  return {profile: structuredClone(profile), environment: {...environment, CODEX_HOME: codexHome}};
}

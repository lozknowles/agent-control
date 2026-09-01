import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {ModelConfig, ProviderConfig} from './config.js';

export interface MaterializedCodexModelConfig {codexHome: string; configFile: string; environment: NodeJS.ProcessEnv; cleanup(): void;}

export function materializeCodexModelConfig(provider: ProviderConfig, model: ModelConfig, environment: NodeJS.ProcessEnv = process.env): MaterializedCodexModelConfig {
  if (!provider.baseUrl) throw new Error('provider_base_url_required');
  if (provider.wireApi === 'chat-completions') throw new Error('codex_provider_wire_api_unsupported');
  const auth = provider.auth ?? (provider.credentialEnv ? {type: 'bearer-env' as const, env: provider.credentialEnv} : {type: 'none' as const});
  if (auth.type !== 'none' && (!auth.env || !environment[auth.env])) throw new Error('provider_authentication_required');
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-control-codex-provider-')), configFile = path.join(codexHome, 'config.toml');
  const providerId = `agent_control_${provider.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const lines = [
    `model = ${toml(model.providerModel)}`,
    `model_provider = ${toml(providerId)}`,
    'history.persistence = "none"',
    '',
    `[model_providers.${providerId}]`,
    `name = ${toml(provider.name ?? provider.id)}`,
    `base_url = ${toml(provider.baseUrl)}`,
    'wire_api = "responses"',
    ...(auth.type === 'none' ? [] : [`env_key = ${toml(auth.env!)}`]),
  ];
  fs.writeFileSync(configFile, `${lines.join('\n')}\n`, {mode: 0o600});
  return {codexHome, configFile, environment: {...environment, CODEX_HOME: codexHome}, cleanup: () => fs.rmSync(codexHome, {recursive: true, force: true})};
}
function toml(value: string) { return JSON.stringify(value); }

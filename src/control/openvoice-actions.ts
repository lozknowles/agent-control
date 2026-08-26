import {execFile} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {promisify} from 'node:util';
import {ActionFailure, ActionRegistry} from './job-runtime.js';

const execFileAsync = promisify(execFile);
export type OpenVoiceActionName = 'preflight' | 'install' | 'qualify-cpu' | 'qualify-gpu' | 'compare' | 'hygiene';
export interface OpenVoiceActionResult {ok: boolean; reportPath: string; report: Record<string, unknown>;}
export type OpenVoiceActionRunner = (action: OpenVoiceActionName, signal: AbortSignal) => Promise<OpenVoiceActionResult>;

function configuredRoot() {
  const configured = process.env.OPENVOICE_V2_INTEGRATION_ROOT;
  if (!configured || !path.isAbsolute(configured)) throw new ActionFailure('openvoice_integration_root_required', 'configuration');
  const root = fs.realpathSync(configured);
  if (!fs.existsSync(path.join(root, 'UPSTREAM.lock.json')) || !fs.existsSync(path.join(root, 'scripts', 'agent_control_entrypoint.py'))) throw new ActionFailure('openvoice_integration_marker_missing', 'configuration');
  return root;
}

export const runOpenVoiceAction: OpenVoiceActionRunner = async (action, signal) => {
  const root = configuredRoot(), python = process.env.AGENT_CONTROL_OPENVOICE_PYTHON || 'python3';
  let stdout = '';
  try {
    const result = await execFileAsync(python, [path.join(root, 'scripts', 'agent_control_entrypoint.py'), action], {
      cwd: root,
      env: {...process.env, OPENVOICE_V2_INTEGRATION_ROOT: root},
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 3 * 60 * 60 * 1000,
      signal,
    });
    stdout = String(result.stdout);
  } catch (error) {
    const value = error as Error & {stdout?: string; stderr?: string};
    const tail = `${value.stdout ?? ''}\n${value.stderr ?? ''}`.trim().split(/\r?\n/).slice(-8).join(' | ');
    throw new ActionFailure(`openvoice_${action}_failed:${tail || value.message}`.slice(0, 1200), 'execution');
  }
  const line = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
  if (!line) throw new ActionFailure(`openvoice_${action}_missing_result`, 'verification');
  let envelope: {ok?: boolean; report?: string};
  try { envelope = JSON.parse(line) as {ok?: boolean; report?: string}; }
  catch { throw new ActionFailure(`openvoice_${action}_invalid_result`, 'verification'); }
  if (!envelope.report || !path.isAbsolute(envelope.report) || !fs.existsSync(envelope.report)) throw new ActionFailure(`openvoice_${action}_report_missing`, 'verification');
  const report = JSON.parse(fs.readFileSync(envelope.report, 'utf8')) as Record<string, unknown>;
  if (envelope.ok !== true || report.ok !== true) throw new ActionFailure(`openvoice_${action}_not_verified`, 'verification');
  return {ok: true, reportPath: envelope.report, report};
};

const definitions: Array<{id: string; action: OpenVoiceActionName; verification: string; detail: string}> = [
  {id: 'openvoice.v2.preflight@1.0.0', action: 'preflight', verification: 'openvoice-preflight-safe', detail: 'OpenVoice host preflight recorded'},
  {id: 'openvoice.v2.install@1.0.0', action: 'install', verification: 'openvoice-install-verified', detail: 'OpenVoice isolated installation verified'},
  {id: 'openvoice.v2.cpu-qualify@1.0.0', action: 'qualify-cpu', verification: 'openvoice-cpu-smoke-pass', detail: 'OpenVoice CPU smoke evidence recorded'},
  {id: 'openvoice.v2.gpu-qualify@1.0.0', action: 'qualify-gpu', verification: 'openvoice-gpu-qualified-or-safely-skipped', detail: 'OpenVoice GPU outcome recorded'},
  {id: 'openvoice.v2.compare@1.0.0', action: 'compare', verification: 'openvoice-comparison-recorded', detail: 'CPU/GPU comparison recorded without subjective proof claim'},
  {id: 'openvoice.v2.hygiene@1.0.0', action: 'hygiene', verification: 'openvoice-repository-hygiene-pass', detail: 'OpenVoice repository exclusions verified'},
];

export function registerOpenVoiceActions(registry = new ActionRegistry(), runner: OpenVoiceActionRunner = runOpenVoiceAction) {
  for (const definition of definitions) registry.registerControl(definition.id, async context => {
    const result = await runner(definition.action, context.signal);
    return {
      artifacts: [{name: 'report', value: result.report}],
      evidence: [`${definition.detail}; external report ${result.reportPath}`],
      verification: [definition.verification],
      detail: definition.detail,
    };
  });
  return registry;
}

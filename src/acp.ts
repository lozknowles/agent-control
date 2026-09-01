import {Readable, Writable} from 'node:stream';
import path from 'node:path';
import {ndJsonStream} from '@agentclientprotocol/sdk';
import {createAcpRuntime} from './control/acp-runtime.js';
import {configPath, loadConfig} from './control/config.js';
import {IdentityControlPlane} from './control/identity-control-plane.js';
import {buildJobRuntime, startJobScheduler} from './control/job-bootstrap.js';
import {ModelQualificationStore, ModelRegistry} from './control/model-registry.js';

export async function runAcpStdio(environment: NodeJS.ProcessEnv = process.env) {
  const config = loadConfig(configPath(environment));
  const stateRoot = path.resolve(environment.AGENT_CONTROL_STATE_DIR || '.agent-control');
  const identities = new IdentityControlPlane(path.join(stateRoot, 'identity', 'control-plane.json'));
  const principalActorId = environment.AGENT_CONTROL_ACP_ACTOR_ID?.trim() || 'web-operator';
  try { identities.actor(principalActorId); }
  catch { throw new Error(`ACP identity admission failed: actor ${principalActorId} is not registered in ${stateRoot}`); }

  const models = new ModelRegistry(config.providers, config.models, config.modelRouting, new ModelQualificationStore(path.join(stateRoot, 'model-qualification.json')));
  const jobs = buildJobRuntime(config, stateRoot, undefined, undefined, models);
  const runtime = createAcpRuntime({
    identities,
    principalActorId,
    sessionFile: path.join(stateRoot, 'acp', `${principalActorId}.sessions.json`),
    execution: {
      submit: async input => {
        let parcel = jobs.workParcels.accept(input.prompt, input.actorId, [], input.attribution);
        if (parcel.attribution) { parcel.attribution.parcelId = parcel.id; parcel = jobs.workParcels.store.update(parcel); }
        return {parcelId: parcel.id, status: parcel.status};
      },
      cancel: input => { jobs.workParcels.cancel(input.parcelId, input.actorId); },
    },
  });
  const stopScheduler = startJobScheduler(jobs, undefined, 250, error => process.stderr.write(`Agent Control ACP scheduler: ${error.message}\n`));
  const output = Writable.toWeb(process.stdout) as WritableStream<Uint8Array>;
  const input = Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>;
  const connection = runtime.app.connect(ndJsonStream(output, input));
  const shutdown = () => connection.close();
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  try { await connection.closed; }
  finally { stopScheduler(); process.removeListener('SIGINT', shutdown); process.removeListener('SIGTERM', shutdown); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAcpStdio().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}

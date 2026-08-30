import assert from 'node:assert/strict';
import test from 'node:test';
import {deriveSystemReadiness} from './system-readiness.js';
import {ProviderRegistry} from './providers.js';
import type {WorkerRegistration} from './job-types.js';

const at = '2026-08-30T12:00:00.000Z';
const resource = {id: 'node-alpha', name: 'Node Alpha', platform: 'linux', transport: 'ssh', capabilities: ['remote.inspect']};
function worker(health: WorkerRegistration['health'], active = 0, capacity = 1): WorkerRegistration { return {id: 'node-alpha', capabilities: ['remote.inspect'], health, active, capacity, observedAt: at}; }
function machine(value?: WorkerRegistration) { return deriveSystemReadiness({resources: [resource], workers: value ? [value] : [], runs: [], invocations: []})[0]; }

test('registered reachable machine with execution capacity is AVAILABLE', () => { const value = machine(worker('healthy')); assert.equal(value.execution, 'AVAILABLE'); assert.equal(value.reachable, 'yes'); });
test('registered unreachable machine is OFFLINE', () => { const value = machine(worker('offline')); assert.equal(value.execution, 'OFFLINE'); assert.equal(value.reachable, 'no'); });
test('stale or unprobed machine remains UNKNOWN', () => { assert.equal(machine().execution, 'UNKNOWN'); });
test('partially usable machine is DEGRADED', () => { assert.equal(machine(worker('degraded')).execution, 'DEGRADED'); });
test('capacity exhausted machine is BUSY', () => { assert.equal(machine(worker('healthy', 1, 1)).execution, 'BUSY'); });

test('reachable provider with missing authentication is AUTH REQUIRED', () => {
  const providers = new ProviderRegistry(); providers.register({id:'ox',name:'Ox',kind:'responses',baseUrl:'http://provider.invalid/v1',requiresAuth:true,credentialConfigured:false,parallelism:1,costClass:'metered',capabilities:['model.execute'],qualificationModel:'ox-alpha',qualification:{status:'qualified'}}); providers.setHealth('ox','healthy','HTTP 200',12);
  const value = deriveSystemReadiness({providers,resources:[],workers:[],runs:[],invocations:[]})[0]; assert.equal(value.execution,'AUTH REQUIRED'); assert.equal(value.authentication,'required');
});

test('qualified reachable authenticated provider is AVAILABLE without exposing credential material', () => {
  const providers = new ProviderRegistry(); providers.register({id:'ox',name:'Ox',kind:'responses',requiresAuth:true,credentialConfigured:true,parallelism:1,costClass:'metered',capabilities:['model.execute'],qualificationModel:'ox-alpha',qualification:{status:'qualified'}}); providers.setHealth('ox','healthy','HTTP 200',8);
  const value = deriveSystemReadiness({providers,resources:[],workers:[],runs:[],invocations:[]})[0]; assert.equal(value.execution,'AVAILABLE'); assert.equal(value.authentication,'present'); assert.doesNotMatch(JSON.stringify(value),/token|password|secret|credentialConfigured/i);
});

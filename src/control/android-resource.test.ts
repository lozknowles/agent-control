import assert from 'node:assert/strict';
import test from 'node:test';
import {AndroidRecovery} from './android-recovery.js';

const fixture = (id: string, model: string) => ({
  id, platform: 'android' as const, transport: {type: 'ssh' as const, host: `${id}.example`, port: 9922, user: 'mobile'},
  capabilities: ['platform.android'], metadata: {model},
  android: {localHealthUrl: 'http://127.0.0.1:19088/health', remoteHealthUrl: 'http://127.0.0.1:19089/health', remoteDirectory: '~/agent-control', startCommand: './android/start-node.sh'},
});

test('two differently named Android devices use the same capability logic', () => {
  for (const resource of [fixture('android-test', 'Example One'), fixture('phone-other', 'Example Two')]) {
    const calls: string[] = [];
    const recovery = new AndroidRecovery(resource, '', false, undefined, (command, args) => {
      calls.push([command, ...args].join(' '));
      if (command === 'curl') return {status: 1} as any;
      if (args.at(-1) === 'echo AGENT-CONTROL-TRANSPORT-READY') return {status: 0} as any;
      return {status: 1} as any;
    });
    assert.equal(recovery.probe().state, 'node-degraded');
    assert.ok(calls.some(call => call.includes(resource.id)));
  }
});

test('non-SSH Android transport is represented honestly', () => {
  const resource = {...fixture('android-any', 'Example Three'), transport: {type: 'orca' as const}};
  assert.equal(new AndroidRecovery(resource, '', false).probe().state, 'unconfigured');
});

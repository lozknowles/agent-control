#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {formatAuthoritativeStatus, readAuthoritativeStatus, statusExitCode, StatusClientError} from './status-client.mjs';

const usage = `Agent Control command line

Usage:
  agent-control status [--json]

The status command reads the same authoritative projection as the web dashboard.
It uses the controller-local endpoint by default or the configured SSH transport
from the node's status-client configuration.`;

export async function main(argv = process.argv.slice(2), io = {out: console.log, error: console.error}) {
  const command = argv[0];
  if (command === '--help' || command === '-h') { io.out(usage); return 0; }
  if (command !== 'status') { io.error(usage); return 2; }
  const flags = new Set(argv.slice(1));
  if ([...flags].some(flag => !['--json'].includes(flag))) { io.error(usage); return 2; }
  try {
    const result = await readAuthoritativeStatus();
    io.out(flags.has('--json') ? JSON.stringify(result.snapshot, null, 2) : formatAuthoritativeStatus(result.snapshot, result.source).trimEnd());
    return statusExitCode(result.snapshot);
  } catch (error) {
    const item = error instanceof StatusClientError ? error : new StatusClientError('STATUS_FAILED', error instanceof Error ? error.message : String(error));
    if (flags.has('--json')) io.out(JSON.stringify({schema: 'agent-control.status-error/v1', result: 'UNREACHABLE', error: item.code, detail: item.message}, null, 2));
    else io.error(`AGENT CONTROL UNREACHABLE\n${item.code}: ${item.message}`);
    return 2;
  }
}

function isEntrypoint() {
  if (!process.argv[1]) return false;
  try { return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]); }
  catch { return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); }
}

if (isEntrypoint()) process.exitCode = await main();

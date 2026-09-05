import fs from 'node:fs';
import {buildGlancesRuntime, type GlancesNode} from '../src/control/glances-integration.js';
const [inventory, stateRoot, nodeId, operation, approval] = process.argv.slice(2);
if (!inventory || !stateRoot || !nodeId || !operation) throw new Error('Usage: glances-run.ts inventory state-root node operation [--approve-change]');
const node = (JSON.parse(fs.readFileSync(inventory, 'utf8')) as GlancesNode[]).find(n => n.id === nodeId);
if (!node) throw new Error('node_not_in_approved_inventory');
const runtime = buildGlancesRuntime([node], stateRoot);
const change = !['inspect', 'qualify'].includes(operation);
const run = runtime.createRun(`glances-${node.id}-${change ? 'change' : 'inspect'}@1.0.0`, {operation}, {type: 'manual', actor: 'operator-authorized-glances-rollout'});
await runtime.tick();
if (change && approval === '--approve-change') { runtime.approve(run.id, 'monitoring.glances.change'); await runtime.tick(); }
const completed = runtime.ledger.get(run.id)!;
process.stdout.write(JSON.stringify({id: completed.id, status: completed.status, errors: completed.errors, steps: completed.steps, artifacts: completed.artifacts.map(id => ({id, value: runtime.artifacts.read(id)}))}, null, 2) + '\n');
if (completed.status !== 'SUCCEEDED') process.exitCode = 1;

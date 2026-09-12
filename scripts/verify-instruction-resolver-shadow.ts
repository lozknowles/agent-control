import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {verifyInstructionManifest} from '../src/control/instruction-resolver.js';

const root=process.cwd(), evidence=path.join(root,'docs/evidence/instruction-resolver-shadow');
const bundle=JSON.parse(fs.readFileSync(path.join(evidence,'evidence-manifest.json'),'utf8'));
assert.equal(bundle.schema,'agent-control.instruction-evidence-bundle/v1');
for(const item of bundle.files as Array<{path:string;sha256:string}>) {
  const file=path.resolve(root,item.path);
  assert.ok(file.startsWith(`${root}${path.sep}`) && !path.isAbsolute(item.path),'Evidence path escaped repository');
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),item.sha256,`Evidence hash mismatch: ${item.path}`);
}
const comparisons=JSON.parse(fs.readFileSync(path.join(evidence,'shadow-comparisons.json'),'utf8'));
assert.equal(comparisons.mode,'AUTOMATED_ONLY');assert.equal(comparisons.cases.length,8);
for(const item of comparisons.cases) {
  assert.equal(item.physicalExecution,false);assert.ok(verifyInstructionManifest(item.manifest));
  assert.equal(item.status,item.manifest.verification.resolution);assert.equal(item.manifest.effectiveInstructionHash,null);
}
const physical=JSON.parse(fs.readFileSync(path.join(evidence,'physical-matrix.json'),'utf8'));
assert.equal(physical.results.length,32);assert.equal(physical.physicalModelExecutionCount,0);
assert.ok(physical.results.every((item:{status:string;executionAttempted:boolean})=>item.status==='BLOCKED' && !item.executionAttempted));
assert.equal(physical.realAcceptanceJobId,null);assert.equal(physical.videoPath,null);
const check=fs.readFileSync(path.join(evidence,'full-check.txt'),'utf8');
assert.match(check,/ℹ tests 1179\n/);assert.match(check,/ℹ pass 1179\n/);assert.match(check,/ℹ fail 0\n/);
process.stdout.write(JSON.stringify({status:'PASS',hashedFiles:bundle.files.length,automatedTests:1179,shadowFixtures:8,physicalExecutions:0,physicalStatus:'BLOCKED',recommendation:'EXPERIMENTAL — NOT RELEASE READY'},null,2)+'\n');

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('qualification/agent-control-4.5-release-gate-completion-20260912');
const report=read('release-gate.json'),matrix=read('memory-matrix.json'),manifest=read('evidence-manifest.json');
assert.equal(report.recommendation,'EXPERIMENTAL');
assert.deepEqual(report.releaseActions,{merge:false,tag:false,release:false,deploy:false});
assert.equal(report.validation.fullSuite.passed,1157);
assert.ok(report.gates.some(g=>g.name==='MSI cross-node memory transition'&&g.status==='PROVEN'));
assert.ok(report.gates.some(g=>g.name==='Strong-model memory consolidation'&&g.status==='PROVEN'));
assert.ok(report.gates.some(g=>g.name==='Specialist-model energy advantage'&&g.status==='DISPROVEN'));
assert.ok(report.gates.some(g=>g.name==='Whole-node power claim'&&g.status==='BLOCKED'));
assert.equal(matrix.historicalTwelveCellReconciliation.passed,9);
assert.equal(matrix.contract.verificationWeakened,false);
for(const item of manifest.files){const value=fs.readFileSync(path.join(root,item.file));assert.equal(value.length,item.bytes,item.file);assert.equal(createHash('sha256').update(value).digest('hex'),item.sha256,item.file);}
console.log(JSON.stringify({verdict:'PASS_INDEPENDENT_COMPLETION_EVIDENCE_VERIFICATION',implementationHead:report.implementationHead,files:manifest.files.length,recommendation:report.recommendation},null,2));
function read(file){return JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));}

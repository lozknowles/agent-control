import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {assessRelease,type CoreReceipt} from '../src/control/release-readiness.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(file:string)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const files=execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(p=>p&&!p.startsWith('docs/')&&!p.startsWith('examples/')&&!/\.md$/i.test(p));
const sourceDigest=createHash('sha256').update(JSON.stringify(files.sort().map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]))).digest('hex');
if(process.argv.includes('--source-digest')){console.log(sourceDigest);process.exit(0);}
const finalReceipt='examples/showcase-4.6/final-release/core-receipt.json';
const file=fs.existsSync(path.join(root,finalReceipt))?finalReceipt:'examples/showcase-4.6/release-integration/core-receipt.json',version=read('package.json').version;
const receipt:CoreReceipt=fs.existsSync(path.join(root,file))?read(file):{version,sourceDigest:'UNVERIFIED',checks:{}};
const invalid:string[]=[];
for(const check of Object.values(receipt.checks))for(const file of check?.evidence??[]){const resolved=path.resolve(root,file);if(!resolved.startsWith(root+path.sep)||!fs.existsSync(resolved))invalid.push(file);}
const classification=read('examples/showcase-4.6/known-limitations.json');
for(const item of classification.items)for(const file of item.evidence){const resolved=path.resolve(root,file);if(!resolved.startsWith(root+path.sep)||!fs.existsSync(resolved))invalid.push(file);}
const showcase=read('examples/showcase-4.6/release-integration/scope.json');
const report=assessRelease(classification,receipt,{version,sourceDigest},showcase.showcase);
if(invalid.length){report.coreRelease='FAIL';report.releaseBlockers.push(...invalid.map(f=>'EVIDENCE_MISSING:'+f));}
console.log(JSON.stringify({schema:'agent-control.release-rc/v1',version,sourceDigest,...report,subsystems:showcase.subsystems},null,2));
if(report.coreRelease!=='PASS')process.exitCode=1;

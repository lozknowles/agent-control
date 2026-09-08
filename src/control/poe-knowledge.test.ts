import assert from 'node:assert/strict';
import test from 'node:test';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {PoeKnowledgeService} from './poe-knowledge.js';
test('knowledge retrieves bounded approved documentation with exact revision and live source hashes',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'poe-knowledge-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'docs'));fs.writeFileSync(path.join(root,'docs/models.md'),'# Models\n\nModels are chosen through configured routing.\n\nUNRELATED '.repeat(300));
 const service=new PoeKnowledgeService({root,version:'4.test',revision:()=>({commit:'a'.repeat(40),dirty:false}),configuration:()=>({route:'approved'}),sources:[{id:'models',path:'docs/models.md',terms:['models']}],live:()=>({models:[],availability:'unknown'})});
 const answer=service.enrich('Which models are available?');assert.ok(answer.facts.some(f=>f.informationKind==='LIVE_OBSERVED'&&f.evidence[0]?.includes('sha256:')));const doc=answer.facts.find(f=>f.label==='Documentation: models')!;assert.match(String(doc.value),/UNTRUSTED_REFERENCE_DATA/);assert.ok(String(doc.value).length<3300);assert.equal(service.projection().commit,'a'.repeat(40));
});
test('knowledge refresh invalidates hashes and removes stale deleted sources',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'poe-knowledge-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'docs'));const file=path.join(root,'docs/source.md');fs.writeFileSync(file,'Version one');let revision='a'.repeat(40);
 const service=new PoeKnowledgeService({root,version:'test',revision:()=>({commit:revision,dirty:false}),configuration:()=>({}),sources:[{id:'source',path:'docs/source.md',terms:['source']}],live:()=>({})});const first=service.projection();fs.writeFileSync(file,'Version two');revision='b'.repeat(40);const second=service.projection();assert.notEqual(first.indexHash,second.indexHash);assert.notEqual(first.sources[0]?.hash,second.sources[0]?.hash);fs.unlinkSync(file);assert.equal(service.source('source').available,false);assert.doesNotMatch(service.source('source').text,/Version two/);
});
test('knowledge cannot escape the allowlisted documentation root',()=>{assert.throws(()=>new PoeKnowledgeService({root:process.cwd(),version:'test',revision:()=>({commit:'a',dirty:false}),configuration:()=>({}),sources:[{id:'bad',path:'../private.md',terms:['secret']}],live:()=>({})}),/not_approved/)});
test('unknown knowledge remains unavailable and never implies an action',t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'poe-knowledge-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const service=new PoeKnowledgeService({root,version:'test',revision:()=>({commit:'a',dirty:false}),configuration:()=>({}),sources:[],live:()=>({})});assert.ok(service.enrich('Can you predict next lottery numbers?').unavailable);});

test('approved documentation symlink cannot retrieve outside repository',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'poe-link-')),outside=fs.mkdtempSync(path.join(os.tmpdir(),'poe-outside-'));t.after(()=>{fs.rmSync(root,{recursive:true,force:true});fs.rmSync(outside,{recursive:true,force:true});});fs.mkdirSync(path.join(root,'docs'));fs.writeFileSync(path.join(outside,'reference.md'),'OUTSIDE_REFERENCE');fs.symlinkSync(path.join(outside,'reference.md'),path.join(root,'docs/link.md'));
 const service=new PoeKnowledgeService({root,version:'test',revision:()=>({commit:'a',dirty:false}),configuration:()=>({}),sources:[{id:'link',path:'docs/link.md',terms:['link']}],live:()=>({})});assert.equal(service.source('link').available,false);assert.doesNotMatch(service.source('link').text,/OUTSIDE_REFERENCE/);
});

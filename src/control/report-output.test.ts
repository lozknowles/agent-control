import test from 'node:test';import assert from 'node:assert/strict';
import {renderReportOutput,reportOutputCatalogue,validateReportProfiles,reportDigest,type ReportSource} from './report-output.js';
const source=():ReportSource=>({id:'run-1',jobId:'review',title:'Review',status:'SUCCEEDED_WITH_FINDINGS',recordedAt:'2026-09-14T10:00:00Z',result:{executiveSummary:'One correction required.',findings:[{title:'Check access',severity:'high',suggestedRemediation:'Require ownership.',validation:{state:'VALID'}}],areasNotReviewed:['Physical phone']},history:{content:'# Exact history\nRaw input and output.',sha256:'original'},events:[{id:'event-1',at:'2026-09-14',type:'complete'}],operations:[{id:'op-1'}],limitations:['Cost unavailable.']});
test('default and custom catalogue profiles preserve explicit default and reject invalid declarations',()=>{
 assert.equal(reportOutputCatalogue(source()).defaultProfile,'simple');assert.equal(validateReportProfiles([{id:'executive',label:'Executive',view:'simple',format:'text',default:true}])[0].id,'executive');
 for(const v of [[],[{id:'../evil',label:'Bad',view:'simple',format:'markdown'}],[{id:'x',label:'X',view:'simple',format:'pdf'}],[{id:'x',label:'X',view:'simple',format:'text',default:true},{id:'y',label:'Y',view:'evidence',format:'json',default:true}]])assert.throws(()=>validateReportProfiles(v));
});
test('one source produces stable independent simple detailed evidence views without mutation or execution',()=>{
 const original=source(),before=structuredClone(original),a=renderReportOutput(original),b=renderReportOutput(original,'detailed'),c=renderReportOutput(original,'evidence');
 assert.deepEqual(original,before);assert.equal(a.sourceSha256,b.sourceSha256);assert.equal(b.sourceSha256,c.sourceSha256);assert.equal(a.runId,'run-1');assert.equal(b.runId,c.runId);assert.equal(renderReportOutput(original).sha256,a.sha256);
 assert.match(a.content,/One correction required/);assert.match(a.content,/Physical phone/);assert.match(b.content,/suggestedRemediation/);assert.deepEqual(JSON.parse(c.content).source.result,original.result);assert.equal(JSON.parse(c.content).source.history.content,original.history.content);
 assert.equal(a.sha256,reportDigest(a.content));
});
test('redaction and safe filenames apply to every profile and format',()=>{
 const s=source();s.jobId='../../host\r\nInjected: value';s.result={executiveSummary:'password=private-value Bearer fake-token',apiKey:'sk-aaaaaaaaaaaaaaaaaaaa'};s.history.content='password=private-value';
 for(const p of ['simple','detailed','evidence']){const out=renderReportOutput(s,p);assert.doesNotMatch(out.content,/private-value|fake-token|sk-aaaaaaaa/);assert.match(out.filename,/^[A-Za-z0-9_-]+\.(md|json)$/);}
 assert.equal(renderReportOutput(s,'simple','text').mime,'text/plain');assert.throws(()=>renderReportOutput(s,'missing'));assert.throws(()=>renderReportOutput(s,'simple','pdf'));
});
test('transcript requirements retain source uncertainty in detailed evidence without fabricated difficulty',()=>{
 const s=source();s.result={summary:'Clarify two requests.',transcripts:[{raw:'[unclear] form',normalised:'[unclear] form',confidence:null}],requirements:[{id:'R01',request:'Change form'}]};
 assert.match(renderReportOutput(s).content,/Not assessed/);assert.match(renderReportOutput(s,'detailed').content,/\[unclear\]/);assert.equal(JSON.parse(renderReportOutput(s,'evidence').content).source.result.transcripts[0].raw,'[unclear] form');
});
test('missing result never becomes an invented successful analysis',()=>{const s=source();delete s.result;s.status='FAILED';assert.match(renderReportOutput(s).content,/FAILED/);assert.match(renderReportOutput(s).content,/No structured conclusion/);});

test('evidence remains valid JSON after credential redaction and preserves safe transcript whitespace',()=>{const s=source();s.result={summary:'password=hidden-value',email:'person@example.invalid'};s.history.content='  source line\n\n';const evidence=JSON.parse(renderReportOutput(s,'evidence').content);assert.equal(evidence.source.history.content,s.history.content);assert.equal(evidence.source.result.email,'[REDACTED]');assert.doesNotMatch(JSON.stringify(evidence),/hidden-value/);});

test('assessed requests appear once in Simple and Detailed keeps readable reasoning plus canonical result',()=>{const s=source();s.result={executiveSummary:'A moderate request.',findings:[{title:'Export a log',category:'difficulty:MODERATE',reasoning:'The current export is on demand.',suggestedRemediation:'Define the event contract.',validation:{state:'VALID'}}]};const simple=renderReportOutput(s).content,detailed=renderReportOutput(s,'detailed').content;assert.equal(simple.split('Export a log').length-1,1);assert.match(simple,/MODERATE \/ VALID/);assert.match(detailed,/### 1. Export a log/);assert.match(detailed,/The current export is on demand/);assert.match(detailed,/Complete recorded result/);});

test('schema-compatible explicit difficulty title suffix renders without guessing from severity',()=>{const s=source();s.result={findings:[{title:'Write a log — difficulty:MODERATE',category:'other',severity:'high',validation:{state:'VALID'}}]};assert.match(renderReportOutput(s).content,/Write a log \| MODERATE \/ VALID/);assert.doesNotMatch(renderReportOutput(s).content,/difficulty:MODERATE/);});

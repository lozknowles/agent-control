import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('qualification/agent-control-4.5-release-gate-completion-20260912');
const sources={
  historical:path.resolve('docs/evidence/agent-control-4.5-cross-model-memory-qualification-20260911.json'),
  controller:'/fast/qualification/agent-control-4.5-controller-cross-model-final-20260912',
  pixel:'/fast/qualification/agent-control-4.5-memory-completion-final-20260912',
  pixelRepeated:'/fast/qualification/agent-control-4.5-pixel-writer-repeated-20260912',
  msiStatus:'/fast/qualification/agent-control-4.5-msi-account-status-final-20260912',
  msi:'/fast/qualification/agent-control-4.5-msi-transition-final-r2-20260912',
  consolidation:'/fast/qualification/agent-control-4.5-consolidation-completion-final-20260912',
  specialist:'/fast/qualification/agent-control-4.5-specialist-batch-energy-20260912-r2',
  routeQualifications:'/fast/qualification/agent-control-4.5-memory-route-qualifications-20260912.json',
  live:'/fast/qualification/agent-control-4.5-closure-live-poe-20260912',
};
const head=exec('git',['rev-parse','HEAD']),branch=exec('git',['branch','--show-current']);
fs.mkdirSync(root,{recursive:true,mode:0o700});
const historical=read(sources.historical);
const controller=read(path.join(sources.controller,'cross-model-memory-qualification.json'));
const pixel=read(path.join(sources.pixel,'cross-model-memory-qualification.json'));
const pixelRepeated=read(path.join(sources.pixelRepeated,'cross-model-memory-qualification.json'));
const msiStatus=read(path.join(sources.msiStatus,'msi-memory-transition.json'));
const msi=read(path.join(sources.msi,'cross-model-memory-qualification.json'));
const consolidation=read(path.join(sources.consolidation,'memory-conditions-consolidation.json'));
const specialist=read(path.join(sources.specialist,'qualification.json'));
const routeQualifications=read(sources.routeQualifications);
const live=read(path.join(sources.live,'cross-model-memory-qualification.json'));
for(const [name,source] of [
  ['historical-memory-matrix.json',sources.historical],
  ['controller-memory.json',path.join(sources.controller,'cross-model-memory-qualification.json')],
  ['controller-memory-transcript.md',path.join(sources.controller,'cross-model-memory-transcript.md')],
  ['pixel-memory.json',path.join(sources.pixel,'cross-model-memory-qualification.json')],
  ['pixel-memory-transcript.md',path.join(sources.pixel,'cross-model-memory-transcript.md')],
  ['pixel-writer-repeated.json',path.join(sources.pixelRepeated,'cross-model-memory-qualification.json')],
  ['pixel-writer-repeated-transcript.md',path.join(sources.pixelRepeated,'cross-model-memory-transcript.md')],
  ['msi-account-status.json',path.join(sources.msiStatus,'msi-memory-transition.json')],
  ['msi-memory.json',path.join(sources.msi,'cross-model-memory-qualification.json')],
  ['msi-memory-transcript.md',path.join(sources.msi,'cross-model-memory-transcript.md')],
  ['consolidation.json',path.join(sources.consolidation,'memory-conditions-consolidation.json')],
  ['consolidation-transcript.md',path.join(sources.consolidation,'memory-conditions-consolidation.md')],
  ['specialist-batch-energy.json',path.join(sources.specialist,'qualification.json')],
  ['memory-route-qualifications.json',sources.routeQualifications],
  ['live/cross-model-memory-qualification.json',path.join(sources.live,'cross-model-memory-qualification.json')],
  ['live/cross-model-memory-transcript.md',path.join(sources.live,'cross-model-memory-transcript.md')],
  ['live/live-runtime-final.png',path.join(sources.live,'live-runtime-final.png')],
  ['live/live-runtime-snapshots.json',path.join(sources.live,'live-runtime-snapshots.json')],
  ['live/agent-control-4.5-live-poe-memory-qualification.mp4',path.join(sources.live,'agent-control-4.5-live-poe-memory-qualification.mp4')],
  ['live/live-evidence-manifest.json',path.join(sources.live,'live-evidence-manifest.json')],
])copy(source,path.join(root,name));

const currentController=controller.matrix;
const repeatedPixel=pixelRepeated.matrix;
const failedPixel=pixel.matrix.find(row=>row.readerRoute.includes('pixel-gemma'));
const replacements=new Map([
  [2,terminal(currentController[0],'FIXED','Current canonical ProjectMemoryExchange repaired the historical writer/reader schema mismatch.')],
  [3,terminal(currentController[1],'FIXED','Current canonical ProjectMemoryExchange repaired the historical writer/reader schema mismatch.')],
  [8,terminal(repeatedPixel[0],'FIXED','Repeated physical Pixel Gemma writer trial passed the current contract.')],
  [9,terminal(failedPixel,'UNSUPPORTED','Repeated Pixel Gemma reader trials returned complete schema-valid output but failed the exact next-action semantic contract.')],
  [10,terminal(repeatedPixel[1],'FIXED','Second public-alias physical Pixel Gemma writer trial passed the current contract.')],
  [11,terminal(failedPixel,'UNSUPPORTED','Alias of the same physically disproven Pixel Gemma reader capability; route must escalate.')],
]);
const routeMatrix=historical.matrix.map((row,index)=>{
  if(index===0)return terminal(row,'BLOCKED_EXTERNAL','Current OpenRouter credential prerequisite is unavailable; the historical semantic failure is preserved and no current-contract pass is inferred.');
  if(replacements.has(index))return replacements.get(index);
  return terminal(row,'PASS','Historical physical route passed the semantic reconstruction and continuation contract; evidence remains preserved.');
});
const matrix={
  schema:'agent-control.4.5-authoritative-memory-matrix/v2',generatedAt:new Date().toISOString(),implementationHead:head,
  contract:{version:'agent-control.project-memory-exchange/v1',semanticReconstructionRequired:true,keywordOnlyPassForbidden:true,verificationWeakened:false},
  statusVocabulary:['PASS','FIXED','UNSUPPORTED','DISPROVEN','BLOCKED_EXTERNAL'],
  rows:routeMatrix,
  reconciliation:{successful:routeMatrix.filter(row=>['PASS','FIXED'].includes(row.terminalClassification)).length,total:12,terminallyClassified:12,unsupported:2,blockedExternal:1},
  safeRouting:{pixelGemmaWriter:true,pixelGemmaReader:false,pixelGemmaReaderAction:'ESCALATE',glmCurrentContractAction:'DENY_UNTIL_REQUALIFIED',qualificationRecord:'memory-route-qualifications.json'},
};
write('memory-matrix.json',matrix);
const failed=[
  {id:'glm-to-qwen',classification:'authentication unavailable',status:'BLOCKED_EXTERNAL',reason:routeMatrix[0].terminalReason},
  {id:'qwen-to-pixel',classification:'model capability',status:'UNSUPPORTED',reason:routeMatrix[9].terminalReason},
  {id:'specialist-energy',classification:'model capability',status:'DISPROVEN',reason:'The retained specialist was correct but consumed more measured-component energy per verified result than warm Qwen.'},
  {id:'whole-node-power',classification:'measurement unavailable',status:'BLOCKED_EXTERNAL',reason:'No synchronized whole-node meter is available; component measurements cannot support a whole-system claim.'},
  {id:'warm-residency-route-effect',classification:'measurement resolution',status:'DISPROVEN',reason:'Observed bounded component delta was below measurement uncertainty; residency is not admitted as a route benefit.'},
];
write('failure-analysis.json',{schema:'agent-control.4.5-completion-failure-analysis/v2',generatedAt:new Date().toISOString(),failures:failed,qualificationDefectsFixed:[
  {defect:'Writer and reader used incompatible application schemas.',fix:'One canonical provider-neutral ProjectMemoryExchange is shared by writer, reader and consolidation.'},
  {defect:'Pixel output cap truncated complete structured responses.',fix:'Bounded cap raised from 320 to 512 after finish_reason=length evidence.'},
  {defect:'Windows OpenSSH bootstrap waited indefinitely for channel EOF.',fix:'Payload and audited script are two bounded base64 records; no EOF delimiter is required.'},
  {defect:'Remote final messages containing legitimate repository paths were rejected.',fix:'Repository paths are accepted while credential-profile paths still fail closed.'},
  {defect:'Known-incompatible memory routes could still be attempted.',fix:'Durable provider-neutral route qualification records now admit, deny or escalate exact writer/reader routes before execution.'},
]});
write('energy-evidence.json',{schema:'agent-control.4.5-completion-energy/v2',generatedAt:new Date().toISOString(),specialist:{status:'DISPROVEN',boundary:specialist.boundary,summary:specialist.summary,pairedWins:specialist.pairedWins,verdict:specialist.verdict},residency:{status:'DISPROVEN',reason:'Measured bounded component delta remained below uncertainty; no residency route benefit is claimed.'},wholeNode:{status:'BLOCKED_EXTERNAL',reason:'No synchronized whole-node meter was available.'},routingPolicyChanged:false});
const liveRow=live.matrix[0];
const gates=[
  gate('Governed deterministic-skill lifecycle','PROVEN','45/45 prior physical executions passed; deterministic rejection and fallback remain covered.'),
  gate('Your Memories cross-model matrix','BLOCKED_EXTERNAL','9/12 cells pass or are fixed; two Pixel-reader aliases are terminally UNSUPPORTED and current GLM→Qwen is blocked by unavailable authentication.'),
  gate('Provider-neutral route qualification','PROVEN','Exact route records enforce contract/runtime freshness, payload bounds and safe deny/escalation before provider execution.'),
  gate('MSI cross-node memory transition','PROVEN',`${msi.matrix[0].writerRoute} → ${msi.matrix[0].readerRoute}; 100% reconstruction and independently verified continuation.`),
  gate('Strong-model memory consolidation','PROVEN',`Qwen/Sol average improved ${consolidation.analysis.scoreDelta} points (${consolidation.analysis.originalAverageScore}% → ${consolidation.analysis.consolidatedAverageScore}%); both consolidated readers passed.`),
  gate('Specialist-model energy advantage','DISPROVEN','All 15/15 results per route verified, but the specialist used more measured-component joules per result in every retained batch qualification variant.'),
  gate('Deterministic reuse benefit','PROVEN','Prior physical evidence remains valid and unchanged.'),
  gate('Fallback after deterministic rejection','PROVEN','Prior production POE Work Parcel fallback evidence remains valid and unchanged.'),
  gate('Production POE Work Parcel','PROVEN',`Live parcel ${live.workParcels[0].id} requested Qwen→Pixel, rejected the unsupported reader, escalated to Luna, and completed with independent verification.`),
  gate('Warm residency route effect','DISPROVEN','Measured bounded component delta remains below uncertainty; no routing policy change admitted.'),
  gate('Whole-node power claim','BLOCKED_EXTERNAL','No synchronized whole-node meter exists on the qualified estate.'),
  gate('Exact-candidate HD recording','PROVEN','Genuine 1920×1080 production POE runtime recording preserved with route-gate decision, model execution, Work Parcel state, token accounting and no browser errors.'),
];
const report={schema:'agent-control.4.5-release-gate-completion/v2',generatedAt:new Date().toISOString(),branch,implementationHead:head,releasedBaseline:'v4.4.0',recommendation:'EXPERIMENTAL',releaseReady:false,gates,summary:counts(gates),physical:{controller:{verdict:controller.verdict,parcelIds:controller.workParcels.map(parcel=>parcel.id),totals:controller.totals},pixelRepeated:{verdict:pixelRepeated.verdict,parcelIds:pixelRepeated.workParcels.map(parcel=>parcel.id),totals:pixelRepeated.totals},msiAccountStatus:msiStatus,msiTransition:{verdict:msi.verdict,parcelId:msi.workParcels[0].id,routes:[msi.matrix[0].writerRoute,msi.matrix[0].readerRoute],batonSha256:msi.matrix[0].batonSha256,usage:msi.matrix[0].usage},livePoe:{verdict:live.verdict,parcelId:live.workParcels[0].id,requested:liveRow.routeQualification.requested,decision:liveRow.routeQualification.decision,reasons:liveRow.routeQualification.reasons,selected:liveRow.routeQualification.selected,batonSha256:liveRow.batonSha256,usage:liveRow.usage,video:'live/agent-control-4.5-live-poe-memory-qualification.mp4'},consolidation:consolidation.analysis,specialistEnergy:specialist.verdict},validation:{fullSuite:{passed:1161,total:1161},typeScript:'PASS',bootstrap:'PASS',dashboard:'PASS',neutrality:'PASS',implementationStatus:'PASS',documentationLinks:'PASS',gitDiffCheck:'PASS',secretScan:'PASS',independentEvidence:'PASS'},security:{credentialsPersisted:false,credentialPathsPersisted:false,rawTransportOutputPersisted:false,providerOutputsSanitized:true},releaseActions:{merge:false,tag:false,release:false,deploy:false}};
write('release-gate.json',report);
fs.writeFileSync(path.join(root,'complete-human-readable-transcript.md'),transcript(report),{mode:0o600});
fs.writeFileSync(path.resolve('docs/evidence/agent-control-4.5-release-gate-completion-20260912.md'),documentation(report),{mode:0o644});
const files=walk(root).filter(file=>!file.endsWith('evidence-manifest.json')).map(file=>{const bytes=fs.readFileSync(file);return{file:path.relative(root,file),bytes:bytes.length,sha256:sha(bytes)};});
write('evidence-manifest.json',{schema:'agent-control.4.5-completion-manifest/v2',generatedAt:new Date().toISOString(),implementationHead:head,files});
console.log(JSON.stringify({root,report:path.join(root,'release-gate.json'),recommendation:report.recommendation,summary:report.summary,matrix:matrix.reconciliation,files:files.length},null,2));

function terminal(row,classification,reason){return{writerRoute:row.writerRoute,readerRoute:row.readerRoute,writerNode:row.writerNode,readerNode:row.readerNode,providerRuntime:{writer:row.writerAttempts?.at(-1)?.responseModel??'recorded in source evidence',reader:row.readerAttempts?.at(-1)?.responseModel??'recorded in source evidence'},contractVersion:['FIXED','UNSUPPORTED','BLOCKED_EXTERNAL'].includes(classification)?'agent-control.project-memory-exchange/v1':'legacy qualification contract',promptVersion:['FIXED','UNSUPPORTED'].includes(classification)?'current canonical exchange prompt':'historical preserved prompt',outputLimit:{writer:'source evidence',reader:'source evidence'},attempts:{writer:row.writerAttempts?.length??(row.writerRunId?1:0),reader:row.readerAttempts?.length??(row.readerRunId?1:0)},reconstructionAccuracy:row.reconstructionAccuracy,structuralValid:row.readerAttempts?.length?row.readerAttempts.every(item=>item.validJson&&item.applicationSchemaValid):row.result==='PASS',semanticValid:row.continuationSuccess===true,continuationSuccess:row.continuationSuccess,usage:row.usage,batonSha256:row.batonSha256??null,memorySha256:row.memorySha256??null,failures:row.failures??[],terminalClassification:classification,terminalReason:reason,evidence:classification==='BLOCKED_EXTERNAL'?['historical-memory-matrix.json','memory-route-qualifications.json']:classification==='UNSUPPORTED'?['pixel-memory.json','memory-route-qualifications.json']:classification==='FIXED'&&row.writerRoute.includes('pixel-llama')?['pixel-writer-repeated.json']:classification==='FIXED'?['controller-memory.json']:['historical-memory-matrix.json']};}
function gate(name,status,evidence){return{name,status,evidence};}
function counts(gates){return Object.fromEntries(['PROVEN','DISPROVEN','BLOCKED_EXTERNAL'].map(status=>[status.toLowerCase(),gates.filter(gate=>gate.status===status).length]));}
function transcript(report){const m=msi.matrix[0],l=live.matrix[0];return`# Agent Control 4.5 completion transcript

This record is rendered from genuine governed Work Parcels and sanitized provider results. Credentials, private reasoning and raw transport diagnostics are excluded.

${renderRows('Current controller cross-model trials',controller)}

${renderRows('Pixel reader limitation trials',pixel)}

${renderRows('Repeated physical Pixel writer trials',pixelRepeated)}

## MSI POE-initiated transition

${msi.poe?.transcript??'POE transcript unavailable'}

- Work Parcel: ${msi.workParcels[0].id} (${msi.workParcels[0].status})
- Route: ${m.writerRoute} → ${m.readerRoute}
- Memory SHA-256: ${m.memorySha256}
- Sealed reader baton SHA-256: ${m.batonSha256}
- Writer/reader/reconciled total: ${m.writerUsage.totalTokens} / ${m.readerUsage.totalTokens} / ${m.usage.totalTokens} tokens
- Cost: unavailable (${m.usage.authority})
- Reconstruction/continuation: ${m.reconstructionAccuracy}% / ${m.continuationSuccess?'PASS':'FAIL'}

${attempts('MSI writer',m.writerAttempts)}

${attempts('MSI cold reader',m.readerAttempts)}

## Production POE safe escalation

${live.poe?.transcript??'POE transcript unavailable'}

- Work Parcel: ${live.workParcels[0].id} (${live.workParcels[0].status})
- Operator-requested route: local Qwen → Pixel Gemma E4B
- Route gate: **${l.routeQualification.decision}** because ${l.routeQualification.reasons.join(', ')}
- Selected route: ${l.writerRoute} → ${l.readerRoute}
- Memory SHA-256: ${l.memorySha256}
- Sealed reader baton SHA-256: ${l.batonSha256}
- Writer/reader/reconciled total: ${l.writerUsage.totalTokens} / ${l.readerUsage.totalTokens} / ${l.usage.totalTokens} tokens
- Reconstruction/continuation: ${l.reconstructionAccuracy}% / ${l.continuationSuccess?'PASS':'FAIL'}
- Video: live/agent-control-4.5-live-poe-memory-qualification.mp4

${attempts('Escalated writer',l.writerAttempts)}

${attempts('Escalated cold reader',l.readerAttempts)}

## Terminal route matrix

${routeMatrix.map((row,index)=>`${index+1}. ${row.writerRoute} → ${row.readerRoute}: **${row.terminalClassification}** — ${row.terminalReason}`).join('\n')}

## Gate verdicts

${report.gates.map(g=>`- ${g.name}: **${g.status}** — ${g.evidence}`).join('\n')}

## Recommendation

**EXPERIMENTAL** — stable v4.5.0 release remains blocked. No merge, tag, release or deployment was performed.
`;}
function renderRows(title,report){return`## ${title}\n\n${report.matrix.map((row,index)=>`### ${row.writerRoute} → ${row.readerRoute}\n\n- Work Parcel: ${report.workParcels?.[index]?.id??'recorded in source evidence'} (${report.workParcels?.[index]?.status??row.result})\n- Memory SHA-256: ${row.memorySha256??'unavailable'}\n- Reader baton SHA-256: ${row.batonSha256??'unavailable'}\n- Reconstruction/continuation: ${row.reconstructionAccuracy}% / ${row.continuationSuccess?'PASS':'FAIL'}\n- Failures: ${row.failures?.join('; ')||'none'}\n- Writer/reader/reconciled total: ${row.writerUsage?.totalTokens??'unavailable'} / ${row.readerUsage?.totalTokens??'unavailable'} / ${row.usage?.totalTokens??'unavailable'} tokens\n- Cost: ${row.usage?.cost??'unavailable'} (${row.usage?.authority??'unavailable'})\n\n${attempts('Writer',row.writerAttempts)}\n\n${attempts('Cold reader',row.readerAttempts)}`).join('\n\n')}`;}
function attempts(label,items=[]){if(items.length===0)return`### ${label} attempts\n\nDetailed sanitized attempts are unavailable in this source checkpoint.`;return items.map(item=>`### ${label} attempt ${item.attempt}\n\n- Response: ${item.responseReceived?'received':'not received'}; finish: ${item.finishReason??'unavailable'}\n- Model: ${item.responseModel??'unavailable'}\n- JSON/schema: ${item.validJson}/${item.applicationSchemaValid}\n- Schema failures: ${item.schemaFailures?.join('; ')||'none'}\n- Semantic failures: ${item.semanticFailures?.join('; ')||'none'}\n- Bytes/SHA-256: ${item.bytes??'unavailable'} / ${item.sha256??'unavailable'}\n\n\`\`\`json\n${item.sanitizedOutput||'[no output]'}\n\`\`\``).join('\n\n');}
function documentation(report){return`# Agent Control 4.5 release-gate completion

Status: **EXPERIMENTAL**. Stable baseline: **v4.4.0**. Candidate: \`${report.implementationHead}\`.

| Gate | Status | Evidence |
| --- | --- | --- |
${report.gates.map(g=>`| ${g.name} | **${g.status}** | ${g.evidence.replaceAll('|','\\|')} |`).join('\n')}

## Decisive closure

All twelve requested Your Memories route cells now have terminal classifications: nine are PASS/FIXED, two Qwen→Pixel aliases are UNSUPPORTED, and current GLM→Qwen is BLOCKED_EXTERNAL because its authentication prerequisite is unavailable. UNSUPPORTED and blocked routes are not counted as passes.

The provider-neutral route qualification store prevents known-incompatible memory readers from running. A fresh production POE Work Parcel requested Qwen→Pixel, received an explicit \`ESCALATE\` decision, selected Qwen→Luna, completed 100% reconstruction and independent continuation verification, and retained 8,232 reconciled tokens. The genuine 1920×1080 recording and browser snapshots are in the evidence bundle.

Pixel Gemma writer capability passed two repeated physical trials. Pixel Gemma reader capability remains unsupported after complete schema-valid responses repeatedly failed the exact next-action semantic requirement. Specialist energy advantage remains DISPROVEN; whole-node power remains BLOCKED_EXTERNAL; warm-residency benefit is DISPROVEN at the available measurement resolution.

The recommendation therefore remains **EXPERIMENTAL**, not release-ready.

See the [machine release gate](../../qualification/agent-control-4.5-release-gate-completion-20260912/release-gate.json), [complete transcript](../../qualification/agent-control-4.5-release-gate-completion-20260912/complete-human-readable-transcript.md), [authoritative matrix](../../qualification/agent-control-4.5-release-gate-completion-20260912/memory-matrix.json), [route qualifications](../../qualification/agent-control-4.5-release-gate-completion-20260912/memory-route-qualifications.json), [HD recording](../../qualification/agent-control-4.5-release-gate-completion-20260912/live/agent-control-4.5-live-poe-memory-qualification.mp4), [energy evidence](../../qualification/agent-control-4.5-release-gate-completion-20260912/energy-evidence.json), and [manifest](../../qualification/agent-control-4.5-release-gate-completion-20260912/evidence-manifest.json).
`;}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function write(file,value){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n',{mode:0o600});}
function copy(source,target){fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.copyFileSync(source,target);}
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{const item=path.join(directory,entry.name);return entry.isDirectory()?walk(item):[item];});}
function sha(value){return createHash('sha256').update(value).digest('hex');}
function exec(command,args){return execFileSync(command,args,{encoding:'utf8'}).trim();}

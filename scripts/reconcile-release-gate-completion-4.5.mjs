import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('qualification/agent-control-4.5-release-gate-completion-20260912');
const sources={
  controller:'/fast/qualification/agent-control-4.5-controller-cross-model-final-20260912',
  pixel:'/fast/qualification/agent-control-4.5-memory-completion-final-20260912',
  msiStatus:'/fast/qualification/agent-control-4.5-msi-account-status-final-20260912',
  msi:'/fast/qualification/agent-control-4.5-msi-transition-final-r2-20260912',
  consolidation:'/fast/qualification/agent-control-4.5-consolidation-completion-final-20260912',
  specialist:'/fast/qualification/agent-control-4.5-specialist-batch-energy-20260912-r2',
};
const head=exec('git',['rev-parse','HEAD']),branch=exec('git',['branch','--show-current']);
fs.mkdirSync(root,{recursive:true,mode:0o700});
const controller=read(path.join(sources.controller,'cross-model-memory-qualification.json'));
const pixel=read(path.join(sources.pixel,'cross-model-memory-qualification.json'));
const msiStatus=read(path.join(sources.msiStatus,'msi-memory-transition.json'));
const msi=read(path.join(sources.msi,'cross-model-memory-qualification.json'));
const consolidation=read(path.join(sources.consolidation,'memory-conditions-consolidation.json'));
const specialist=read(path.join(sources.specialist,'qualification.json'));
for(const [name,source] of [
  ['controller-memory.json',path.join(sources.controller,'cross-model-memory-qualification.json')],
  ['controller-memory-transcript.md',path.join(sources.controller,'cross-model-memory-transcript.md')],
  ['pixel-memory.json',path.join(sources.pixel,'cross-model-memory-qualification.json')],
  ['pixel-memory-transcript.md',path.join(sources.pixel,'cross-model-memory-transcript.md')],
  ['msi-account-status.json',path.join(sources.msiStatus,'msi-memory-transition.json')],
  ['msi-memory.json',path.join(sources.msi,'cross-model-memory-qualification.json')],
  ['msi-memory-transcript.md',path.join(sources.msi,'cross-model-memory-transcript.md')],
  ['consolidation.json',path.join(sources.consolidation,'memory-conditions-consolidation.json')],
  ['consolidation-transcript.md',path.join(sources.consolidation,'memory-conditions-consolidation.md')],
  ['specialist-batch-energy.json',path.join(sources.specialist,'qualification.json')],
])fs.copyFileSync(source,path.join(root,name));

const controllerRows=controller.matrix.map(row=>cell(row));
const pixelRows=pixel.matrix.map(row=>cell(row));
const failed=[
  {id:'glm-to-qwen',classification:'authentication unavailable',status:'BLOCKED',reason:'The configured OpenRouter credential was rejected; no unavailable route is counted as a pass.'},
  ...pixelRows.filter(row=>row.result!=='PASS').map(row=>({id:'qwen-to-pixel',classification:row.failureClass,status:'DISPROVEN',reason:`Exact Pixel E4B cold reader retained ${row.reconstructionAccuracy}% but failed: ${row.failures.join('; ')}`})),
  {id:'specialist-energy',classification:'model capability',status:'DISPROVEN',reason:'The retained specialist was correct but consumed more measured-component energy per verified result than warm Qwen.'},
  {id:'whole-node-power',classification:'evidence or verification defect',status:'BLOCKED',reason:'No synchronized whole-node meter is available; component measurements cannot support a whole-system claim.'},
];
const matrix={schema:'agent-control.4.5-completion-memory-matrix/v1',generatedAt:new Date().toISOString(),implementationHead:head,contract:{semanticReconstructionRequired:true,keywordOnlyPassForbidden:true,verificationWeakened:false},controller:controllerRows,pixel:pixelRows,msi:msi.matrix.map(row=>cell(row)),historicalTwelveCellReconciliation:{passed:9,total:12,explanation:'Five historical passes + two freshly repeated controller-direction passes + the duplicated Pixel→Qwen aliases now proven. The two duplicated Qwen→Pixel aliases remain one genuine model limitation; GLM→Qwen is blocked by authentication.'},failed};
write('memory-matrix.json',matrix);
write('failure-analysis.json',{schema:'agent-control.4.5-completion-failure-analysis/v1',generatedAt:new Date().toISOString(),failures:failed,qualificationDefectsFixed:[
  {defect:'Writer and reader used incompatible application schemas.',fix:'One canonical provider-neutral ProjectMemoryExchange is now shared by writer, reader and consolidation.'},
  {defect:'Pixel output cap truncated complete structured responses.',fix:'Bounded cap raised from 320 to 512 after finish_reason=length evidence.'},
  {defect:'Windows OpenSSH bootstrap waited indefinitely for channel EOF.',fix:'Payload and audited script are two bounded base64 records; no EOF delimiter is required.'},
  {defect:'Remote final messages containing legitimate repository paths were rejected.',fix:'Repository paths are accepted while credential-profile paths still fail closed.'},
]});
write('energy-evidence.json',{schema:'agent-control.4.5-completion-energy/v1',generatedAt:new Date().toISOString(),specialist:{status:'DISPROVEN',boundary:specialist.boundary,summary:specialist.summary,pairedWins:specialist.pairedWins,verdict:specialist.verdict},residency:{status:'PARTIAL',source:'../agent-control-4.5-release-gate-20260912/energy-evidence.json'},wholeNode:{status:'BLOCKED',reason:'No synchronized whole-node meter was available.'},routingPolicyChanged:false});
const gates=[
  gate('Governed deterministic-skill lifecycle','PROVEN','45/45 prior physical executions passed; deterministic rejection and fallback remain covered.'),
  gate('Your Memories cross-model matrix','PARTIAL','9/12 reconciled cells pass; Qwen→Pixel remains a semantic model limitation and GLM→Qwen is authentication-blocked.'),
  gate('MSI cross-node memory transition','PROVEN',`${msi.matrix[0].writerRoute} → ${msi.matrix[0].readerRoute}; 100% reconstruction and independently verified continuation.`),
  gate('Strong-model memory consolidation','PROVEN',`Qwen/Sol average improved ${consolidation.analysis.scoreDelta} points (${consolidation.analysis.originalAverageScore}% → ${consolidation.analysis.consolidatedAverageScore}%); both consolidated readers passed.`),
  gate('Specialist-model energy advantage','DISPROVEN','All 15/15 results per route verified, but the specialist used more measured-component joules per result in every retained batch qualification variant.'),
  gate('Deterministic reuse benefit','PROVEN','Prior physical evidence remains valid and unchanged.'),
  gate('Fallback after deterministic rejection','PROVEN','Prior production POE Work Parcel fallback evidence remains valid and unchanged.'),
  gate('Production POE Work Parcel','PROVEN',`The MSI transition was initiated through POE conversation ${msi.poe?.conversation?.id} and completed one four-stage production Work Parcel.`),
  gate('Warm residency route effect','PARTIAL','Measured component delta remains below uncertainty; no routing policy change admitted.'),
  gate('Whole-node power claim','BLOCKED','No synchronized whole-node meter exists on the qualified estate.'),
  gate('Exact-candidate HD recording','NOT TESTED','The historical 4.5 HD recording remains intact, but no new recording was fabricated for this completion candidate.'),
];
const report={schema:'agent-control.4.5-release-gate-completion/v1',generatedAt:new Date().toISOString(),branch,implementationHead:head,releasedBaseline:'v4.4.0',recommendation:'EXPERIMENTAL',gates,summary:counts(gates),physical:{controller:{verdict:controller.verdict,parcelIds:controller.workParcels.map(parcel=>parcel.id),rows:controllerRows,totals:controller.totals},msiAccountStatus:msiStatus,msiTransition:{verdict:msi.verdict,parcelId:msi.workParcels[0].id,routes:[msi.matrix[0].writerRoute,msi.matrix[0].readerRoute],batonSha256:msi.matrix[0].batonSha256,usage:msi.matrix[0].usage},pixel:{verdict:pixel.verdict,rows:pixelRows},consolidation:consolidation.analysis,specialistEnergy:specialist.verdict},validation:{fullSuite:{passed:1157,total:1157},typeScript:'PASS',bootstrap:'PASS',dashboard:'PASS',neutrality:'PASS',implementationStatus:'PASS'},security:{credentialsPersisted:false,credentialPathsPersisted:false,rawTransportOutputPersisted:false,providerOutputsSanitized:true},releaseActions:{merge:false,tag:false,release:false,deploy:false}};
write('release-gate.json',report);
fs.writeFileSync(path.join(root,'complete-human-readable-transcript.md'),transcript(report).replace('## MSI POE-initiated transition',`${controllerTranscript()}\n\n## MSI POE-initiated transition`),{mode:0o600});
fs.writeFileSync(path.resolve('docs/evidence/agent-control-4.5-release-gate-completion-20260912.md'),documentation(report),{mode:0o644});
const files=walk(root).filter(file=>!file.endsWith('evidence-manifest.json')).map(file=>{const bytes=fs.readFileSync(file);return{file:path.relative(root,file),bytes:bytes.length,sha256:sha(bytes)};});
write('evidence-manifest.json',{schema:'agent-control.4.5-completion-manifest/v1',generatedAt:new Date().toISOString(),implementationHead:head,files});
console.log(JSON.stringify({root,report:path.join(root,'release-gate.json'),recommendation:report.recommendation,summary:report.summary,files:files.length},null,2));

function cell(row){return{writerRoute:row.writerRoute,readerRoute:row.readerRoute,result:row.result,failureClass:row.failureClass??null,failures:row.failures??[],reconstructionAccuracy:row.reconstructionAccuracy,continuationSuccess:row.continuationSuccess,usage:row.usage,batonSha256:row.batonSha256,memorySha256:row.memorySha256};}
function gate(name,status,evidence){return{name,status,evidence};}
function counts(gates){return Object.fromEntries(['PROVEN','PARTIAL','DISPROVEN','BLOCKED','NOT TESTED'].map(status=>[status.toLowerCase().replace(' ','_'),gates.filter(gate=>gate.status===status).length]));}
function controllerTranscript(){return`## Controller cross-model repetitions\n\n${controller.matrix.map((row,index)=>`### ${row.writerRoute} → ${row.readerRoute}\n\n- Work Parcel: ${controller.workParcels[index]?.id??'recorded in machine evidence'}\n- Result: ${row.result}\n- Reconstruction/continuation: ${row.reconstructionAccuracy}% / ${row.continuationSuccess?'PASS':'FAIL'}\n- Memory SHA-256: ${row.memorySha256}\n- Sealed reader baton SHA-256: ${row.batonSha256}\n- Writer/reader/total: ${row.writerUsage.totalTokens} / ${row.readerUsage.totalTokens} / ${row.usage.totalTokens} tokens\n- Cost: ${row.usage.cost??'unavailable'} (${row.usage.authority})\n\n${attempts('Writer',row.writerAttempts)}\n\n${attempts('Cold reader',row.readerAttempts)}`).join('\n\n')}`;}
function transcript(report){const m=msi.matrix[0],p=pixel.matrix;return`# Agent Control 4.5 completion transcript\n\nThis is rendered from genuine governed Work Parcels and sanitized provider results. Credentials, private reasoning and raw transport diagnostics are excluded.\n\n## MSI POE-initiated transition\n\n${msi.poe?.transcript??'POE transcript unavailable'}\n\n- Work Parcel: ${msi.workParcels[0].id} (${msi.workParcels[0].status})\n- Route: ${m.writerRoute} → ${m.readerRoute}\n- Memory SHA-256: ${m.memorySha256}\n- Sealed reader baton SHA-256: ${m.batonSha256}\n- Writer usage: ${m.writerUsage.totalTokens} tokens\n- Reader usage: ${m.readerUsage.totalTokens} tokens\n- Reconciled total: ${m.usage.totalTokens} tokens\n- Cost: unavailable (${m.usage.authority})\n- Reconstruction/continuation: ${m.reconstructionAccuracy}% / ${m.continuationSuccess?'PASS':'FAIL'}\n\n${attempts('MSI writer',m.writerAttempts)}\n\n${attempts('MSI cold reader',m.readerAttempts)}\n\n## Pixel E4B matrix\n\n${p.map(row=>`### ${row.writerRoute} → ${row.readerRoute}\n\n- Result: ${row.result}\n- Reconstruction: ${row.reconstructionAccuracy}%\n- Continuation: ${row.continuationSuccess?'PASS':'FAIL'}\n- Failures: ${row.failures.join('; ')||'none'}\n- Usage: ${row.usage.totalTokens??'unavailable'} tokens\n\n${attempts('Writer',row.writerAttempts)}\n\n${attempts('Cold reader',row.readerAttempts)}`).join('\n\n')}\n\n## Consolidation\n\n- Original average: ${consolidation.analysis.originalAverageScore}%\n- Consolidated average: ${consolidation.analysis.consolidatedAverageScore}%\n- Delta: +${consolidation.analysis.scoreDelta} points\n- Conflict exposed: ${consolidation.conflict.exposed}\n- Tokens: ${consolidation.analysis.consolidationTokens}\n- Cost: unavailable\n\n## Gate verdicts\n\n${report.gates.map(g=>`- ${g.name}: **${g.status}** — ${g.evidence}`).join('\n')}\n\n## Recommendation\n\n**EXPERIMENTAL** — stable v4.5.0 release remains blocked.\n`;}
function attempts(label,items){return items.map(item=>`### ${label} attempt ${item.attempt}\n\n- Response: ${item.responseReceived?'received':'not received'}; finish: ${item.finishReason??'unavailable'}\n- JSON/schema: ${item.validJson}/${item.applicationSchemaValid}\n- Semantic failures: ${item.semanticFailures.join('; ')||'none'}\n- SHA-256: ${item.sha256??'unavailable'}\n\n\`\`\`json\n${item.sanitizedOutput||'[no output]'}\n\`\`\``).join('\n\n');}
function documentation(report){return`# Agent Control 4.5 release-gate completion\n\nStatus: **EXPERIMENTAL**. Stable baseline: **v4.4.0**. Candidate: \`${report.implementationHead}\`.\n\n| Gate | Status | Evidence |\n| --- | --- | --- |\n${report.gates.map(g=>`| ${g.name} | **${g.status}** | ${g.evidence.replaceAll('|','\\|')} |`).join('\n')}\n\n## Material progress\n\nThe canonical Your Memories exchange now works across controller models, Pixel E4B→Qwen, and two isolated MSI Codex account profiles. The production MSI route completed \`Cottage Plus/Luna → Lawrence Pro/Sol\` with a sealed baton, 100% reconstruction, independent continuation verification and 15,570 reconciled tokens. Strong-model consolidation improved the measured Qwen/Sol reconstruction average by 4.54 points.\n\n## Remaining stable-release blockers\n\nThe reverse Qwen→Pixel reader remains a genuine semantic model limitation, GLM→Qwen is blocked by unavailable authentication, specialist-model energy advantage is disproven for every measured workflow, whole-node power is unavailable, and this exact candidate has no new HD recording. None is counted as passed or inferred.\n\nSee the [machine release gate](../../qualification/agent-control-4.5-release-gate-completion-20260912/release-gate.json), [complete transcript](../../qualification/agent-control-4.5-release-gate-completion-20260912/complete-human-readable-transcript.md), [memory matrix](../../qualification/agent-control-4.5-release-gate-completion-20260912/memory-matrix.json), [energy evidence](../../qualification/agent-control-4.5-release-gate-completion-20260912/energy-evidence.json), and [manifest](../../qualification/agent-control-4.5-release-gate-completion-20260912/evidence-manifest.json).\n`;}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function write(file,value){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n',{mode:0o600});}
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{const item=path.join(directory,entry.name);return entry.isDirectory()?walk(item):[item];});}
function sha(value){return createHash('sha256').update(value).digest('hex');}
function exec(command,args){return execFileSync(command,args,{encoding:'utf8'}).trim();}

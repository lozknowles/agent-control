import {spawnSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {LocalCodexNodeExecutionPort, type CodexNodeExecutionPort, type CodexStructuredExecutionResult} from '../src/control/codex-node-execution.js';
import {CodexRepositoryReviewClient} from '../src/control/codex-repository-review-client.js';
import {parseRepositoryReviewResponse, REPOSITORY_REVIEW_OUTPUT_SCHEMA} from '../src/control/direct-repository-review-executor.js';
import {providerPromptBoundary, renderProviderPrompt, type ProviderPrompt, type ProviderPromptInput} from '../src/control/provider-prompt.js';

interface Arguments {output: string; repository: string; files: string[]; accountEnvironment: string; model: string; timeoutMs: number;}
type Arm = 'release-baseline' | 'candidate';
type CaseName = 'cold' | 'warm-follow-up' | 'changed-context' | 'retry';

async function main() {
  const args = argumentsFrom(process.argv.slice(2)), home = process.env[args.accountEnvironment];
  if (!home || !path.isAbsolute(home) || !fs.statSync(home).isDirectory()) throw new Error('qualification_account_reference_unavailable');
  if (!path.isAbsolute(args.repository) || !fs.statSync(args.repository).isDirectory()) throw new Error('qualification_repository_invalid');
  const contexts = args.files.map(file => readFileWithin(args.repository, file));
  if (contexts.length < 2) throw new Error('qualification_two_files_required');
  const contextV1 = contexts[0], contextV2 = contexts.join('');
  const startedAt = new Date().toISOString(), account = {id:'controller-account-a',label:'Controller Account A',providerExecutionNodeId:'controller',credentialResidency:{nodeId:'controller',store:{type:'codex-home-env' as const,env:args.accountEnvironment}},capabilities:['codex-chatgpt'],qualification:{state:'QUALIFIED' as const,version:'physical-cache-boundary',checkedAt:startedAt,qualifiedAt:startedAt,capabilities:['codex-chatgpt','codex-chatgpt-authenticated'],evidence:['production-login-status']}};
  const provider = {id:'codex-chatgpt',name:'Codex ChatGPT',kind:'cli' as const,enabled:true,capabilities:['repository-review'],accountProfiles:[account]};
  const model = {id:'cache-boundary-review',provider:provider.id,providerModel:args.model,accountProfile:account.id,enabled:true,capabilities:['repository-review'],nodes:['controller'],limits:{contextTokens:32768,outputTokens:1024},qualification:{state:'QUALIFIED' as const,version:'physical-cache-boundary',qualifiedAt:startedAt,capabilities:['repository-review'],nodes:['controller'],evidence:['production-account-qualification']}};
  const delegate = new LocalCodexNodeExecutionPort(process.env, process.env.CODEX_COMMAND ?? 'codex'), native: CodexStructuredExecutionResult[] = [];
  const observed: CodexNodeExecutionPort = {accountStatus: request => delegate.accountStatus(request), async execReadOnlyStructured(request) { const result = await delegate.execReadOnlyStructured(request); native.push(result); return result; }};
  const accountStatus = await observed.accountStatus({provider, account, nodeId:'controller', timeoutMs:30_000});
  if (!accountStatus.authenticated) throw new Error('qualification_account_not_authenticated');
  const client = new CodexRepositoryReviewClient(provider, account, 'controller', observed);
  const instruction = 'Perform a bounded read-only review of the supplied frozen source. Return only the required repository-review JSON. Report a finding only when directly supported by this source; otherwise return PASS.';
  const schedule: Array<{arm: Arm; caseName: CaseName; context: string}> = [
    {arm:'release-baseline',caseName:'cold',context:contextV1}, {arm:'candidate',caseName:'cold',context:contextV1},
    {arm:'release-baseline',caseName:'warm-follow-up',context:contextV1}, {arm:'candidate',caseName:'warm-follow-up',context:contextV1},
    {arm:'release-baseline',caseName:'changed-context',context:contextV2}, {arm:'candidate',caseName:'changed-context',context:contextV2},
    {arm:'release-baseline',caseName:'retry',context:contextV2}, {arm:'candidate',caseName:'retry',context:contextV2},
  ];
  const records=[];
  for (const item of schedule) {
    const packetId=`evidence-packet:${randomUUID()}`, input=prompt(item.arm,instruction,item.context,packetId), boundary=providerPromptBoundary(input), rendered=renderProviderPrompt(input), stablePrefix=boundary?boundary.prompt.blocks.slice(0,boundary.lastStableBlock+1).map(block=>block.text).join(''):null, invocationStartedAt=new Date().toISOString();
    const result=await client.invoke(model,input,{structured:true,outputSchema:REPOSITORY_REVIEW_OUTPUT_SCHEMA,maximumOutputTokens:1024,timeoutMs:args.timeoutMs,signal:new AbortController().signal});
    const review=parseRepositoryReviewResponse(result.output), execution=native.at(-1)!;
    const cached=result.usage.cachedInputTokens,cacheWrite=result.usage.cacheWriteTokens??null,inputTokens=result.usage.inputTokens,fresh=inputTokens===null||cached===null||cached+(cacheWrite??0)>inputTokens?null:inputTokens-cached-(cacheWrite??0);
    records.push({arm:item.arm,case:item.caseName,startedAt:invocationStartedAt,completedAt:new Date().toISOString(),providerId:result.providerId,accountProfileId:result.accountProfileId,nodeId:result.nodeId,modelId:result.modelId,providerModel:result.providerModel,prompt:{sha256:sha256(rendered),bytes:Buffer.byteLength(rendered),stablePrefixSha256:stablePrefix?sha256(stablePrefix):null,stablePrefixBytes:stablePrefix?Buffer.byteLength(stablePrefix):0,structuralBoundary:boundary!==null},usage:{inputTokens,freshInputTokens:fresh,cachedInputTokens:cached,cacheWriteTokens:cacheWrite,outputTokens:result.usage.outputTokens,totalTokens:result.usage.totalTokens,cost:null,costAuthority:'unavailable'},elapsedMs:result.elapsedMs,verdict:review.verdict,findings:review.findings.length,responseSha256:sha256(result.output),threadIdSha256:execution.threadId?sha256(execution.threadId):null,observedItemTypes:execution.observedItemTypes});
  }
  const command=process.env.CODEX_COMMAND??'codex',version=spawnSync(command,['--version'],{encoding:'utf8'}),executable=spawnSync('which',[command],{encoding:'utf8'}).stdout.trim();
  const report={schema:'agent-control.provider-cache-boundary-qualification/v1',startedAt,completedAt:new Date().toISOString(),implementationCommit:gitHead(),provider:{id:provider.id,accountProfileId:account.id,nodeId:'controller',modelId:model.id,providerModel:model.providerModel,codexVersion:version.status===0?version.stdout.trim():'unavailable',executableSha256:executable&&fs.existsSync(executable)?sha256(fs.readFileSync(fs.realpathSync(executable))):'unavailable',accountQualified:true},repository:{identitySha256:sha256(path.resolve(args.repository)),files:args.files,contextV1Sha256:sha256(contextV1),contextV2Sha256:sha256(contextV2)},conditions:{order:'alternating-arms',cases:['cold','warm-follow-up','changed-context','retry'],sessionPersistence:false,providerSpecificControls:'unsupported-on-cli; existing CLI request shape retained',pricing:'unavailable'},records,summary:{'release-baseline':summarize(records.filter(record=>record.arm==='release-baseline')),'candidate':summarize(records.filter(record=>record.arm==='candidate'))},limitations:['Provider cache admission and reuse are provider-managed; cache counts are observational and do not establish causation.','The physically available Codex CLI route does not expose explicit Responses prompt-cache controls, cache-write counts, authoritative current-context occupancy, or provider-billed cost.','The release-baseline arm reproduces the v3.8.2 placement of changing evidence identity before repository content; the candidate arm uses the production structural stable-prefix representation.']};
  const serialized=`${JSON.stringify(report,null,2)}\n`;
  if (/(?:auth\.json|access[_-]?token|refresh[_-]?token|bearer\s+|\b(?:sk|rk|pk)-[A-Za-z0-9_-]{12,}|CODEX_HOME(?:_|\b)|[A-Za-z]:\\\\Users\\\\)/i.test(serialized)) throw new Error('qualification_evidence_secret_or_path_leak');
  fs.mkdirSync(path.dirname(args.output),{recursive:true,mode:0o700});fs.writeFileSync(args.output,serialized,{mode:0o600});
  process.stdout.write(`${JSON.stringify({output:args.output,summary:report.summary,provider:report.provider},null,2)}\n`);
}

function prompt(arm: Arm, instruction: string, context: string, packetId: string): ProviderPromptInput {
  if (arm === 'release-baseline') return `${instruction}\n\nGoverned Evidence Packet: ${packetId}\n${context}`;
  const value: ProviderPrompt={schema:'agent-control.provider-prompt/v1',cacheScope:sha256('repository-review/cache-boundary/v1'),blocks:[{type:'text',stability:'stable',text:`${instruction}\n\n${context}`},{type:'text',stability:'volatile',text:`\n\nGoverned Evidence Packet: ${packetId}`}]};
  return value;
}
function readFileWithin(root:string,file:string){const relative=path.posix.normalize(file);if(path.isAbsolute(relative)||relative.startsWith('../'))throw new Error('qualification_file_invalid');const base=path.resolve(root),absolute=path.resolve(base,relative);if(!absolute.startsWith(`${base}${path.sep}`)||!fs.statSync(absolute).isFile())throw new Error('qualification_file_invalid');return `\n===== ${relative} =====\n${fs.readFileSync(absolute,'utf8')}\n`;}
function summarize(records:Array<{usage:{inputTokens:number|null;freshInputTokens:number|null;cachedInputTokens:number|null;cacheWriteTokens:number|null;outputTokens:number|null;totalTokens:number|null};elapsedMs:number;verdict:string}>){const sum=(select:(record:(typeof records)[number])=>number|null)=>records.every(record=>typeof select(record)==='number')?records.reduce((total,record)=>total+(select(record)??0),0):null;return{runs:records.length,schemaValidResponses:records.length,acceptedReviewOutcomes:records.filter(record=>['PASS','PASS_WITH_FINDINGS'].includes(record.verdict)).length,totalInputTokens:sum(record=>record.usage.inputTokens),totalFreshInputTokens:sum(record=>record.usage.freshInputTokens),totalCachedInputTokens:sum(record=>record.usage.cachedInputTokens),totalCacheWriteTokens:sum(record=>record.usage.cacheWriteTokens),totalOutputTokens:sum(record=>record.usage.outputTokens),totalTokens:sum(record=>record.usage.totalTokens),totalElapsedMs:sum(record=>record.elapsedMs)};}
function argumentsFrom(values:string[]):Arguments{const map=new Map(values.map(value=>{const [key,...rest]=value.replace(/^--/,'').split('=');return[key,rest.join('=')];})),required=(name:string)=>{const value=map.get(name);if(!value)throw new Error(`qualification_${name}_required`);return value;},timeoutMs=Number(map.get('timeout-ms')??180000);if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>600000)throw new Error('qualification_timeout_invalid');return{output:path.resolve(required('output')),repository:path.resolve(required('repository')),files:required('files').split(',').filter(Boolean),accountEnvironment:map.get('account-environment')??'CODEX_HOME_CONTROLLER_ACCOUNT_A',model:map.get('model')??'gpt-5.6-luna',timeoutMs};}
function sha256(value:string|Buffer){return createHash('sha256').update(value).digest('hex');}
function gitHead(){const result=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});return result.status===0?result.stdout.trim():'unavailable';}

main().catch(error=>{process.stderr.write(`${error instanceof Error?error.message:'qualification_failed'}\n`);process.exitCode=1;});

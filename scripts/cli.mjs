import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {createClient,CliError,EXIT,terminal,clean,events,httpError} from './cli-client.mjs';
import {exportReport} from './report-output.mjs';

export const version=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
export const HELP=`Agent Control ${version} — governed command line (agent-control / ac)

  agent-control status [--json]
  ac estate | nodes | node <id>
  ac jobs [running|queued|completed|catalog]
  ac job <run-id> [process|history|tokens|output|evidence]
  ac workers | models | providers | routes | policies
  ac run <catalog-id> [--parameter value ...]
  ac run <catalog-id> --help
  ac watch <run-id>
  ac logs <run-id> [--tail N] [--follow]
  ac job <run-id> output --profile simple|detailed|evidence [--download]

Global: --endpoint URL, --json, --quiet, --no-color, --help, --version
History: --tail N, --follow, --download [--directory PATH]
Outputs: --profile ID, --download [--directory PATH], --format text

Examples:
  ac --endpoint http://127.0.0.1:4310 status
  ac jobs --json
  ac job RUN_ID output --profile simple --download

Existing saved-job commands (jobs definitions/saved/create/import/export/run/
update/enable/disable/cancel/schedules/runs), ACP and credential administration
remain available under agent-control. Use existing approvals in the dashboard;
no CLI flag bypasses them. Run IDs are distinct from catalogue/saved-job IDs.
Connection settings reuse status-client.json and AGENT_CONTROL_WEB_URL.
Authentication uses AGENT_CONTROL_WEB_OPERATOR_TOKEN in the environment only.
`;
const booleanFlags=new Set(['json','quiet','no-color','help','version','download','follow']);
export function parseArgs(argv){const options={},words=[];for(let i=0;i<argv.length;i++){let arg=argv[i];if(arg==='-h')arg='--help';if(arg==='-v')arg='--version';if(arg.startsWith('--')){const parts=arg.slice(2).split('='),key=parts.shift();if(!/^[A-Za-z][A-Za-z0-9-]*$/.test(key)||key in options)throw new CliError(EXIT.USAGE,'Invalid or repeated option. Use `ac --help`.');if(booleanFlags.has(key)){if(parts.length)throw new CliError(EXIT.USAGE,`--${key} does not take a value.`);options[key]=true;}else{const value=parts.length?parts.join('='):argv[++i];if(!value||value.startsWith('--'))throw new CliError(EXIT.USAGE,`--${key} requires a value.`);options[key]=value;}}else words.push(arg);}if(options.json&&options.quiet)throw new CliError(EXIT.USAGE,'Choose --json or --quiet.');return {words,options};}
function checkOptions(options,extra=[]){const allowed=new Set(['endpoint','json','quiet','no-color','help','version',...extra]);for(const key of Object.keys(options))if(!allowed.has(key))throw new CliError(EXIT.USAGE,`Unknown option --${key}. Use this command with --help.`);}
const array=x=>Array.isArray(x)?x:[];
const value=x=>x&&typeof x==='object'&&'value' in x?x.value:x;
const label=x=>value(x)===null||value(x)===undefined?'unavailable':typeof value(x)==='number'?value(x).toLocaleString('en-GB'):String(value(x));
const ended=new Set(['SUCCEEDED','SUCCEEDED_WITH_FINDINGS','FAILED','CANCELLED','CANCELED','DEGRADED','SKIPPED','DEAD_LETTER']);
const failed=x=>['FAILED','CANCELLED','CANCELED','DEGRADED','DEAD_LETTER'].includes(x.status);
const running=x=>['RUNNING','RESOLVING','VALIDATING','VERIFYING','RETRY_WAIT','RETRYING'].includes(x.status);
const encoded=id=>{if(typeof id!=='string'||!id.length||id.length>240||/[\x00-\x20/\\?#]/.test(id))throw new CliError(EXIT.USAGE,'Invalid ID. Copy its exact ID from `ac jobs` or `ac nodes`.');return encodeURIComponent(id);};
function wrap(input,width){return terminal(input).split('\n').flatMap(line=>{const output=[];while(line.length>width){let at=line.lastIndexOf(' ',width);if(at<width/3)at=width;output.push(line.slice(0,at));line=line.slice(at).trimStart();}return [...output,line];}).join('\n');}
function table(rows,fields,width){if(!rows.length)return 'None recorded.';if(width<75||rows.some(row=>fields.some(([name,get])=>name.includes('ID')&&String(get(row)??'').length>Math.floor(width/fields.length)-3)))return rows.map(row=>fields.map(([name,get])=>`${name}: ${label(get(row))}`).join('\n')).join('\n\n');const col=Math.max(12,Math.floor((width-3*(fields.length-1))/fields.length));const clip=s=>{s=terminal(s).replace(/\n/g,' ');return (s.length>col?s.slice(0,col-1)+'…':s).padEnd(col);};return [fields.map(([name])=>clip(name)).join(' | '),...rows.map(row=>fields.map(([,get])=>clip(label(get(row)))).join(' | '))].join('\n');}
async function catalogue(client){const [core,definitions]=await Promise.all([client.get('/api/jobs'),client.get('/api/job-definitions')]);return [...array(core).map(j=>({id:j.metadata.id,name:j.metadata.name,kind:'core',definition:j})),...array(definitions).map(j=>({id:j.id,name:j.displayName,kind:'parameterized',definition:j}))];}
async function runs(client){const [core,parameterized]=await Promise.all([client.get('/api/runs'),client.get('/api/job-runs')]);return [...array(core).map(r=>({...r,cliRuntimeKind:'core'})),...array(parameterized).map(r=>({...r,cliRuntimeKind:'parameterized'}))].sort((a,b)=>String(b.requestedAt).localeCompare(String(a.requestedAt)));}
async function resolveRun(client,id){encoded(id);const all=await runs(client),matches=all.filter(r=>r.id===id);if(matches.length!==1)throw new CliError(EXIT.NOT_FOUND,`Run not found. Use \`ac jobs\` for run IDs; \`ac jobs catalog\` lists definitions.`);return matches[0];}
async function readRun(client,known){return {...await client.get(`/api/${known.cliRuntimeKind==='core'?'runs':'job-runs'}/${encoded(known.id)}`),cliRuntimeKind:known.cliRuntimeKind};}
async function inspection(client,run){if(['QUEUED','RESOLVING'].includes(run.status)&&run.cliRuntimeKind==='parameterized'&&!run.workParcelIds?.length)return null;return client.get(`/api/observability/runs/${encoded(run.id)}`);}
function tokenView(inspector){const u=inspector?.parentUsage??inspector?.usage;return {schema:'agent-control.cli-token-view/v1',scope:inspector?.runScope??{id:inspector?.id},totals:u?.totals??null,coverage:u?.coverage??null,groups:u?.groups??[],calls:inspector?.calls??[],limitations:inspector?.limitations??['Telemetry is not yet available.']};}
function tokensText(view){const t=view.totals??{},currencies=Object.entries(t.apiCost?.currencies??{}),cost=currencies.length?currencies.map(([currency,c])=>`${currency} ${c.amount} (${c.authorities.join(', ')||'unavailable authority'}; ${t.apiCost.reported}/${t.apiCost.total} calls)`).join('; '):'unavailable';return [['Input',t.input],['Cached input',t.cached],['Fresh input',t.fresh],['Output',t.output],['Total',t.tokens],['Cache reuse',value(t.cacheHit)==null?'unavailable':`${(value(t.cacheHit)*100).toFixed(1)}% (derived)`],['Cost',cost]].map(([k,v])=>`${k.padEnd(15)} ${label(v)}`).join('\n')+'\nAuthority: counters retain reported/total coverage; missing values are unavailable.\n'+(t.input?`Input coverage: ${t.input.reported}/${t.input.total} calls. `:'')+`Usage authority: ${[...new Set((view.calls??[]).map(c=>c.accounting?.usageAuthority??c.usageAuthority??'unavailable'))].join(', ')||'unavailable'}. Cost currencies and their recorded authorities are shown separately.`;}
function jobText(run,inspector){const calls=inspector?.calls??[],last=calls.at(-1),start=run.startedAt??run.requestedAt,end=run.completedAt??run.endedAt;const secs=start?Math.max(0,Math.floor(((end?Date.parse(end):Date.now())-Date.parse(start))/1000)):null;return `${run.id}  ${run.status}${secs!==null?'  '+Math.floor(secs/60)+'m '+secs%60+'s':''}\nJob: ${run.jobId??run.definition?.displayName??run.savedJobId??'unavailable'}\nWorker: ${last?.node??run.steps?.find(s=>s.status==='RUNNING')?.workerId??'unavailable'}\nModel: ${last?.providerModel??last?.model??run.modelRoute?.providerModel??'unavailable'}\nProvider: ${last?.provider??run.modelRoute?.providerId??'unavailable'}\n${tokensText(tokenView(inspector))}\n\nStages:\n${array(run.steps).map(s=>`${s.id}: ${s.status}`).join('\n')||array(run.transitions).map(s=>`${s.at} ${s.status}`).join('\n')||'No recorded stage yet.'}\n\nInspect: ac job ${run.id} process | tokens | history | output`;
}
async function history(client,run){return run.cliRuntimeKind==='parameterized'?client.get(`/api/job-runs/${encoded(run.id)}/transcript`):(await inspection(client,run)).history;}
async function downloadContent(content,filename,directory,expected){if(typeof content!=='string'||expected&&createHash('sha256').update(content).digest('hex')!==expected)throw new CliError(EXIT.UNAVAILABLE,'Download integrity check failed.');if(!/^[a-zA-Z0-9_-]+\.(md|json|txt)$/.test(filename))throw new CliError(EXIT.UNAVAILABLE,'Unsafe download filename.');const dest=path.resolve(directory??'.',filename);await fs.promises.mkdir(path.dirname(dest),{recursive:true});try{await fs.promises.writeFile(dest,content,{flag:'wx',mode:0o600});}catch(error){throw new CliError(EXIT.USAGE,error.code==='EEXIST'?'File already exists; choose another --directory.':'Cannot write the requested file.');}return {path:dest,sha256:createHash('sha256').update(content).digest('hex')};}
function tailLines(content,tail){if(tail===undefined)return content;const n=Number(tail);if(!Number.isSafeInteger(n)||n<1||n>100000)throw new CliError(EXIT.USAGE,'--tail must be an integer from 1 to 100000.');return content.split('\n').slice(-n).join('\n');}
function validateParameters(definition,kind,options){const declared=kind==='core'?definition.spec.parameters??{}:definition.parameters??{},supplied={};const reserved=['name','saved-id','model','context','profile','max-input-tokens','max-output-tokens','timeout','retries'];checkOptions(options,[...Object.keys(declared),...Object.keys(declared).map(k=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())),...reserved]);for(const [key,def] of Object.entries(declared)){const alias=key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());if(alias!==key&&options[alias]!==undefined&&options[key]!==undefined)throw new CliError(EXIT.USAGE,`Supply ${key} only once.`);let v=options[key]??options[alias]??def.default;if(v===undefined){if(def.required)throw new CliError(EXIT.USAGE,`--${alias} is required. Use this catalogue job with --help.`);continue;}if(['integer','number'].includes(def.type)){v=Number(v);if(!Number.isFinite(v)||def.type==='integer'&&!Number.isInteger(v)||def.minimum!==undefined&&v<def.minimum||def.maximum!==undefined&&v>def.maximum)throw new CliError(EXIT.USAGE,`--${alias} is outside the declared numeric bounds.`);}if(def.type==='boolean'){if(![true,false,'true','false'].includes(v))throw new CliError(EXIT.USAGE,`--${alias} must be true or false.`);v=v===true||v==='true';}const choices=def.enum??def.values;if(choices&&!choices.includes(v))throw new CliError(EXIT.USAGE,`--${alias} must be one of ${choices.join(', ')}.`);supplied[key]=v;}return supplied;}
function catalogueHelp(item){const d=item.definition,parameters=item.kind==='core'?d.spec.parameters:d.parameters;return `${item.id} — ${item.name}\n${d.description??d.metadata?.description??''}\n\n${Object.entries(parameters??{}).map(([key,p])=>`--${key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())} <${p.type}> ${p.required?'required':''}${p.default!==undefined?' default='+p.default:''}${p.enum||p.values?' choices='+JSON.stringify(p.enum??p.values):''}\n  ${p.description??''}`).join('\n')}\nParameters refer to controller/worker resources; the CLI does not upload local files.\n${item.kind==='parameterized'?'Optional: --saved-id ID --name NAME --model ID --context THIN|STANDARD|DEEP\nBudgets: --max-input-tokens N --max-output-tokens N --timeout MINUTES --retries N\nCreates a version-pinned Saved Job, then submits it through the existing API.':''}`;}

export async function cliMain(argv=process.argv.slice(2),io={out:console.log,error:console.error},deps={}){
 let client,options={};const controller=new AbortController(),signal=deps.signal??controller.signal,interrupt=()=>controller.abort();if(!deps.signal)process.once('SIGINT',interrupt);
 try{
  const parsed=parseArgs(argv);options=parsed.options;const [command='help',id,action,...extra]=parsed.words;if(extra.length)throw new CliError(EXIT.USAGE,'Too many arguments. Use --help.');
  if(options.version||command==='version'){checkOptions(options);io.out(`agent-control ${version}`);return EXIT.OK;}
  if(command==='help'||options.help&&(command!=='run'||!id)){io.out(HELP);return EXIT.OK;}
  if(!['status','estate','nodes','node','jobs','job','workers','models','providers','routes','policies','run','watch','logs'].includes(command))throw new CliError(EXIT.USAGE,'Unknown command. Run `ac --help`.');
  const width=Math.max(20,Math.min(180,Number(deps.width??process.stdout.columns??process.env.COLUMNS)||80));
  client=await (deps.createClient??createClient)(options,{...deps,signal});
  const emit=(data,human,kind=command)=>{if(options.json)io.out(JSON.stringify({schema:'agent-control.cli/v1',command:kind,endpoint:client.endpoint,authority:'AgentControlService',data:clean(data,client.token)},null,2));else if(options.quiet)io.out(Array.isArray(data)?data.map(x=>x.id??x.metadata?.id??'').filter(Boolean).join('\n'):data.id??data.runId??data.run?.id??data.dashboard?.node?.id??data.path??'');else io.out(wrap(clean(human,client.token),width));};
  if(command==='run'){
   if(!id||action)throw new CliError(EXIT.USAGE,'Use `ac run <catalog-id> --help`. Discover jobs with `ac jobs catalog`.');encoded(id);const matches=(await catalogue(client)).filter(j=>j.id===id);if(matches.length!==1)throw new CliError(EXIT.NOT_FOUND,'Unknown or ambiguous catalogue job. Run `ac jobs catalog`.');const item=matches[0];if(options.help){io.out(wrap(catalogueHelp(item),width));return 0;}const parameters=validateParameters(item.definition,item.kind,options);let run;
   if(item.kind==='core'){if(['name','saved-id','model','context','profile','max-input-tokens','max-output-tokens','timeout','retries'].some(k=>options[k]!==undefined))throw new CliError(EXIT.USAGE,'This core catalogue job accepts only its declared parameters.');run=await client.post(`/api/jobs/${encoded(id)}/run`,{parameters});}
   else{if(options.profile)throw new CliError(EXIT.USAGE,'Select a report profile after execution with `ac job ID output --profile ...`.');const context=options.context??'STANDARD';if(!['THIN','STANDARD','DEEP'].includes(context))throw new CliError(EXIT.USAGE,'--context must be THIN, STANDARD or DEEP.');const budgets={};for(const [flag,field,minimum] of [['max-input-tokens','maximumInputTokens',1],['max-output-tokens','maximumOutputTokens',1],['timeout','timeoutMinutes',1],['retries','maximumRetries',0]])if(options[flag]!==undefined){const number=Number(options[flag]);if(!Number.isSafeInteger(number)||number<minimum)throw new CliError(EXIT.USAGE,`--${flag} must be an integer of at least ${minimum}.`);budgets[field]=number;}const saved=await client.post('/api/saved-jobs',{id:options['saved-id']??`cli-${id.slice(0,28)}-${randomUUID().slice(0,8)}`,name:options.name??item.name,definition:{id,version:item.definition.version,follow:'pinned'},parameters,...(options.model?{routing:{model:options.model,allowFallback:false}}:{}),contextProfile:context,...(Object.keys(budgets).length?{budgets}:{}),concurrency:'forbid-overlap',enabled:true});try{run=await client.post(`/api/saved-jobs/${encoded(saved.id)}/run`,{});}catch(error){throw new CliError(error.code??EXIT.UNAVAILABLE,`${error.message} Saved Job ${saved.id} was created; inspect it before retrying.`);}}
   emit(run,`${run.id}  ${run.status}\nSubmitted to the governed runtime. Watch: ac watch ${run.id}`);return failed(run)?EXIT.JOB_FAILED:EXIT.OK;
  }
  checkOptions(options,command==='job'?(['output','evidence'].includes(action)?['profile','download','directory','format']:action==='history'?['tail','follow','download','directory']:[]):command==='logs'?['tail','follow','download','directory']:[]);
  if(command==='watch'||command==='logs'&&options.follow||command==='job'&&action==='history'&&options.follow){if(!id||action&&action!=='history')throw new CliError(EXIT.USAGE,'Use `ac watch <run-id>` or `ac logs <run-id> --follow`.');if(options.download)throw new CliError(EXIT.USAGE,'Use --download without --follow.');return await watch(client,id,{...options,history:command==='logs'||action==='history',width,tty:deps.tty??Boolean(process.stdout.isTTY&&!process.env.TERM?.match(/^dumb$/))},io,signal);}
  if(command==='status'){if(id)throw new CliError(EXIT.USAGE,'status takes no ID.');const d=await client.get('/api/status');emit(d,`Agent Control ${d.version}\nEndpoint: ${client.endpoint}\nAuthenticated: yes\nState: ${d.health}\nScheduler: ${d.scheduler?.state??d.scheduler?.status??'see JSON'}\nApprovals: ${d.outstandingApprovals??'unavailable'}`);return d.health==='degraded'?EXIT.JOB_FAILED:0;}
  if(command==='estate'||command==='nodes'||command==='node'){
   if(command==='node'&&(!id||action)||command!=='node'&&id)throw new CliError(EXIT.USAGE,'Use `ac nodes` or `ac node <id>`.');const estate=await client.get('/api/estate-map'),nodes=array(estate.nodes).filter(n=>['machine','device'].includes(n.type));
   if(command!=='node'){emit(command==='estate'?estate:nodes,table(nodes,[['ID',n=>n.id],['NODE',n=>n.label],['STATE',n=>n.state]],width));return 0;}
   encoded(id);const matches=nodes.filter(n=>n.id===id||n.detail?.nodeId===id||n.label===id);if(matches.length!==1)throw new CliError(EXIT.NOT_FOUND,'Node not found or ambiguous. Copy an exact ID from `ac nodes`.');const d=await client.get(`/api/observability/nodes/${encoded(matches[0].id)}`),resources=await client.get(`/api/observability/nodes/${encoded(matches[0].id)}/resources`);emit({dashboard:d,resources},nodeText(d,resources));return 0;
  }
  if(command==='jobs'){if(action||id&&!['running','queued','completed','catalog'].includes(id))throw new CliError(EXIT.USAGE,'Use `ac jobs [running|queued|completed|catalog]`.');if(id==='catalog'){const d=await catalogue(client);emit(d,table(d,[['ID',r=>r.id],['NAME',r=>r.name],['KIND',r=>r.kind]],width));}else{const d=(await runs(client)).filter(r=>!id||id==='running'&&running(r)||id==='queued'&&r.status==='QUEUED'||id==='completed'&&ended.has(r.status));emit(d,table(d,[['RUN ID',r=>r.id],['JOB',r=>r.jobId??r.definition?.id],['STATE',r=>r.status]],width));}return 0;}
  if(['workers','models','providers','routes','policies'].includes(command)){if(id)throw new CliError(EXIT.USAGE,`${command} takes no ID.`);const endpoint={workers:'/api/workers',models:'/api/models',providers:'/api/providers',routes:'/api/models/routes',policies:'/api/runtime-safety'}[command],d=await client.get(endpoint);emit(d,Array.isArray(d)?table(d,[['ID',r=>r.id??r.name],['STATE',r=>r.health??r.status??r.qualification],['DETAIL',r=>r.label??r.displayName??r.provider??r.capabilities?.join(', ')]],width):Object.entries(d).map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join('\n'));return 0;}
  if(command==='job'||command==='logs'){
   if(command==='logs'&&action)throw new CliError(EXIT.USAGE,'Use `ac logs <run-id> [--tail N] [--follow]`.');
   if(!id)throw new CliError(EXIT.USAGE,'A run ID is required. Use `ac jobs`.');const run=await resolveRun(client,id),sub=command==='logs'?'history':action;if(![undefined,'process','tokens','history','output','evidence'].includes(sub))throw new CliError(EXIT.USAGE,'Unknown job view. Use `ac job --help`.');
   if(!sub){const ins=await inspection(client,run);emit({run,inspector:ins},jobText(run,ins));return failed(run)?EXIT.JOB_FAILED:0;}
   if(sub==='process'){const d=await client.get(`/api/runtime-map?${run.cliRuntimeKind==='core'?'runId':'parcelId'}=${encoded(run.cliRuntimeKind==='core'?id:run.workParcelIds?.at(-1)??id)}`);emit(d,table(array(d.nodes),[['OPERATION',n=>n.id],['LABEL',n=>n.label],['STATE',n=>n.state]],width));return 0;}
   if(sub==='tokens'){const d=tokenView(await inspection(client,run));emit(d,tokensText(d));return 0;}
   if(sub==='history'){const h=await history(client,run),content=tailLines(h.content,options.tail);if(options.download){const d=await downloadContent(content,`${id}-history.${options.tail?'txt':'md'}`,options.directory,options.tail?undefined:h.sha256);emit(d,`Saved ${d.path}\nSHA-256 ${d.sha256}`);}else emit({...h,content,...(options.tail?{sha256:createHash('sha256').update(content).digest('hex'),derived:true}: {})},content);return 0;}
   const profiles=await client.get(`/api/observability/runs/${encoded(id)}/outputs`),profile=options.profile??(sub==='evidence'?profiles.profiles.find(p=>p.view==='evidence')?.id:profiles.defaultProfile);if(!profile||!profiles.profiles.some(p=>p.id===profile))throw new CliError(EXIT.NOT_FOUND,'Output profile not available for this run. Inspect the catalogue declaration.');
   if(options.download){try{const d=await exportReport({baseUrl:client.base,token:client.token,runId:id,profile,format:options.format,directory:options.directory,request:(url,init)=>client.raw(new URL(url).pathname+new URL(url).search,init)});emit(d,`Saved ${d.path}\nSource run ${d.runId}\nSHA-256 ${d.sha256}`);}catch(error){if(error instanceof CliError)throw error;const status=error.message?.match(/^report_download_http_(\d+)$/)?.[1];if(status)throw httpError(Number(status));throw new CliError(error.code==='EEXIST'?EXIT.USAGE:EXIT.UNAVAILABLE,error.code==='EEXIST'?'File already exists; choose another --directory.':'Report download failed integrity/transport checks; no file was accepted.');}}else{const d=await client.get(`/api/observability/runs/${encoded(id)}/outputs/${encoded(profile)}${options.format?'?format='+encodeURIComponent(options.format):''}`);emit(d,d.content);}return 0;
  }
  throw new CliError(EXIT.USAGE,'Use `ac --help`.');
 }catch(error){const code=error instanceof CliError?error.code:EXIT.UNAVAILABLE,message=error instanceof CliError?error.message:'Command failed. Check the controller and documented command options.';if(options.json)io.out(JSON.stringify({schema:'agent-control.cli-error/v1',exitCode:code,message:clean(message,client?.token)}));else io.error(terminal(clean(message,client?.token)));return code;}
 finally{client?.close();if(!deps.signal)process.removeListener('SIGINT',interrupt);}
}
function nodeText(d,r){
 const native=r.native,lines=[`${d.node?.label??d.nodeId}  ${d.node?.state??'unavailable'}`,d.node?.subtitle??''];
 const gib=x=>typeof value(x)==='number'?(value(x)/1073741824).toFixed(1)+' GiB':'unavailable';
 if(native){lines.push(`CPU: ${native.cpuModel??'unavailable'}`,`CPU busy: ${label(native.cpuBusyPercent)}${value(native.cpuBusyPercent)==null?'':'%'} (${native.cpuBusyPercent?.authority??'unavailable'})`);const total=value(native.memoryTotalBytes),available=value(native.memoryAvailableBytes);lines.push(`RAM used / total: ${gib(typeof total==='number'&&typeof available==='number'?total-available:null)} / ${gib(total)} (used derived)`);for(const gpu of native.gpu??[]){const resource=d.resources?.find(n=>n.id===gpu.id);lines.push(`GPU: ${resource?.label??gpu.id}`,`GPU busy: ${label(gpu.busyPercent)}${value(gpu.busyPercent)==null?'':'%'}`,`VRAM used: ${gib(gpu.usedBytes)}${typeof resource?.detail?.vramMiB==='number'?' / '+gib(resource.detail.vramMiB*1048576):''}`);}lines.push(`Observed: ${native.observedAt} (${native.scope}; ${native.attribution})`);}
 else lines.push(r.reason??'Live resources unavailable');
 for(const [name,items] of [['Resources',d.resources],['Jobs',d.work]])if(array(items).length)lines.push(`\n${name}:`,...items.map(x=>`${x.label??x.name??x.id}  ${x.state??x.status??''}${x.type?' ('+x.type+')':''}`));return lines.join('\n');
}

async function watch(client,id,options,io,signal){
 let known=await resolveRun(client,id),last='',lastHistory='',lastEventId;let stopped=false;
 const emit=async()=>{known=await readRun(client,known);const ins=await inspection(client,known);let payload={run:known,inspector:ins};let human;
 if(options.history){const h=await history(client,known);payload={runId:id,status:known.status,history:h};const full=h.content;human=lastHistory&&full.startsWith(lastHistory)?full.slice(lastHistory.length):tailLines(full,options.tail);lastHistory=full;}
 else human=jobText(known,ins);
 // observedAt and elapsed time alone must not spam a redirected stream.
 const key=JSON.stringify(options.history?{status:known.status,content:lastHistory}:{status:known.status,steps:known.steps,transitions:known.transitions,usage:known.usage,tokens:(ins?.parentUsage??ins?.usage)?.totals,events:ins?.events});
 if(key!==last){if(options.json)io.out(JSON.stringify({schema:'agent-control.cli-watch/v1',runId:id,endpoint:client.endpoint,data:clean(payload,client.token)}));else if(human)io.out((options.tty&&!options.history?'\x1b[2J\x1b[H':'')+wrap(clean(human,client.token),options.width));last=key;}
 return ended.has(known.status);
 };
 if(await emit())return failed(known)?EXIT.JOB_FAILED:0;
 const streamStop=new AbortController(),streamSignal=AbortSignal.any([signal,streamStop.signal]);
 const response=await client.raw('/api/events',{signal:streamSignal},true);let dirty=false,done=false,streamError,wake;
 const pump=(async()=>{try{for await(const event of events(response,streamSignal)){if(event.id)lastEventId=event.id;dirty=true;wake?.();}}catch(error){if(!streamSignal.aborted)streamError=error;}finally{done=true;wake?.();}})();
 try{while(!signal.aborted){
   if(!dirty&&!done)await new Promise(resolve=>{wake=resolve;});wake=null;
   if(signal.aborted)break;
   if(dirty){await new Promise(resolve=>setTimeout(resolve,150));dirty=false;if(await emit()){stopped=true;break;}}
   if(done){if(streamError)throw streamError;if(await emit()){stopped=true;break;}throw new CliError(EXIT.UNAVAILABLE,'Event stream disconnected. The governed job continues; run watch again to reconnect.');}
 }}finally{streamStop.abort();await pump;}
 if(signal.aborted)return EXIT.INTERRUPTED;return failed(known)?EXIT.JOB_FAILED:0;
}

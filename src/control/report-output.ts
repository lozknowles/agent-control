import {createHash} from 'node:crypto';
import {redactSensitiveValue} from './security-redaction.js';
import {safeTranscriptText} from './execution-history.js';

export type ReportFormat='markdown'|'text'|'json';
export interface ReportProfile {id:string;label:string;view:'simple'|'detailed'|'evidence';format:ReportFormat;default?:boolean;}
export const defaultReportProfiles:ReportProfile[]=[{id:'simple',label:'Simple report',view:'simple',format:'markdown',default:true},{id:'detailed',label:'Detailed report',view:'detailed',format:'markdown'},{id:'evidence',label:'Evidence',view:'evidence',format:'json'}];
export function validateReportProfiles(value:unknown):ReportProfile[]{
 if(value===undefined)return structuredClone(defaultReportProfiles);
 if(!Array.isArray(value)||!value.length||value.length>12)throw Error('report_profiles_invalid');
 const ids=new Set<string>();let defaults=0;
 for(const p of value){if(!p||typeof p!=='object'||Object.keys(p).some(k=>!['id','label','view','format','default'].includes(k))||typeof p.id!=='string'||!/^[a-z][a-z0-9-]{0,47}$/.test(p.id)||ids.has(p.id)||typeof p.label!=='string'||!p.label.trim()||p.label.length>80||/[\r\n]/.test(p.label)||!['simple','detailed','evidence'].includes(p.view)||!['markdown','text','json'].includes(p.format)||p.default!==undefined&&typeof p.default!=='boolean')throw Error('report_profiles_invalid');ids.add(p.id);if(p.default)defaults++;}
 if(defaults>1)throw Error('report_default_ambiguous');
 return structuredClone(value);
}
export interface ReportSource {id:string;jobId:string;title:string;status:string;recordedAt:string;result?:unknown;history:{content:string;sha256:string};events:unknown[];operations:unknown[];calls?:unknown[];limitations:string[];profiles?:ReportProfile[];}
function stable(value:unknown):string {if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+stable(v)).join(',')+'}';return JSON.stringify(value)??'null';}
export const reportDigest=(value:string)=>createHash('sha256').update(value).digest('hex');
function text(value:unknown){return typeof value==='string'?value:'';}
function record(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function list(value:unknown):unknown[]{return Array.isArray(value)?value:[];}
function cell(value:unknown){return text(value).replace(/[|\r\n]/g,' ').slice(0,500);}
function bounded(value:string,limit:number){return value.length<=limit?value:value.slice(0,limit)+'… [Excerpt; see Detailed]';}
function cleanStrings<T>(value:T):T {
 if(typeof value==='string'){const clean=safeTranscriptText(value,value.length+1);return (value.trim()?((value.match(/^\s*/)?.[0]??'')+clean+(value.match(/\s*$/)?.[0]??'')):value) as T;}
 if(Array.isArray(value))return value.map(cleanStrings) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,cleanStrings(v)])) as T;
 return value;
}
function canonical(input:ReportSource){
 // Consume only already-authorised projections; never resolve artifact paths or resurrect deleted records.
 const source=cleanStrings(redactSensitiveValue(structuredClone(input)));source.history.sha256=reportDigest(source.history.content);
 delete source.profiles;return source;
}
export function reportOutputCatalogue(input:ReportSource){const source=canonical(input),profiles=validateReportProfiles(input.profiles);return {schema:'agent-control.report-outputs/v1',runId:source.id,jobId:source.jobId,sourceSha256:reportDigest(stable(source)),recordedAt:source.recordedAt,generatedAt:new Date().toISOString(),derived:true,defaultProfile:(profiles.find(p=>p.default)??profiles.find(p=>p.view==='simple')??profiles[0]).id,profiles};}
export function renderReportOutput(input:ReportSource,profileId?:string,format?:string){
 const source=canonical(input),catalogue=reportOutputCatalogue(input),profile=catalogue.profiles.find(p=>p.id===(profileId??catalogue.defaultProfile));if(!profile)throw Error('report_profile_missing');
 const selectedFormat=format??profile.format;
 // Plain text is the dependency-free alternate rendering of a Markdown profile, not an extra model output.
 if(selectedFormat!==profile.format&&!(profile.format==='markdown'&&selectedFormat==='text'))throw Error('report_format_unsupported');
 const r=record(source.result),head=`# ${source.title}\n\nRun: ${source.id}\nJob: ${source.jobId}\nStatus: ${source.status}\nSource recorded: ${source.recordedAt}\n\n`,footer=`\n\n---\nDeterministic ${profile.view} projection of retained governed evidence. Source SHA-256: ${catalogue.sourceSha256}. No analysis or model execution was repeated.\n`;
 let body='';
 if(profile.view==='simple'){
  const requirements=list(r.requirements),findings=list(r.findings),summary=text(r.executiveSummary)||text(r.summary)||text(r.conclusion);
  body=`## Summary\n\n${bounded(summary||'No structured conclusion was recorded. Inspect Detailed and Evidence; the run status alone is not an analysis conclusion.',1200)}\n`;
  if(requirements.length){body+='\n## What is being asked\n\n'+requirements.slice(0,10).map((v,i)=>`${i+1}. ${bounded(text(record(v).request),180)}`).join('\n');body+='\n\n## Difficulty\n\n| Request | Assessment | Why |\n| --- | --- | --- |\n'+requirements.slice(0,10).map(v=>{const x=record(v);return `| ${cell(x.id)} | ${cell(x.difficulty)||'Not assessed'} | ${cell(x.difficultyReason)||'No reason recorded'} |`;}).join('\n');}
  else if(findings.length)body+='\n## Findings and requested actions\n\n'+findings.slice(0,8).map(v=>{const f=record(v),validation=record(f.validation);return `- **${bounded(text(f.title),140)}** — ${text(f.severity)||'Priority not assessed'}; ${text(validation.state)||'verification unavailable'}. ${bounded(text(f.suggestedRemediation),200)}`;}).join('\n');
  if(requirements.length>10||findings.length>8)body+='\n\nAdditional items are retained in Detailed.';
  if(text(r.overall))body+='\n\n## Overall\n\n'+bounded(text(r.overall),250);
  if(text(r.nextAction))body+='\n\n## Suggested next action\n\n'+bounded(text(r.nextAction),350);
  const assessed=findings.filter(v=>/^difficulty:(SIMPLE|MODERATE|SIGNIFICANT|UNASSESSED)$/.test(text(record(v).category)));
  if(assessed.length)body+='\n\n## Difficulty\n\n| Request | Assessment | Why / next action |\n| --- | --- | --- |\n'+assessed.slice(0,8).map(v=>{const f=record(v);return `| ${cell(f.title)} | ${text(f.category).split(':')[1]} | ${cell(bounded(text(f.suggestedRemediation),160))} |`;}).join('\n');
  const omissions=list(r.areasNotReviewed);body+='\n\n## Limits\n\n'+(omissions.length?'Not reviewed: '+bounded(omissions.map(text).join('; '),400)+'. ':'')+bounded(source.limitations.join(' '),600);
 }else if(profile.view==='detailed'){
  body='## Complete recorded result\n\n'+(source.result!==undefined?'```json\n'+JSON.stringify(source.result,null,2)+'\n```':'No structured report is retained for this run.')+'\n\n## Methodology, calls and evidence references\n\n```json\n'+JSON.stringify({calls:source.calls??[],operations:source.operations},null,2)+'\n```\n\n## Limitations\n\n'+source.limitations.join('\n\n');
 }else body='## Authorised evidence projection\n\n```json\n'+JSON.stringify(source,null,2)+'\n```';
 let content=selectedFormat==='json'?JSON.stringify({schema:'agent-control.report-evidence/v1',runId:source.id,jobId:source.jobId,sourceSha256:catalogue.sourceSha256,derived:true,source},null,2):head+body+footer;
 if(selectedFormat==='text')content=content.replace(/^#{1,6} /gm,'').replace(/^```[^\n]*\n?/gm,'').replace(/\*\*/g,'');
 // Redact once more after formatting, before bytes/hashes leave the service.
 if(content.length>8*1024*1024)throw Error('report_output_too_large');
  // Values were redacted before serialisation; filtering JSON bytes here could corrupt JSON or invalidate source hashes.
 const slug=(s:string)=>s.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'job';
 const ext=selectedFormat==='markdown'?'md':selectedFormat==='text'?'txt':'json';
 return {...catalogue,profile:profile.id,format:selectedFormat,filename:`${slug(source.jobId)}-${slug(source.id)}-${profile.id}-report.${ext}`,mime:selectedFormat==='markdown'?'text/markdown':selectedFormat==='text'?'text/plain':'application/json',content,sha256:reportDigest(content)};
}

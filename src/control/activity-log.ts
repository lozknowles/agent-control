import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {RunRecord} from './job-types.js';
import {redactSensitiveValue} from './security-redaction.js';

export const ACTIVITY_UNAVAILABLE='unavailable' as const;
export type ActivityValue=number|typeof ACTIVITY_UNAVAILABLE;
export interface AuthoritativeActivitySource {at:string;runId:string;type:string;status:string;evidence?:Record<string,unknown>;run?:RunRecord;}
export interface ActivityLogEntry {
  schema:'agent-control.activity/v1';timestamp:string;eventId:string;runId:string;laneId:string;eventType:string;
  provider:string;model:string;tokenUsage:{input:ActivityValue;cachedInput:ActivityValue;output:ActivityValue;total:ActivityValue};
  status:string;evidenceReference:string;
}

const value=(candidate:unknown):string=>typeof candidate==='string'&&candidate.trim()?candidate:ACTIVITY_UNAVAILABLE;
const metric=(candidate:unknown):ActivityValue=>typeof candidate==='number'&&Number.isFinite(candidate)&&candidate>=0?candidate:ACTIVITY_UNAVAILABLE;
const record=(candidate:unknown):Record<string,unknown>=>candidate&&typeof candidate==='object'&&!Array.isArray(candidate)?candidate as Record<string,unknown>:{};
function first(...values:unknown[]){return values.find(item=>item!==undefined&&item!==null);}
function tokens(evidence:Record<string,unknown>){
  const usage=record(first(evidence.tokenUsage,evidence.usage,evidence.cumulative));
  const input=metric(first(usage.input,usage.inputTokens,evidence.inputTokens));
  const cachedInput=metric(first(usage.cachedInput,usage.cachedInputTokens,evidence.cachedInputTokens));
  const output=metric(first(usage.output,usage.outputTokens,evidence.outputTokens));
  const suppliedTotal=metric(first(usage.total,usage.totalTokens,evidence.totalTokens));
  return {input,cachedInput,output,total:suppliedTotal};
}

export function projectActivity(source:AuthoritativeActivitySource):ActivityLogEntry{
  const safe=redactSensitiveValue(source),evidence=record(safe.evidence),route=safe.run?.trigger.modelRoute;
  const identity={timestamp:safe.at,runId:safe.runId,eventType:safe.type,status:safe.status,evidence};
  return redactSensitiveValue({schema:'agent-control.activity/v1',timestamp:safe.at,eventId:`activity-${createHash('sha256').update(JSON.stringify(identity)).digest('hex')}`,runId:safe.runId,laneId:value(evidence.laneId),eventType:safe.type,provider:value(first(evidence.provider,evidence.providerId,route?.providerId)),model:value(first(evidence.model,evidence.modelId,route?.modelId)),tokenUsage:tokens(evidence),status:safe.status,evidenceReference:value(first(evidence.evidenceReference,evidence.artifactId,evidence.artifact,evidence.evidenceId))});
}

export function activityLogPaths(stateRoot:string,environment:NodeJS.ProcessEnv=process.env,platform:NodeJS.Platform=process.platform){
  const privatePath=path.join(stateRoot,'logs','activity.jsonl'),android=platform==='android'||Boolean(environment.ANDROID_ROOT);
  return {preferred:environment.AGENT_CONTROL_ACTIVITY_LOG||(!android&&platform==='linux'?'/var/log/agent-control/activity.jsonl':privatePath),fallback:privatePath};
}

export class ActivityLogProjection{
  private activePath:string|undefined;
  constructor(readonly preferredPath:string,readonly fallbackPath:string=preferredPath){}
  append(source:AuthoritativeActivitySource){
    const entry=projectActivity(source),line=`${JSON.stringify(entry)}\n`,candidates=[this.activePath,this.preferredPath,this.fallbackPath].filter((item,index,all):item is string=>Boolean(item)&&all.indexOf(item)===index);
    let failure:unknown;
    for(const file of candidates)try{fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o750});fs.appendFileSync(file,line,{mode:0o640,flush:true});if(process.platform!=='win32')fs.chmodSync(file,0o640);this.activePath=file;return {entry,path:file};}catch(error){failure=error;this.activePath=undefined;}
    throw failure instanceof Error?failure:new Error('activity_log_unavailable');
  }
  path(){return this.activePath??this.preferredPath;}
}

export function createActivityLogProjection(stateRoot:string,environment:NodeJS.ProcessEnv=process.env,platform:NodeJS.Platform=process.platform){const paths=activityLogPaths(stateRoot,environment,platform);return new ActivityLogProjection(paths.preferred,paths.fallback);}

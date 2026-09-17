import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export interface EnvironmentCheck {id:string;mandatory:boolean;expected:string;observed:unknown;status:'PASS'|'FAIL'|'UNKNOWN';reason:string;timestamp:string;}
export function environmentResult(checks:EnvironmentCheck[]):EnvironmentCheck['status'] {const required=checks.filter(c=>c.mandatory);return !required.length?'UNKNOWN':required.some(c=>c.status==='FAIL')?'FAIL':required.some(c=>c.status!=='PASS')?'UNKNOWN':'PASS';}
export interface ResetObservation {bootId:string;physicalIdentity:string;environmentVerified:boolean;components?:EnvironmentCheck[];service:{identity:boolean;healthy:boolean;expected:boolean;restored?:boolean};}
export interface ResetPort {diagnose?():Promise<{components:EnvironmentCheck[]}>;observe():Promise<ResetObservation>;reboot():Promise<void>;restore(bootId:string):Promise<ResetObservation>;}
export interface ResetAuthority {actor:string;reason:string;requestKey:string;expiresAt:string;approveReset:boolean;runId?:string;}
export interface ResetReceipt {id:string;target:string;environment:string;configHash:string;authority:ResetAuthority;startedAt:string;endedAt?:string;status:'PENDING'|'COMPLETE'|'FAILED';generation:number;pre?:ResetObservation;post?:ResetObservation;disappeared?:boolean;error?:string;}
export class TargetReset {
 private busy=false;
 async diagnose(actor:string){
  if(!actor?.trim())throw Error('target_diagnostic_authority_required');
  if(this.busy)throw Error('target_reset_in_progress');
  if(!this.port.diagnose)throw Error('target_diagnostic_unsupported');
  this.busy=true;
  try{const result=await this.port.diagnose();const receipt={schema:'agent-control.target-environment/v1',id:'target-environment-'+randomUUID(),target:this.target,environment:this.environment,configHash:this.configHash,actor,observedAt:new Date(this.now()).toISOString(),status:environmentResult(result.components),components:result.components,targetMutations:0,modelCalls:0,benchmarkFixtures:0};fs.writeFileSync(path.join(this.directory,receipt.id+'.json'),JSON.stringify(receipt,null,2),{mode:0o600,flag:'wx',flush:true});return receipt;}finally{this.busy=false;}
 }
 constructor(readonly directory:string,readonly target:string,readonly environment:string,readonly configHash:string,readonly port:ResetPort,readonly options:{now?:()=>number;pause?:(ms:number)=>Promise<void>;timeoutMs?:number}={}){fs.mkdirSync(directory,{recursive:true,mode:0o700});}
 private abandonedFile(){return path.join(this.directory,this.key()+'.abandoned.json');}
 abandoned():string[]{return fs.existsSync(this.abandonedFile())?JSON.parse(fs.readFileSync(this.abandonedFile(),'utf8')):[];}
 assertAttempt(id:unknown){if(typeof id==='string'&&this.abandoned().includes(id))throw Error('target_attempt_permanently_fenced');}
 abandon(ids:string[]){const s=this.state();if(!s||s.status!=='COMPLETE')throw Error('target_boundary_not_complete');const all=[...new Set([...this.abandoned(),...ids])];const f=this.abandonedFile();fs.writeFileSync(f+'.tmp',JSON.stringify(all),{mode:0o600,flush:true});fs.renameSync(f+'.tmp',f);this.event(s,'LEGACY_ATTEMPTS_FENCED',{attemptIds:ids,historicalTermination:'UNPROVEN'});}
 private now(){return this.options.now?.()??Date.now();}
 private key(){return createHash('sha256').update(this.target).digest('hex');}
 private stateFile(){return path.join(this.directory,this.key()+'.json');}
 state():ResetReceipt|undefined{return fs.existsSync(this.stateFile())?JSON.parse(fs.readFileSync(this.stateFile(),'utf8')):undefined;}
 private save(v:ResetReceipt){const f=this.stateFile();fs.writeFileSync(f+'.tmp',JSON.stringify(v),{mode:0o600,flush:true});fs.renameSync(f+'.tmp',f);const request=path.join(this.directory,this.key()+'-'+createHash('sha256').update(v.authority.requestKey).digest('hex')+'.receipt.json');fs.writeFileSync(request+'.tmp',JSON.stringify(v),{mode:0o600,flush:true});fs.renameSync(request+'.tmp',request);}
 private event(v:ResetReceipt,type:string,data:unknown={}){fs.appendFileSync(path.join(this.directory,v.id+'.jsonl'),JSON.stringify({at:new Date(this.now()).toISOString(),operationId:v.id,target:this.target,environment:this.environment,type,data})+'\n',{mode:0o600,flush:true});}
 assertGeneration(generation:number){const s=this.state();if(s&&(s.status!=='COMPLETE'||s.generation!==generation))throw Error('target_generation_fenced');}
 generation(){const s=this.state();if(s&&s.status!=='COMPLETE')throw Error('target_recovery_quarantined');return s?.generation??0;}
 private valid(o:ResetObservation){if(!/^[a-f0-9-]{36}$/i.test(o.bootId)||!o.physicalIdentity||!o.environmentVerified)throw Error('target_identity_or_environment_unverified');}
 async reset(a:ResetAuthority):Promise<ResetReceipt&{replayed?:boolean}>{
  if(!a.approveReset||!a.actor?.trim()||!a.reason?.trim()||a.reason.length>500||!/^[a-zA-Z0-9._-]{1,100}$/.test(a.requestKey)||!Number.isFinite(Date.parse(a.expiresAt))||Date.parse(a.expiresAt)<=this.now()||Date.parse(a.expiresAt)-this.now()>3600000)throw Error('target_reset_authority_required');
  if(this.busy)throw Error('target_reset_in_progress');const old=this.state();const priorFile=path.join(this.directory,this.key()+'-'+createHash('sha256').update(a.requestKey).digest('hex')+'.receipt.json');const prior:ResetReceipt|undefined=fs.existsSync(priorFile)?JSON.parse(fs.readFileSync(priorFile,'utf8')):undefined;
  if(prior){if(prior.authority.actor!==a.actor||prior.configHash!==this.configHash||prior.authority.runId!==a.runId)throw Error('target_reset_receipt_binding_mismatch');return {...prior,replayed:true};}
  if(old?.authority.requestKey===a.requestKey){if(old.authority.actor!==a.actor||old.configHash!==this.configHash||old.authority.runId!==a.runId)throw Error('target_reset_receipt_binding_mismatch');return {...old,replayed:true};}
  if(old&&old.status!=='COMPLETE')throw Error('target_recovery_quarantined');
  this.busy=true;const v:ResetReceipt={id:'target-reset-'+randomUUID(),target:this.target,environment:this.environment,configHash:this.configHash,authority:a,startedAt:new Date(this.now()).toISOString(),status:'PENDING',generation:(old?.generation??0)+1};
  try{
   this.save(v);this.event(v,'RESET_AUTHORISED',{authority:a,configHash:this.configHash});
   v.pre=await this.port.observe();this.valid(v.pre);this.event(v,'PRE_RESET',v.pre);this.save(v);
   if(Date.parse(a.expiresAt)<=this.now())throw Error('target_reset_authority_expired');
   await this.port.reboot();this.event(v,'RESET_ACKNOWLEDGED');
   const until=this.now()+Math.min(600000,Math.max(1000,this.options.timeoutMs??240000));let observed:ResetObservation|undefined;
   while(this.now()<until){
    try{observed=await this.port.observe();this.valid(observed);if(observed.physicalIdentity!==v.pre.physicalIdentity)throw Error('returned_target_identity_mismatch');if(v.disappeared&&observed.bootId!==v.pre.bootId)break;}
    catch(e){if(e instanceof Error&&/identity|environment/.test(e.message))throw e;v.disappeared=true;this.event(v,'TARGET_UNAVAILABLE');}
    await (this.options.pause?.(2000)??new Promise(resolve=>setTimeout(resolve,2000)));
   }
   if(!v.disappeared)throw Error('target_disappearance_unconfirmed');
   if(!observed||observed.bootId===v.pre.bootId)throw Error('changed_boot_identity_unconfirmed');
   this.event(v,'BOOT_BOUNDARY_VERIFIED',observed);
   v.post=await this.port.restore(observed.bootId);this.valid(v.post);
   if(v.post.bootId!==observed.bootId||v.post.physicalIdentity!==v.pre.physicalIdentity)throw Error('post_restoration_identity_mismatch');
   if(!v.post.service.identity||!v.post.service.healthy||!v.post.service.expected)throw Error('protected_service_verification_failed');
   v.status='COMPLETE';this.event(v,'RECOVERY_COMPLETE',v.post);
  }catch(e){v.status='FAILED';v.error=e instanceof Error&&/^[a-z_]+$/.test(e.message)?e.message:'target_recovery_operation_failed';this.event(v,'RECOVERY_FAILED',{error:v.error});}
  finally{v.endedAt=new Date(this.now()).toISOString();this.save(v);this.busy=false;}
  return v;
 }
}

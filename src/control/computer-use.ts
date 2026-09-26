import {randomUUID} from 'node:crypto';
import {redactSensitiveValue, containsSensitiveMaterial} from './security-redaction.js';

export type ComputerOperation = 'observe'|'inspect'|'screenshot'|'click'|'doubleClick'|'typeText'|'pasteText'|'pressKey'|'scroll'|'drag'|'focusWindow'|'focusTab'|'newTab'|'navigate'|'wait';
export type ComputerOutcome = 'COMPLETE'|'PARTIAL'|'BLOCKED'|'FAILED'|'APPROVAL_REQUIRED'|'PROVIDER_UNAVAILABLE'|'VERIFICATION_FAILED';
export type ComputerPhase = 'OBSERVE'|'ACTION'|'VERIFY'|'APPROVAL'|'RECOVERY'|'COMPLETE'|'BLOCKED';
export interface ComputerTarget {machine:string; application?:string; window?:string; browser?:string; tab?:string;}
export interface ComputerElement {id:string; role?:string; name?:string; text?:string;}
export interface ComputerObservation {revision:string; at:string; target:ComputerTarget; elements:ComputerElement[]; text?:string; url?:string; title?:string; screenshot?:{sha256:string; mediaType:'image/png'; evidenceRef?:string};}
export interface ComputerAction {operation:ComputerOperation; revision?:string; elementId?:string; text?:string; url?:string; key?:string; deltaX?:number; deltaY?:number; source?:{x:number;y:number}; destination?:{x:number;y:number}; window?:string; tab?:string; timeoutMs?:number;}
export interface ComputerCapability {operations:ComputerOperation[]; targeting:('accessibility'|'selector'|'coordinate')[]; persistentSession:boolean; screenshots:boolean;}
export interface ComputerSession {observe():Promise<ComputerObservation>; act(action:ComputerAction):Promise<{detail:string}>; close():Promise<void>;}
export interface ComputerProvider {id:string; capabilities():ComputerCapability; available(target:ComputerTarget):Promise<boolean>; open(target:ComputerTarget, signal?:AbortSignal):Promise<ComputerSession>;}
export interface ComputerCheck {kind:'element'|'text'|'url'|'title'; value:string;}
export interface ComputerTask {taskId:string; requestedOutcome:string; target:ComputerTarget; steps:ComputerAction[]; checks:ComputerCheck[]; providerPreference?:string[]; maxRetries?:number; videoEvidence?:boolean;}
export interface ComputerEvent {at:string; phase:ComputerPhase; provider:string; taskId:string; observationRevision?:string; operation?:ComputerOperation; detail:string;}
export interface ComputerEvidence {schema:'agent-control.computer-use/v1'; taskId:string; provider:string|null; target:ComputerTarget; requestedOutcome:string; startedAt:string; endedAt:string; status:ComputerOutcome; events:ComputerEvent[]; observations:ComputerObservation[]; checks:Array<{check:ComputerCheck;passed:boolean}>; actions:Array<{at:string;operation:ComputerOperation;detail:string}>; retries:number; providerFallbacks:number; approval:{required:boolean;received:boolean}; videoEvidence:{requested:boolean;recordingRef:null}; reason?:string;}
export interface ComputerAuthority {authorize(task:ComputerTask, action:ComputerAction, observation:ComputerObservation):'ALLOW'|'APPROVAL_REQUIRED'|'BLOCKED';}

const supportedOperations:ComputerOperation[]=['observe','inspect','screenshot','click','doubleClick','typeText','pasteText','pressKey','scroll','drag','focusWindow','focusTab','newTab','navigate','wait'];
const sensitiveAction=(action:ComputerAction)=> (action.text !== undefined && containsSensitiveMaterial(action.text))||(action.url !== undefined && containsSensitiveMaterial(action.url));
export class DefaultComputerAuthority implements ComputerAuthority {
  authorize(task:ComputerTask, action:ComputerAction, observation:ComputerObservation) {
    if(sensitiveAction(action))return 'BLOCKED';
    const selected=observation.elements.find(item=>item.id===action.elementId);
    if(/\b(?:publish|send|upload|delete|remove|purchase|accept|permission|credential|security|sign out)\b/i.test(`${selected?.name??''} ${selected?.text??''}`))return 'APPROVAL_REQUIRED';
    if(['http:','https:'].includes((()=>{try{return new URL(action.url??'').protocol;}catch{return '';}})()) && action.url && /(?:\/logout|\/delete|\/admin|\/settings|\/checkout|\/publish)(?:\/|\?|$)/i.test(action.url))return 'APPROVAL_REQUIRED';
    if(/\b(?:publish|send|upload|delete|remove|purchase|accept|permission|credential|security)\b/i.test(task.requestedOutcome))return 'APPROVAL_REQUIRED';
    if(action.operation==='pasteText'||action.operation==='drag'||action.operation==='screenshot')return 'APPROVAL_REQUIRED';
    return 'ALLOW';
  }
}
export class ComputerProviderRegistry {
  private readonly providers=new Map<string,ComputerProvider>();
  register(provider:ComputerProvider){if(!provider.id||this.providers.has(provider.id))throw Error('computer_provider_duplicate_or_invalid');const operations=provider.capabilities().operations;if(operations.some(item=>!supportedOperations.includes(item)))throw Error('computer_provider_capability_invalid');this.providers.set(provider.id,provider);return this;}
  list(){return [...this.providers.values()].map(item=>({id:item.id,capabilities:item.capabilities()}));}
  candidates(task:ComputerTask){const order=task.providerPreference??[...this.providers.keys()];return order.map(id=>this.providers.get(id)).filter((item):item is ComputerProvider=>Boolean(item));}
}
const safe=<T>(value:T):T=>redactSensitiveValue(value);
function check(observation:ComputerObservation, item:ComputerCheck){
  const value=item.value.toLocaleLowerCase();
  if(item.kind==='url')return observation.url===item.value;
  if(item.kind==='title')return observation.title===item.value;
  if(item.kind==='text')return (observation.text??'').toLocaleLowerCase().includes(value);
  return observation.elements.some(element=>element.id===item.value||element.name?.toLocaleLowerCase()===value);
}
export class ComputerUseCapability {
  constructor(readonly registry:ComputerProviderRegistry,readonly authority:ComputerAuthority=new DefaultComputerAuthority(),readonly emit?:(event:ComputerEvent)=>void){}
  async execute(task:ComputerTask,signal?:AbortSignal):Promise<ComputerEvidence>{
    if(!task||typeof task.taskId!=='string'||!task.taskId||typeof task.requestedOutcome!=='string'||!task.requestedOutcome||task.requestedOutcome.length>2000||!task.target||typeof task.target.machine!=='string'||!task.target.machine||!Array.isArray(task.checks)||!task.checks.length||task.checks.length>16||task.checks.some(item=>!item||!['element','text','url','title'].includes(item.kind)||typeof item.value!=='string'||!item.value||item.value.length>2000)||!Array.isArray(task.steps)||task.steps.length>32||task.steps.some(step=>!step||!supportedOperations.includes(step.operation)||typeof step.text==='string'&&step.text.length>8000))throw Error('computer_task_invalid');
    const evidence:ComputerEvidence={schema:'agent-control.computer-use/v1',taskId:task.taskId,provider:null,target:safe(task.target),requestedOutcome:safe(task.requestedOutcome),startedAt:new Date().toISOString(),endedAt:'',status:'PROVIDER_UNAVAILABLE',events:[],observations:[],checks:[],actions:[],retries:0,providerFallbacks:0,approval:{required:false,received:false},videoEvidence:{requested:Boolean(task.videoEvidence),recordingRef:null}};
    const event=(phase:ComputerPhase,provider:string,detail:string,observationRevision?:string,operation?:ComputerOperation)=>{const row:ComputerEvent={at:new Date().toISOString(),phase,provider,taskId:task.taskId,detail:safe(detail),...(observationRevision?{observationRevision}:{}),...(operation?{operation}:{})};evidence.events.push(row);try{this.emit?.(row);}catch{/* Optional observers cannot impair governed execution. */}};
    try{
      if(task.videoEvidence){evidence.status='BLOCKED';evidence.reason='video_evidence_recording_unavailable';event('BLOCKED','none',evidence.reason);return evidence;}
      const candidates=this.registry.candidates(task);
      for(let index=0;index<candidates.length;index++){
        const provider=candidates[index]!;if(index)evidence.providerFallbacks++;
        evidence.reason=undefined;
        if(signal?.aborted){evidence.status='BLOCKED';evidence.reason='cancelled';break;}
        let available=false;try{available=await provider.available(task.target);}catch(error){event('RECOVERY',provider.id,safe(error instanceof Error?error.message:String(error)));}
        if(!available){event('BLOCKED',provider.id,'provider_unavailable');continue;}
        evidence.provider=provider.id;let session:ComputerSession|undefined;
        try{
          session=await provider.open(task.target,signal);
          let observation=await session.observe();evidence.observations.push(safe(observation));event('OBSERVE',provider.id,'initial_state',observation.revision);
          const supported=new Set(provider.capabilities().operations);
          for(const action of task.steps){
            if(signal?.aborted){evidence.status='BLOCKED';evidence.reason='cancelled';break;}
            if(!supported.has(action.operation)){evidence.status='BLOCKED';evidence.reason=`operation_unsupported:${action.operation}`;break;}
            const decision=this.authority.authorize(task,action,observation);
            if(decision!=='ALLOW'){evidence.status=decision;evidence.reason=`policy_${decision.toLowerCase()}`;evidence.approval.required=decision==='APPROVAL_REQUIRED';event(decision==='APPROVAL_REQUIRED'?'APPROVAL':'BLOCKED',provider.id,evidence.reason);break;}
            if(action.revision&&action.revision!==observation.revision){evidence.status='BLOCKED';evidence.reason='stale_observation';event('BLOCKED',provider.id,'stale_observation');break;}
            const boundAction={...action,revision:observation.revision};
            let done=false;
            for(let attempt=0;attempt<=Math.min(Math.max(task.maxRetries??0,0),2);attempt++){
              try{const result=await session.act(boundAction);evidence.actions.push({at:new Date().toISOString(),operation:action.operation,detail:safe(result.detail)});event('ACTION',provider.id,result.detail,observation.revision,action.operation);done=true;break;}
              catch(error){
                if(attempt>=Math.min(Math.max(task.maxRetries??0,0),2)||action.operation!=='typeText'||(error as Error).message!=='stale_element')throw error;
                const prior=observation.elements.find(item=>item.id===boundAction.elementId);
                const fresh=await session.observe();evidence.observations.push(safe(fresh));
                const current=fresh.elements.find(item=>item.id===boundAction.elementId);
                if(!prior||!current||prior.role!==current.role||prior.name!==current.name){evidence.status='BLOCKED';evidence.reason='stale_observation';event('BLOCKED',provider.id,evidence.reason);break;}
                observation=fresh;boundAction.revision=fresh.revision;evidence.retries++;event('RECOVERY',provider.id,'stable_semantic_target_rebound',fresh.revision);
              }
            }
            if(!done)break;
            observation=await session.observe();evidence.observations.push(safe(observation));event('OBSERVE',provider.id,'fresh_state',observation.revision);
          }
          if(evidence.reason)break;
          // The final observation is independent of action acknowledgements.
          observation=await session.observe();evidence.observations.push(safe(observation));
          evidence.checks=task.checks.map(item=>({check:safe(item),passed:check(observation,item)}));event('VERIFY',provider.id,evidence.checks.every(item=>item.passed)?'checks_passed':'checks_failed',observation.revision);
          evidence.status=evidence.checks.every(item=>item.passed)?'COMPLETE':'VERIFICATION_FAILED';
          if(evidence.status==='COMPLETE')event('COMPLETE',provider.id,'observed_requested_state',observation.revision);else evidence.reason='verification_failed';
          break;
        }catch(error){evidence.status='FAILED';evidence.reason=safe(error instanceof Error?error.message:String(error));event('RECOVERY',provider.id,evidence.reason);if(evidence.actions.length)break;}
        finally{await session?.close().catch(()=>{});}
      }
      if(!candidates.length)evidence.reason='no_provider_registered';
      return evidence;
    }finally{evidence.endedAt=new Date().toISOString();}
  }
}
export function newComputerTaskId(){return `computer-${randomUUID()}`;}

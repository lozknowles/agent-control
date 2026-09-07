import type {VoiceTurn} from './realtime-voice.js';
import type {VoiceWorkOrigin} from './work-parcels.js';

export interface VoiceWorkDecision {
  text:string;
  kind:'clarification'|'status'|'steering'|'cancellation'|'proposal';
  detail:Record<string,unknown>;
}

export interface VoiceWorkInteraction {
  handle(input:{sessionId:string;actor:string;user:string;audioReference?:string;rawStt:string;turns:readonly VoiceTurn[];signal:AbortSignal}):Promise<VoiceWorkDecision|undefined>;
  nextNotification?(sessionId:string):Promise<VoiceWorkDecision|undefined>;
}

export interface GovernedVoiceWorkPort {
  start(input:{origin:VoiceWorkOrigin;actor:string}):Promise<{id:string;status:string;workModel:string;routeReason:string}>;
  status(id:string):Promise<{status:string;phase?:string;summary?:string}>;
  steer(id:string,instruction:string,actor:string):Promise<{status:string}>;
  cancel(id:string,actor:string):Promise<{status:string}>;
}

type Draft={originalRequest:string;clarifications:string[];createdAt:string};

/**
 * A conservative, provider-neutral boundary between live conversation and governed work.
 * It captures likely work durably through the voice event stream and asks for missing
 * constraints. It never creates or executes a Work Parcel itself.
 */
export class ConversationalWorkIntent implements VoiceWorkInteraction {
  private readonly drafts=new Map<string,Draft>();
  private readonly active=new Map<string,string[]>();
  private readonly notified=new Set<string>();
  constructor(private readonly port?:GovernedVoiceWorkPort,private readonly clock=()=>new Date()){}
  async handle(input:{sessionId:string;actor:string;user:string;audioReference?:string;rawStt:string;turns:readonly VoiceTurn[];signal:AbortSignal}){
    input.signal.throwIfAborted();
    const text=input.rawStt.trim(),draft=this.drafts.get(input.sessionId);
    const jobs=this.active.get(input.sessionId)??[];
    if(jobs.length===1&&/^(?:how(?: is|'s) (?:that|it) getting on|status(?: of)? (?:that|it)|what is the status)[.!?]*$/i.test(text)){
      const state=await this.port!.status(jobs[0]);return {kind:'status' as const,text:spokenStatus(jobs[0],state),detail:{workParcelId:jobs[0],...state}};
    }
    if(jobs.length>1&&/^(?:how(?: is|'s) (?:that|it) getting on|status(?: of)? (?:that|it)|what is the status)[.!?]*$/i.test(text))return {kind:'clarification' as const,text:'Which job do you mean?',detail:{candidateWorkParcelIds:jobs,reason:'Ambiguous status reference'}};
    if(jobs.length===1&&/\b(?:also|actually|instead)\b[\s\S]{0,100}\bCSV\b/i.test(text)){const state=await this.port!.steer(jobs[0],text,input.actor);return {kind:'steering' as const,text:`I added CSV output to the governed work. Its status is ${state.status.toLowerCase()}.`,detail:{workParcelId:jobs[0],exactSteering:text,status:state.status}};}
    if(jobs.length===1&&/^(?:cancel|cancel that|stop that)[.!?]*$/i.test(text)){const state=await this.port!.cancel(jobs[0],input.actor);return {kind:'cancellation' as const,text:`Cancellation for the linked job is ${state.status.toLowerCase()}.`,detail:{workParcelId:jobs[0],exactCancellation:text,status:state.status}};}
    if(jobs.length>1&&/^(?:cancel|cancel that|stop that)[.!?]*$/i.test(text))return {kind:'clarification' as const,text:'Which job do you want to cancel?',detail:{candidateWorkParcelIds:jobs,reason:'Ambiguous cancellation reference'}};
    if(!draft&&isQualifiedSandboxDuplicateRequest(text)&&this.port){
      const at=this.clock().toISOString(),origin:VoiceWorkOrigin={schema:'agent-control.voice-work-origin/v1',interface:'realtime-voice',voiceSessionId:input.sessionId,requestId:`${input.sessionId}:${at}`,at,user:input.user,audio:{retention:input.audioReference?'retained':'not-retained',...(input.audioReference?{reference:input.audioReference}:{})},rawStt:text,clarifications:[],effectiveRequest:'Create and test in an isolated workspace a Python utility that scans a supplied test directory, identifies duplicate files by content, preserves every input file, and produces a human-readable report.'};
      const work=await this.port.start({origin,actor:input.actor});this.active.set(input.sessionId,[...jobs,work.id]);return {kind:'proposal' as const,text:`I started governed job ${shortId(work.id)} to build and test the duplicate-file report in an isolated workspace. It will not touch real files.`,detail:{taskClass:'coding',risk:'LOW',originalRequest:text,effectiveRequest:origin.effectiveRequest,workParcelId:work.id,status:work.status,workModel:work.workModel,routeReason:work.routeReason}};
    }
    if(!draft&&isCodingWork(text)){
      this.drafts.set(input.sessionId,{originalRequest:text,clarifications:[],createdAt:new Date().toISOString()});
      return {kind:'clarification' as const,text:'What should the script do, and should I only build and test it in a safe workspace?',detail:{taskClass:'coding',risk:'LOW_PENDING_SCOPE',originalRequest:text,modelInvoked:false,workParcelCreated:false,reason:'Coding intent needs an effective request and execution boundary before governed work can start'}};
    }
    if(draft&&/^(?:cancel|cancel that|never mind|stop that)[.!?]*$/i.test(text)){
      this.drafts.delete(input.sessionId);
      return {kind:'cancellation' as const,text:'I cancelled the proposed work. No job was started.',detail:{originalRequest:draft.originalRequest,workParcelCreated:false,reason:'Cancelled before Work Parcel creation'}};
    }
    if(!draft&&/^(?:how(?: is|'s) (?:that|it) getting on|status(?: of)? (?:that|it)|what is the status)[.!?]*$/i.test(text))return {kind:'status' as const,text:'There is no governed job linked to this conversation yet.',detail:{resolvedJobs:[],reason:'No active conversational work reference'}};
    return undefined;
  }
  async nextNotification(sessionId:string){for(const id of this.active.get(sessionId)??[]){if(this.notified.has(id))continue;const state=await this.port!.status(id);if(!['SUCCEEDED','FAILED','CANCELLED'].includes(state.status))continue;this.notified.add(id);const passed=state.status==='SUCCEEDED';return{kind:'status' as const,text:passed?`Job ${shortId(id)} is finished. The script passed its isolated tests and no real files were touched.`:`Job ${shortId(id)} ended with status ${state.status.toLowerCase()}.`,detail:{workParcelId:id,...state,automaticCompletionNotification:true}};}return undefined;}
}

function shortId(id:string){return id.startsWith('parcel-voice-')?id.slice(13,21):id.slice(0,12);}
function spokenStatus(id:string,state:{status:string;phase?:string;summary?:string}){const detail=state.summary??state.phase;return `Job ${shortId(id)} is ${state.status.toLowerCase()}${detail?`. ${detail}`:'.'}`;}
function isQualifiedSandboxDuplicateRequest(text:string){return isCodingWork(text)&&/\bduplicate(?:s| files?| photos?| photographs?)?\b/i.test(text)&&/\breport\b/i.test(text)&&/\btest (?:directory|folder|workspace)\b/i.test(text);}

function isCodingWork(text:string){
  return /\b(?:write|create|build|make|develop)\b[\s\S]{0,120}\b(?:python|javascript|typescript|shell|bash|powershell|code|script|program|utility|app)\b/i.test(text)
    || /\b(?:python|javascript|typescript|shell|bash|powershell)\b[\s\S]{0,120}\b(?:script|program|utility|app)\b/i.test(text);
}

import type {JobCatalog} from './job-catalog.js';
import {ActionFailure,type ActionRegistry} from './job-runtime.js';

export interface AskCollinghamStackEvidence {
  conversationProvider:string;
  model:string;
  runtime:string;
  retrieval:string;
  qualificationReference:string;
}
export interface AskCollinghamAnswer {
  answer:string;
  sources:unknown[];
  answerId:string|null;
  observations:Array<{type:string;at:string;detail:Record<string,unknown>}>;
  stack:AskCollinghamStackEvidence;
}
type Fetch=typeof fetch;
const routePattern=/^\/api\/ask-collingham\/embed\/[A-Za-z0-9_-]{8,128}\/stream-chat$/;

/**
 * Bounded loopback adapter for the existing guarded Ask Collingham endpoint.
 * It owns no model, retrieval or policy logic. The LocalWalks route remains the
 * authority for Qwen/AnythingLLM/LanceDB and this adapter only observes SSE.
 */
export class AskCollinghamClient {
  private readonly endpoint:URL;
  constructor(private readonly options:{baseUrl:string;streamPath:string;stack:AskCollinghamStackEvidence;timeoutMs?:number;request?:Fetch}){
    const base=new URL(options.baseUrl);
    if(base.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||base.username||base.password||base.search||base.hash)throw Error('ask_collingham_loopback_required');
    if(!routePattern.test(options.streamPath))throw Error('ask_collingham_route_invalid');
    this.endpoint=new URL(options.streamPath,base);
  }
  async query(question:string,sessionId:string,signal?:AbortSignal):Promise<AskCollinghamAnswer>{
    question=question.trim();sessionId=sessionId.trim();
    if(!question||question.length>4000||!sessionId.match(/^[A-Za-z0-9_-]{8,128}$/))throw Error('ask_collingham_request_invalid');
    const timeout=AbortSignal.timeout(this.options.timeoutMs??125_000),combined=signal?AbortSignal.any([signal,timeout]):timeout,request=this.options.request??fetch;
    const observations:AskCollinghamAnswer['observations']=[],observe=(type:string,detail:Record<string,unknown>={})=>observations.push({type,at:new Date().toISOString(),detail});
    observe('ask_collingham.request.started',{endpoint:'loopback guarded Ask Collingham route',questionCharacters:question.length});
    let response:Response;
    try{response=await request(this.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'text/event-stream'},body:JSON.stringify({message:question,sessionId}),signal:combined,redirect:'error'});}catch(error){throw new ActionFailure(error instanceof DOMException&&error.name==='TimeoutError'?'ask_collingham_timeout':'ask_collingham_transport_unavailable','capability_unavailable',true,'transient-transport');}
    if(!response.ok||!response.body)throw new ActionFailure(`ask_collingham_http_${response.status}`,'capability_unavailable',response.status>=500,'transient-transport');
    const reader=response.body.getReader(),decoder=new TextDecoder(),chunks:string[]=[];let buffer='',final:Record<string,unknown>|null=null,events=0,first=true,total=0;
    const accept=(line:string)=>{
      if(!line.startsWith('data:'))return;let value:unknown;try{value=JSON.parse(line.slice(5).trim());}catch{return;}if(!value||typeof value!=='object'||Array.isArray(value))return;
      const event=value as Record<string,unknown>;events++;if(first){first=false;observe('ask_collingham.response.first_event',{eventType:String(event.type??'unavailable')});}
      const text=typeof event.textResponse==='string'?event.textResponse:'';if(String(event.type??'')==='textResponseChunk'&&text)chunks.push(text);
      if(text&&(event.close===true||event.complete===true||String(event.type??'')==='textResponse'))final=event;
    };
    try{for(;;){const next=await reader.read();if(next.done)break;total+=next.value.length;if(total>4*1024*1024)throw new ActionFailure('ask_collingham_response_too_large','verification');buffer+=decoder.decode(next.value,{stream:true});let split;while((split=buffer.indexOf('\n'))>=0){accept(buffer.slice(0,split).trimEnd());buffer=buffer.slice(split+1);}}buffer+=decoder.decode();if(buffer.trim())accept(buffer.trim());}finally{reader.releaseLock();}
    const finalEvent=(final??{}) as Record<string,unknown>,answer=String(finalEvent.textResponse??chunks.join('')).trim();
    if(!answer)throw new ActionFailure('ask_collingham_no_deliverable_answer','verification');
    if(answer.length>32_000)throw new ActionFailure('ask_collingham_answer_too_large','verification');
    observe('ask_collingham.response.validated',{eventCount:events,answerCharacters:answer.length,sourceCount:Array.isArray(finalEvent.sources)?finalEvent.sources.length:0});
    return{answer,sources:Array.isArray(finalEvent.sources)?finalEvent.sources:[],answerId:typeof finalEvent.answerId==='string'?finalEvent.answerId:typeof finalEvent.requestId==='string'?finalEvent.requestId:null,observations,stack:structuredClone(this.options.stack)};
  }
}

export const ASK_COLLINGHAM_ACTION='mallow.ask-collingham@1.0.0';
export const ASK_COLLINGHAM_JOB='mallow-ask-collingham@1.0.0';
export function registerAskCollinghamJob(actions:ActionRegistry,catalog:JobCatalog,client:AskCollinghamClient){
  actions.registerReadOnly(ASK_COLLINGHAM_ACTION,async context=>{
    const question=String(context.parameters.question??''),sessionId=String(context.parameters.sessionId??'');
    const result=await client.query(question,sessionId,context.signal);
    return{artifacts:[{name:'ask-collingham-answer',value:result,type:'application/json',schema:'agent-control.ask-collingham-answer',version:'1.0.0',retention:'evidence'}],evidence:[result.stack.qualificationReference],verification:['guarded endpoint returned a non-empty deliverable answer'],detail:'Real Ask Collingham answer retained through Agent Control JobRuntime.'};
  });
  catalog.addJob({apiVersion:'agent-control/v1',kind:'Job',metadata:{id:'mallow-ask-collingham',name:'Mallow Ask Collingham',version:'1.0.0',description:'Ask the existing guarded Collingham knowledge service and retain the answer as governed evidence.'},spec:{priority:'normal',concurrency:'allow',parameters:{question:{type:'string',required:true},sessionId:{type:'string',required:true}},steps:[{id:'ask',action:ASK_COLLINGHAM_ACTION,requires:['collingham.query'],timeoutSeconds:130,outputs:[{name:'ask-collingham-answer',type:'application/json',schema:'agent-control.ask-collingham-answer',version:'1.0.0',retention:'evidence'}],verification:['guarded endpoint returned a non-empty deliverable answer']}]}});
}

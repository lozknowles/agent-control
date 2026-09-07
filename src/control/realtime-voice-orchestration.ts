import type {ModelRegistry} from './model-registry.js';
import {OpenAICompatibleProviderClient} from './openai-compatible-provider.js';
import type {VoiceOrchestration,VoiceTurn} from './realtime-voice.js';

export interface VoiceTool {invoke(input:unknown,signal:AbortSignal):Promise<string>;}

const operationalImperative=/^[\s\"'“‘]*(proceed|initiate|execute|run|scan|deploy|delete|restart|connect|move|open|list|retrieve|repeat|confirm|provide|give|send)\b/i;
const operationalRequest=/\b(proceed|initiate|execute|run|scan|deploy|delete|restart|connect|move|open|list|retrieve|repeat|confirm|provide|give|send)\b/i;

function safeSpokenResponse(text:string,turns:readonly VoiceTurn[]):string{
  const latest=[...turns].reverse().find(turn=>turn.role==='user')?.text??'';
  if(operationalImperative.test(text)&&!operationalRequest.test(latest))return 'I did not catch that. Please say it again.';
  return text;
}

/** Routes every turn through Agent Control's qualified model registry, while the configured voice remains independent. */
export class RoutedVoiceOrchestration implements VoiceOrchestration {
  constructor(private readonly registry:ModelRegistry,private readonly role:string,private readonly tools:Readonly<Record<string,VoiceTool>>={}){}
  async respond(input:{sessionId:string;actor:string;turns:readonly VoiceTurn[];signal:AbortSignal;tool:(name:string,input:unknown)=>Promise<string>}){
    const route=this.registry.route({modelRole:this.role,nodeId:'controller',requiredCapabilities:['conversation'],allowFallback:true});
    const provider=this.registry.provider(route.providerId),model=this.registry.model(route.modelId);if(!provider||!model)throw new Error('voice_route_invalid');
    const history=JSON.stringify(input.turns.slice(-16).map(turn=>({speaker:turn.role==='user'?'Lawrence':'Agent Control',text:turn.text,interrupted:turn.interrupted===true}))),today=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date());
    const systemPrompt=`You are Agent Control speaking with Lawrence in a live voice conversation. Follow a clear direct request immediately without asking for confirmation. Answer in one concise sentence unless the request itself needs a list, count, or longer spoken result; then complete the entire result in this response and do not split it across turns. When asked to count through a stated endpoint, include every number through that endpoint. Use the supplied conversation history. Resolve references such as "what did I just ask?" from the preceding Lawrence entry, before the current question. Never ask how Lawrence is and never introduce feelings or wellbeing unless Lawrence explicitly asks about them. If a transcript is garbled or its meaning is uncertain, say you did not catch it and ask Lawrence to repeat. Treat an abrupt accusation, emergency, consequential command, or unrelated topic change without supporting conversation context as a likely transcription error: do not infer urgency or offer an action; ask Lawrence to say it again. Today in Europe/London is ${today}. Never claim a tool ran unless a tool result appears in the transcript. Do not expose hidden reasoning or stage directions.`;
    const prompt={schema:'agent-control.provider-prompt/v1' as const,cacheScope:'realtime-voice-conversation',blocks:[
      {type:'text' as const,stability:'volatile' as const,text:`Session ${input.sessionId}; authenticated actor ${input.actor}. Conversation JSON:\n${history}\nRespond only with Agent Control's next spoken sentence:`},
    ]};
    const result=await new OpenAICompatibleProviderClient(provider).invoke(model,prompt,{timeoutMs:20_000,maximumOutputTokens:48,systemPrompt,temperature:.15,signal:input.signal});
    const rawText=result.output.trim().replace(/^(?:Agent Control|Assistant)\s*:\s*/i,'').replace(/[\*_`#]/g,'').trim();if(!rawText)throw new Error('voice_model_empty');
    const text=safeSpokenResponse(rawText,input.turns);
    return {text,model:route.modelId,routeReason:route.fallback?`fallback: ${route.fallbackReason}`:`qualified ${this.role} route`,usage:{inputTokens:result.usage.inputTokens??undefined,outputTokens:result.usage.outputTokens??undefined,cachedInputTokens:result.usage.cachedInputTokens??undefined,modelCost:result.usage.calculatedCost??result.usage.providerReportedCost??undefined}};
  }
  async invokeTool(input:{name:string;input:unknown;signal:AbortSignal}){const tool=this.tools[input.name];if(!tool)throw new Error('voice_tool_unavailable');return tool.invoke(input.input,input.signal);}
}

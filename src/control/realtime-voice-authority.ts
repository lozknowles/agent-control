import type {SocialIdentity} from './social-voice-providers.js';
import type {SocialPrincipal} from './social-voice.js';
import type {VoiceCaller,VoiceGrant} from './realtime-voice.js';
export interface ApprovedCallBinding {observed:SocialIdentity;messaging:SocialIdentity;approvedAt:string;tools:readonly string[];}
/** Explicit operator-approved exact binding. A phone/display-name match is never an enrolment lookup. */
export function boundVoiceAuthority(bindings:readonly ApprovedCallBinding[],principal:(identity:SocialIdentity)=>SocialPrincipal|undefined){
  const saved=structuredClone(bindings);
  return (caller:VoiceCaller):VoiceGrant|undefined=>{
    const equal=(a:SocialIdentity,b:SocialIdentity)=>a.channel===b.channel&&a.account===b.account&&a.sender===b.sender&&a.conversation===b.conversation;
    const matching=saved.filter(b=>equal(b.observed,caller.identity));if(matching.length!==1)return;
    const binding=matching[0];if(!Number.isFinite(Date.parse(binding.approvedAt)))return;
    const enrolled=principal(binding.messaging);if(!enrolled)return;
    // Live voice is initially read-only. Consequential work keeps the existing text-confirmation path.
    if(binding.tools.some(t=>!['status','models','nodes','health'].includes(t)))return;
    return {actor:enrolled.actor,tools:binding.tools};
  };
}

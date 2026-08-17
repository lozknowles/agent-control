import type { PtyAccess, PtySession, SessionRecovery } from "./types.js";
export interface PtyDiscovery { id:string; pid?:number; cwd:string; command:string; recovery:SessionRecovery; }
export interface PtyAttachment { sessionId:string; actorId:string; access:PtyAccess; attachedAt:string; }
export class PtyRegistry {
 private readonly sessions=new Map<string,PtySession>(); private readonly attachments=new Map<string,PtyAttachment[]>();
 upsert(discovery:PtyDiscovery,laneId:string):PtySession{const existing=this.sessions.get(discovery.id);const session:PtySession=existing?{...existing,...discovery}:{...discovery,laneId,access:"observe",transcriptTail:[]};this.sessions.set(session.id,session);return session;}
 attach(sessionId:string,actorId:string,access:PtyAccess="observe"):PtyAttachment{const session=this.mustSession(sessionId),current=this.attachments.get(sessionId)??[];if(access==="own"&&current.some(a=>a.access==="own"&&a.actorId!==actorId))throw new Error(`PTY ${sessionId} already has an owner`);const attachment={sessionId,actorId,access,attachedAt:new Date().toISOString()};this.attachments.set(sessionId,[...current.filter(a=>a.actorId!==actorId),attachment]);session.access=access;return attachment;}
 transferControl(sessionId:string,fromActorId:string,toActorId:string):PtyAttachment{const current=this.attachments.get(sessionId)??[],owner=current.find(a=>a.access==="own");if(owner&&owner.actorId!==fromActorId)throw new Error(`PTY ${sessionId} is owned by ${owner.actorId}`);this.attachments.set(sessionId,current.map(a=>a.actorId===fromActorId?{...a,access:"observe" as const}:a));return this.attach(sessionId,toActorId,"own");}
 humanTakeover(sessionId:string,humanId="human"):PtyAttachment{this.attachments.set(sessionId,(this.attachments.get(sessionId)??[]).map(a=>({...a,access:"observe" as const})));return this.attach(sessionId,humanId,"own");}
 appendTranscript(sessionId:string,lines:string[],maxLines=200){const s=this.mustSession(sessionId);s.transcriptTail=[...s.transcriptTail,...lines].slice(-maxLines);}
 list(){return [...this.sessions.values()];} attached(sessionId:string){return [...(this.attachments.get(sessionId)??[])];}
 private mustSession(id:string){const s=this.sessions.get(id);if(!s)throw new Error(`PTY ${id} not found`);return s;}
}

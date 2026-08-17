import type { PtyAccess, PtySession, SessionRecovery } from "./types.js";

export interface PtyDiscovery {
  id: string;
  pid?: number;
  cwd: string;
  command: string;
  recovery: SessionRecovery;
}

export interface PtyAttachment {
  sessionId: string;
  actorId: string;
  access: PtyAccess;
  attachedAt: string;
}

export class PtyRegistry {
  private readonly sessions = new Map<string, PtySession>();
  private readonly attachments = new Map<string, PtyAttachment[]>();

  upsert(discovery: PtyDiscovery, laneId: string): PtySession {
    const existing = this.sessions.get(discovery.id);
    const session: PtySession = existing ? { ...existing, ...discovery } : {
      ...discovery,
      laneId,
      access: "observe",
      transcriptTail: [],
    };
    this.sessions.set(session.id, session);
    return session;
  }

  attach(sessionId: string, actorId: string, access: PtyAccess = "observe"): PtyAttachment {
    const session = this.mustSession(sessionId);
    const current = this.attachments.get(sessionId) ?? [];
    if (access === "own" && current.some(a => a.access === "own" && a.actorId !== actorId)) {
      throw new Error(`PTY ${sessionId} already has an owner`);
    }
    const attachment = { sessionId, actorId, access, attachedAt: new Date().toISOString() };
    this.attachments.set(sessionId, [...current.filter(a => a.actorId !== actorId), attachment]);
    session.access = access;
    return attachment;
  }

  transferControl(sessionId: string, fromActorId: string, toActorId: string): PtyAttachment {
    const current = this.attachments.get(sessionId) ?? [];
    const owner = current.find(a => a.access === "own");
    if (owner && owner.actorId !== fromActorId) throw new Error(`PTY ${sessionId} is owned by ${owner.actorId}`);
    const demoted = current.map(a => a.actorId === fromActorId ? { ...a, access: "observe" as const } : a);
    this.attachments.set(sessionId, demoted);
    return this.attach(sessionId, toActorId, "own");
  }

  humanTakeover(sessionId: string, humanId = "human"): PtyAttachment {
    const current = (this.attachments.get(sessionId) ?? []).map(a => ({ ...a, access: "observe" as const }));
    this.attachments.set(sessionId, current);
    return this.attach(sessionId, humanId, "own");
  }

  appendTranscript(sessionId: string, lines: string[], maxLines = 200): void {
    const session = this.mustSession(sessionId);
    session.transcriptTail = [...session.transcriptTail, ...lines].slice(-maxLines);
  }

  list(): PtySession[] { return [...this.sessions.values()]; }
  attached(sessionId: string): PtyAttachment[] { return [...(this.attachments.get(sessionId) ?? [])]; }
  private mustSession(id: string): PtySession { const session = this.sessions.get(id); if (!session) throw new Error(`PTY ${id} not found`); return session; }
}

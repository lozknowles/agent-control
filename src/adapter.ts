import type { Baton, HardContract, LaneState } from './state.js';

export interface AgentStartContext { contract: HardContract; baton: Baton; sharedContext: string; }
export interface AgentEvent { type: 'text'|'tool'|'status'|'baton'; text: string; batonPatch?: Partial<Baton>; }
export interface AgentHandle { id: string; stop(): Promise<void>; }
export interface AgentAdapter {
  readonly id: string;
  start(lane: LaneState, context: AgentStartContext, onEvent: (event: AgentEvent)=>void): Promise<AgentHandle>;
}

// Deliberately boring adapter used until Pi/llama.cpp wiring is enabled.
// Keeping this boundary explicit means the persistence/control plane does not depend on one harness.
export class NullAdapter implements AgentAdapter {
  readonly id='null';
  async start(lane:LaneState,_context:AgentStartContext,onEvent:(event:AgentEvent)=>void):Promise<AgentHandle>{
    onEvent({type:'status',text:`Lane ${lane.id}: no agent adapter configured`});
    return {id:`null-${lane.id}`,async stop(){}};
  }
}

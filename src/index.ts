import blessed from 'blessed';
import { markContextRotated } from './context.js';
import { providerFromEnv } from './providers.js';
import { ContextRotationRequiredError, runLaneTurn } from './runner.js';
import { appendEvent, batonHealth, checkpoint, loadWorkspace, newContextState, saveWorkspace, touchBaton, type LaneState, type WorkspaceState } from './state.js';

const now = () => new Date().toISOString();
function lane(id: number, name: string, cwd: string, model: string, reasoning: string): LaneState {
  return {
    id, name, status: 'idle', model, reasoning, context: newContextState(), lines: ['Lane restored/created.', 'Waiting for a command…'],
    contract: { version: 1, laneId: id, goal: 'Await task', constraints: [], cwd, priority: 1, mode: 'auto', modelLock: null, sharedTaskIds: [], updatedAt: now() },
    baton: { version: 1, laneId: id, revision: 1, status: 'Await task', progress: [], hypothesis: '', evidence: [], changes: [], nextAction: 'Await command', openQuestions: [], model, reasoning, updatedAt: now() },
    lease: { laneId: id, holder: null, acquiredAt: null, expiresAt: null },
  };
}

const initial: WorkspaceState = { version: 1, paused: false, lastRestorePoint: null, lanes: [
  lane(1, 'LocalWalks', '/fast/repos/LocalWalks', 'Qwen 3.8 27B', 'medium'),
  lane(2, 'Research', '/fast/research', 'Qwen 3.8 27B', 'low'),
  lane(3, 'Systems', '~/ops', 'Qwen 3B', 'low'),
] };
const state = loadWorkspace(initial);
const lanes = state.lanes;
const provider = providerFromEnv();

const screen = blessed.screen({ smartCSR: true, fullUnicode: true, title: 'Agent Control', mouse: true });
let active = 0;
let zoomed = false;
const header = blessed.box({ top: 0, left: 0, width: '100%', height: 3, tags: true, border: 'line' }); screen.append(header);
const laneBoxes = lanes.map((_, i) => { const b = blessed.box({ top: 3, left: `${i * (100 / lanes.length)}%`, width: `${100 / lanes.length}%`, height: '66%-3', border: 'line', tags: true, scrollable: true, alwaysScroll: true, mouse: true, keys: true, vi: true, scrollbar: { ch: '│' } }); screen.append(b); return b; });
const activity = blessed.log({ top: '66%', left: 0, width: '67%', height: '22%-1', border: 'line', tags: true, scrollable: true, mouse: true, label: ' AGENT ACTIVITY / CONTRACT EVENTS ' }); screen.append(activity);
const metrics = blessed.box({ top: '66%', left: '67%', width: '33%', height: '22%-1', border: 'line', tags: true, label: ' ACTIVE LANE / BATON / CONTEXT ' }); screen.append(metrics);
const input = blessed.textbox({ bottom: 1, left: 0, width: '100%', height: 3, border: 'line', inputOnFocus: true, mouse: true, keys: true, prompt: '> ' }); screen.append(input);
const footer = blessed.box({ bottom: 0, left: 0, width: '100%', height: 1, tags: true, content: ' Tab lane │ +/- priority │ A auto │ M manual │ L model lock │ B baton │ R rotate ctx │ P pause/checkpoint │ Z zoom │ I input │ Q quit ' }); screen.append(footer);

function status(s: string) { return s === 'working' ? '{green-fg}● WORKING{/green-fg}' : s === 'error' ? '{red-fg}● ERROR{/red-fg}' : s === 'paused' ? '{yellow-fg}Ⅱ PAUSED{/yellow-fg}' : s === 'waiting' ? '{yellow-fg}○ WAITING{/yellow-fg}' : '{gray-fg}○ IDLE{/gray-fg}'; }
function age(ms: number) { return ms < 1000 ? 'now' : ms < 60000 ? `${Math.floor(ms / 1000)}s` : `${Math.floor(ms / 60000)}m`; }
function ctx(l: LaneState) {
  const c = l.context;
  return `e${c.epoch} ${c.estimatedTokensInEpoch}/${c.policy.rotateAfterTokens}t ${c.turnsInEpoch}/${c.policy.rotateAfterTurns} turns${c.needsRotation ? ' ROTATE' : ''}`;
}
function render() {
  const a = lanes[active];
  header.setContent(` {bold}AGENT CONTROL{/bold}   ${state.paused ? '{yellow-fg}Ⅱ PAUSED{/yellow-fg}' : '{green-fg}● LIVE{/green-fg}'}   lanes ${lanes.length}   reasoner ${provider?.name ?? 'not connected'}   restore ${state.lastRestorePoint ?? 'none'}   {gray-fg}contracts → batons → bounded context → disposable sessions{/gray-fg}`);
  lanes.forEach((l, i) => {
    const h = batonHealth(l.baton); const focus = i === active ? '{cyan-fg}{bold}' : ''; const end = i === active ? '{/bold}{/cyan-fg}' : '';
    laneBoxes[i].setLabel(` ${focus}${'★'.repeat(l.contract.priority)} ${l.id} ${l.name}${end} `);
    laneBoxes[i].setContent([
      `${status(l.status)}   ${l.contract.mode.toUpperCase()} ${l.contract.modelLock ? '🔒' : ''}`,
      `{bold}${l.contract.goal}{/bold}`,
      `{gray-fg}${l.model} │ ${l.reasoning} │ ctx ${ctx(l)}{/gray-fg}`,
      `{gray-fg}${l.contract.cwd}{/gray-fg}`,
      `Baton r${l.baton.revision} ${h.icon} ${h.label} ${age(h.age)}`,
      l.contract.sharedTaskIds.length ? `{cyan-fg}🔗 ${l.contract.sharedTaskIds.join(', ')}{/cyan-fg}` : '', '', ...l.lines, '', '{gray-fg}↕ UI scrollback capped; full transcript is durable JSONL{/gray-fg}'
    ].filter(Boolean).join('\n'));
  });
  const h = batonHealth(a.baton);
  metrics.setContent([`{bold}${a.name}{/bold}`, `Status: ${status(a.status)}`, `Mode: ${a.contract.mode.toUpperCase()}`, `Priority: ${'★'.repeat(a.contract.priority)}`, `Model: ${a.model}${a.contract.modelLock ? ' 🔒' : ''}`, `Reasoning: ${a.reasoning}`, `Reasoner: ${provider?.name ?? 'none'}`, '', `{bold}CONTEXT ${ctx(a)}{/bold}`, `Request target/hard: ${a.context.policy.requestTargetTokens}/${a.context.policy.requestHardTokens}t`, `Last request: ${a.context.estimatedTokensLastRequest}t`, `Last rotation: ${a.context.lastRotationAt ?? 'never'}`, '', `{bold}BATON r${a.baton.revision}{/bold} ${h.label} ${age(h.age)}`, `Status: ${a.baton.status}`, `Next: ${a.baton.nextAction}`, `Lease: ${a.lease.holder ?? 'free'}`].join('\n'));
  screen.render();
}
function persist(event: string, payload: unknown = {}) { appendEvent(event, payload); saveWorkspace(state); render(); }
function focusLane(i: number) { active = (i + lanes.length) % lanes.length; laneBoxes[active].focus(); render(); }

screen.key(['tab'], () => focusLane(active + 1)); screen.key(['S-tab'], () => focusLane(active - 1));
screen.key(['1','2','3','4','5','6','7','8','9'], (_c: unknown, k: { full: string }) => { const i = Number(k.full) - 1; if (i < lanes.length) focusLane(i); });
screen.key(['q','C-c'], () => { saveWorkspace(state); process.exit(0); });
screen.key(['+','='], () => { const l=lanes[active]; l.contract.priority=Math.min(3,l.contract.priority+1); l.contract.updatedAt=now(); persist('contract.priority',{laneId:l.id,priority:l.contract.priority}); });
screen.key(['-'], () => { const l=lanes[active]; l.contract.priority=Math.max(1,l.contract.priority-1); l.contract.updatedAt=now(); persist('contract.priority',{laneId:l.id,priority:l.contract.priority}); });
screen.key(['a'], () => { const l=lanes[active]; l.contract.mode='auto'; l.contract.updatedAt=now(); persist('contract.mode',{laneId:l.id,mode:'auto'}); });
screen.key(['m'], () => { const l=lanes[active]; l.contract.mode='manual'; l.contract.updatedAt=now(); persist('contract.mode',{laneId:l.id,mode:'manual'}); });
screen.key(['l'], () => { const l=lanes[active]; l.contract.modelLock=l.contract.modelLock ? null : l.model; l.contract.updatedAt=now(); persist('contract.modelLock',{laneId:l.id,modelLock:l.contract.modelLock}); });
screen.key(['b'], () => { const l=lanes[active]; l.lines.push(`{cyan-fg}BATON r${l.baton.revision}{/cyan-fg} status=${l.baton.status} next=${l.baton.nextAction}`); render(); });
screen.key(['r'], async () => {
  const l = lanes[active];
  if (!provider?.supportsRotation || !provider.rotate) { activity.log(`[lane ${l.id}] provider cannot rotate sessions automatically; lane will fail closed at its rotation threshold`); render(); return; }
  l.status = 'waiting'; render();
  try {
    const ok = await provider.rotate(l);
    if (!ok) throw new Error('provider rejected rotation');
    markContextRotated(l); l.status = 'idle'; touchBaton(l, { status: 'Context session rotated', nextAction: 'Continue from fresh epoch using contract + baton' }); persist('context.rotated.manual', { laneId: l.id, epoch: l.context.epoch }); activity.log(`[lane ${l.id}] context rotated to epoch ${l.context.epoch}`);
  } catch (error) { l.status = 'paused'; touchBaton(l, { status: 'Context rotation failed', nextAction: 'Repair provider rotation before continuing' }); persist('context.rotation.failed', { laneId: l.id, error: error instanceof Error ? error.message : String(error) }); activity.log(`[lane ${l.id}] rotation failed: ${error instanceof Error ? error.message : String(error)}`); }
});
screen.key(['p'], () => { state.paused=!state.paused; for (const l of lanes) { l.status=state.paused?'paused':'idle'; touchBaton(l,{status:state.paused?'Paused at safe boundary':'Restored; awaiting scheduling',nextAction:state.paused?'Resume from checkpoint':'Await scheduler'}); } const id=checkpoint(state,state.paused?'pause-all':'resume-all'); activity.log(`${state.paused?'PAUSE':'RESUME'} checkpoint ${id}`); render(); });
screen.key(['z'], () => { zoomed=!zoomed; laneBoxes.forEach((b,i)=>{ b.hidden=zoomed&&i!==active; if(zoomed&&i===active){b.top=3;b.left=0;b.width='100%';b.height='85%-3';}else if(!zoomed){b.top=3;b.left=`${i*(100/lanes.length)}%`;b.width=`${100/lanes.length}%`;b.height='66%-3';}}); activity.hidden=zoomed; metrics.hidden=zoomed; render(); });
screen.key(['i'], () => input.focus());
input.on('submit', async (value: string) => {
  const text=value.trim();
  if(text){
    const l=lanes[active]; l.lines.push(`{cyan-fg}> ${text}{/cyan-fg}`); l.contract.goal=text; l.contract.updatedAt=now(); l.status='waiting'; touchBaton(l,{status:'Task accepted',nextAction:provider?'Build bounded context and invoke reasoner':'Connect reasoner provider'}); persist('task.assigned',{laneId:l.id,goal:text}); activity.log(`[lane ${l.id}] task: ${text}`);
    if (!provider) {
      l.lines.push('{yellow-fg}[reasoner not connected: set AGENT_CONTROL_REASONER_URL]{/yellow-fg}');
    } else if (state.paused) {
      l.lines.push('{yellow-fg}[workspace paused; task retained in hard contract]{/yellow-fg}');
    } else {
      try {
        const answer = await runLaneTurn(state, l, text, provider);
        l.lines.push(`{green-fg}${answer}{/green-fg}`);
        activity.log(`[lane ${l.id}] reasoner completed; ${ctx(l)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        l.lines.push(`{red-fg}${message}{/red-fg}`);
        if (error instanceof ContextRotationRequiredError) activity.log(`[lane ${l.id}] PAUSED to prevent context growth: ${message}`);
        else activity.log(`[lane ${l.id}] reasoner error: ${message}`);
      }
    }
  }
  input.clearValue(); laneBoxes[active].focus(); saveWorkspace(state); render();
});
laneBoxes.forEach((b,i)=>b.on('focus',()=>{active=i;render();}));
render(); focusLane(0);

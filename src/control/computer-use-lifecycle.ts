/** Portable identities supplied by a trusted provider, never derived from rendered UI text. */
export interface ComputerWindow {
  key:string; provider:string; application:string; process:{key:string; executable:string; startedAt:string};
  title:string; role:'APPLICATION'|'DIALOG'|'SECURITY'|'UNKNOWN'; owner?:string;
  detectedAt:string; visible:boolean; foreground:boolean; bounds:{x:number;y:number;width:number;height:number};
}
export interface ComputerTopology {at:string; windows:ComputerWindow[];foreignForeground?:boolean;}
export type ComputerTransitionType='CURRENT_WINDOW'|'CHILD_DIALOG'|'REPLACEMENT_WINDOW'|'WINDOW_DISMISSED'|'APPLICATION_REFOCUS'|'APPLICATION_WINDOW_CREATED'|'APPLICATION_WINDOW_DESTROYED';
export interface ComputerTransition {type:ComputerTransitionType; title?:string; destination?:string; timeoutMs?:number;}
export function validComputerTransition(value:ComputerTransition){return Boolean(value&&['CURRENT_WINDOW','CHILD_DIALOG','REPLACEMENT_WINDOW','WINDOW_DISMISSED','APPLICATION_REFOCUS','APPLICATION_WINDOW_CREATED','APPLICATION_WINDOW_DESTROYED'].includes(value.type)&&(value.timeoutMs===undefined||(Number.isFinite(value.timeoutMs)&&value.timeoutMs>=0&&value.timeoutMs<=10000))&&[value.title,value.destination].every(v=>v===undefined||(typeof v==='string'&&v.length>0&&v.length<=2000)));}
export interface ComputerTransitionEvidence {expected:ComputerTransition; previous:ComputerWindow; before:ComputerTopology; after:ComputerTopology; candidates:ComputerWindow[]; decision:'BOUND'|'TRANSITION_MISMATCH'|'REACQUIRE_REQUIRED'; successor?:ComputerWindow; reason:string;}
export function sameComputerProcess(a:ComputerWindow,b:ComputerWindow){return a.provider===b.provider&&a.application===b.application&&a.process.key===b.process.key&&a.process.executable===b.process.executable&&a.process.startedAt===b.process.startedAt;}
export function sameComputerWindow(a:ComputerWindow,b:ComputerWindow){return a.key===b.key&&a.detectedAt===b.detectedAt&&sameComputerProcess(a,b);}
export function resolveComputerTransition(expected:ComputerTransition,previous:ComputerWindow,before:ComputerTopology,after:ComputerTopology):ComputerTransitionEvidence {
  const result:ComputerTransitionEvidence={expected,previous,before,after,candidates:[],decision:'TRANSITION_MISMATCH',reason:'no_eligible_successor'};
  if(!before.windows.some(w=>sameComputerWindow(w,previous)))return {...result,reason:'previous_identity_unproven'};
  const eligible=after.windows.filter(w=>sameComputerProcess(w,previous)&&w.visible&&w.role!=='SECURITY'&&w.role!=='UNKNOWN');
  if(after.foreignForeground||after.windows.some(w=>w.foreground&&(!sameComputerProcess(w,previous)||w.role==='SECURITY')))return {...result,reason:'unexpected_foreground_or_security_window'};
  const current=after.windows.find(w=>sameComputerWindow(w,previous));
  const newlyDetected=(w:ComputerWindow)=>!before.windows.some(old=>sameComputerWindow(old,w));
  let candidates:ComputerWindow[]=[];
  switch(expected.type){
    case 'CURRENT_WINDOW': candidates=eligible.filter(w=>sameComputerWindow(w,previous));break;
    case 'CHILD_DIALOG': candidates=eligible.filter(w=>w.role==='DIALOG'&&w.owner===previous.key&&newlyDetected(w));break;
    case 'APPLICATION_WINDOW_CREATED': candidates=eligible.filter(w=>w.role==='APPLICATION'&&newlyDetected(w));break;
    case 'REPLACEMENT_WINDOW': if(!current)candidates=eligible.filter(w=>w.role==='APPLICATION'&&newlyDetected(w));break;
    case 'WINDOW_DISMISSED':
    case 'APPLICATION_WINDOW_DESTROYED': if(!current)candidates=eligible.filter(w=>w.key===(expected.destination??previous.owner));break;
    case 'APPLICATION_REFOCUS': candidates=eligible.filter(w=>w.key===(expected.destination??previous.key));break;
  }
  if(expected.title)candidates=candidates.filter(w=>w.title===expected.title);
  result.candidates=candidates;
  if(candidates.length!==1)return {...result,reason:candidates.length?'ambiguous_successor':'no_eligible_successor'};
  const successor=candidates[0]!;
  if(!successor.foreground)return {...result,decision:'REACQUIRE_REQUIRED',reason:'successor_not_foreground'};
  return {...result,decision:'BOUND',successor,reason:'identity_and_transition_verified'};
}

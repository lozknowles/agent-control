import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {ComputerProvider,ComputerTarget,ComputerObservation,ComputerAction,ComputerSession} from './computer-use.js';
import {sameComputerWindow,type ComputerWindow,type ComputerTopology} from './computer-use-lifecycle.js';
type SkyWindow={id:number;app:string;title?:string};
type Shot={id:string;url:string;width?:number;height?:number;originX?:number;originY?:number};
interface SkyState {window:SkyWindow;screenshots:Shot[];accessibility?:{tree?:string;focused_element?:string}|null;}
interface SkyPort {list_windows():Promise<SkyWindow[]>;get_window(input:{id:number;app:string}):Promise<SkyWindow>;get_window_state(input:{window:SkyWindow;include_screenshot:boolean;include_text:boolean}):Promise<SkyState>;click(input:unknown):Promise<void>;press_key(input:unknown):Promise<void>;type_text(input:unknown):Promise<void>;activate_window(input:unknown):Promise<void>;}
export interface WindowsMetadata {at:string;process:{id:number;executable:string;startedAt:string};foreignForeground:boolean;windows:Array<{id:number;owner:number;title:string;windowClass:string;visible:boolean;foreground:boolean;x:number;y:number;width:number;height:number;dpi:number}>;}
export function windowsMetadataReader(processId:number,script:string){
  if(!Number.isSafeInteger(processId)||processId<1)throw Error('process_identity_invalid');
  return async():Promise<WindowsMetadata>=>{const {stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-File',script,'-TargetProcessId',String(processId)],{windowsHide:true,timeout:10000,maxBuffer:512000});return JSON.parse(stdout.trim());};
}
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const elements=(tree:string)=>[...tree.matchAll(/^\s*(\d+)\s+([^\r\n]+)/gm)].map(m=>({id:`e${m[1]}`,role:m[2]!.split(/\s+/)[0],name:m[2]!.slice(0,180)}));
export class SkyLifecycleComputerProvider implements ComputerProvider {
  readonly id='windows-sky-lifecycle';
  private known:Record<string,string>;private native=new Map<string,SkyWindow>();private last?:{identity:ComputerWindow;state:SkyState;shot:Shot;revision:string};
  private review?:{key:string;bounds:string;image:string;x:number;y:number;at:number};
  constructor(private readonly options:{sky:SkyPort;metadata:()=>Promise<WindowsMetadata>;process:{id:number;executable:string;startedAt:string};machine:string;application:string;appId:string;rootNativeId:number;evidenceDir:string;identityFile:string;allowedKeys:string[];allowedText:string[]}){this.known=fs.existsSync(options.identityFile)?JSON.parse(fs.readFileSync(options.identityFile,'utf8')):{};}
  capabilities(){return{operations:['screenshot','click','typeText','pressKey','focusWindow'] as Array<'screenshot'|'click'|'typeText'|'pressKey'|'focusWindow'>,targeting:['accessibility','coordinate'] as Array<'accessibility'|'coordinate'>,persistentSession:true,screenshots:true};}
  async topology():Promise<ComputerTopology>{
    const metadata=await this.options.metadata(),p=this.options.process;
    if(metadata.process.id!==p.id||metadata.process.executable.toLowerCase()!==p.executable.toLowerCase()||Date.parse(metadata.process.startedAt)!==Date.parse(p.startedAt)||!Number.isFinite(Date.parse(metadata.at))||Math.abs(Date.now()-Date.parse(metadata.at))>10000)throw Error('process_identity_changed');
    const returned=await this.options.sky.list_windows();this.native.clear();
    const present=new Set(metadata.windows.map(w=>String(w.id)));for(const id of Object.keys(this.known))if(!present.has(id))delete this.known[id];
    const key=(id:number)=>`window-${hash(`${p.id}:${p.startedAt}:${id}`).slice(0,24)}`;
    const windows:ComputerWindow[]=metadata.windows.flatMap(w=>{
      const match=returned.filter(s=>s.id===w.id&&s.app===this.options.appId);if(match.length!==1)return [];
      this.known[String(w.id)]??=metadata.at;const k=key(w.id);this.native.set(k,match[0]!);const scale=w.dpi/96;if(!Number.isFinite(scale)||scale<=0)throw Error('window_dpi_unavailable');
      return[{key:k,provider:this.id,application:this.options.application,process:{key:`process-${p.id}`,executable:p.executable,startedAt:p.startedAt},title:w.title,role:/credential|password|security|user account control/i.test(w.title)?'SECURITY':w.id===this.options.rootNativeId?'APPLICATION':w.owner?'DIALOG':'UNKNOWN',...(w.owner?{owner:key(w.owner)}:{}),detectedAt:this.known[String(w.id)]!,visible:w.visible,foreground:w.foreground,bounds:{x:Math.round(w.x/scale),y:Math.round(w.y/scale),width:Math.round(w.width/scale),height:Math.round(w.height/scale)}}];
    });
    fs.mkdirSync(path.dirname(this.options.identityFile),{recursive:true});fs.writeFileSync(this.options.identityFile,JSON.stringify(this.known),{mode:0o600});
    return{at:metadata.at,windows,foreignForeground:metadata.foreignForeground};
  }
  async root(){return(await this.topology()).windows.find(w=>this.native.get(w.key)?.id===this.options.rootNativeId)!;}
  async available(target:ComputerTarget){return target.machine===this.options.machine&&target.application===this.options.application&&(await this.topology()).windows.some(w=>w.key===target.window&&w.visible&&w.role!=='SECURITY');}
  /** Called by the operator after inspecting the displayed preview; never sourced from rendered instructions. */
  reviewCoordinate(x:number,y:number){if(!this.last||!Number.isInteger(x)||!Number.isInteger(y))throw Error('coordinate_review_missing');this.review={key:this.last.identity.key,bounds:JSON.stringify(this.last.identity.bounds),image:hash(this.last.shot.url),x,y,at:Date.now()};}
  async preview(key:string){return this.capture(key);}
  private async capture(key:string):Promise<ComputerObservation>{
    const topology=await this.topology(),identity=topology.windows.find(w=>w.key===key);if(!identity||!identity.visible||identity.role==='SECURITY')throw Error('bound_window_missing_or_unsafe');
    const selected=this.native.get(key)!;const window=await this.options.sky.get_window(selected);
    const state=await this.options.sky.get_window_state({window,include_screenshot:true,include_text:true});
    if(state.window.id!==selected.id||state.window.app!==selected.app)throw Error('screenshot_window_identity_mismatch');
    const shots=state.screenshots.filter(s=>s.width===identity.bounds.width&&s.height===identity.bounds.height);
    if(shots.length!==1)throw Error('screenshot_region_ambiguous');const shot=shots[0]!,revision=randomUUID();this.last={identity,state,shot,revision};
    return{revision,at:topology.at,target:{machine:this.options.machine,application:this.options.application,window:key},windowIdentity:identity,title:identity.title,text:state.accessibility?.tree??'',elements:elements(state.accessibility?.tree??''),screenshot:{sha256:hash(Buffer.from(shot.url.split(',')[1]!,'base64')),mediaType:shot.url.startsWith('data:image/png')?'image/png':'image/jpeg'}};
  }
  async open(target:ComputerTarget):Promise<ComputerSession>{
    let key=target.window!;if(!await this.available(target))throw Error('window_unavailable');
    return{id:randomUUID(),topology:()=>this.topology(),boundWindow:async()=>{const w=(await this.topology()).windows.find(w=>w.key===key);if(!w)throw Error('bound_window_vanished');return w;},bindWindow:async w=>{const fresh=(await this.topology()).windows.find(candidate=>sameComputerWindow(candidate,w));if(!fresh||!fresh.foreground)throw Error('successor_binding_changed');key=fresh.key;this.last=undefined;this.review=undefined;},observe:()=>this.capture(key),close:async()=>{this.last=undefined;},act:async a=>this.act(key,a)};
  }
  private async act(key:string,a:ComputerAction){
    const prior=this.last;if(!prior||prior.identity.key!==key||prior.revision!==a.revision)throw Error('stale_observation');
    const topology=await this.topology(),current=topology.windows.find(w=>sameComputerWindow(w,prior.identity));
    if(!current||current.role==='SECURITY')throw Error('window_identity_changed');
    if(a.operation!=='focusWindow'&&(!current.foreground||topology.foreignForeground))throw Error('foreground_changed');
    if(JSON.stringify(current.bounds)!==JSON.stringify(prior.identity.bounds))throw Error('window_layout_changed');
    if(a.operation==='focusWindow'){await this.options.sky.activate_window({window:this.native.get(key)!});this.last=undefined;return{detail:'focus_requested',mode:'OTHER' as const};}
    const fresh=await this.capture(key),snapshot=this.last!,window=snapshot.state.window;
    if(!sameComputerWindow(snapshot.identity,current)||!snapshot.identity.foreground)throw Error('window_identity_or_focus_changed_during_capture');
    if(JSON.stringify(snapshot.identity.bounds)!==JSON.stringify(current.bounds))throw Error('window_layout_changed');
    let mode:'OTHER'|'KEYBOARD'|'ACCESSIBILITY'|'SCREEN_COORDINATE'='OTHER',fallback=false,screenshotRef:string|undefined;
    if(a.operation==='screenshot'){fs.mkdirSync(this.options.evidenceDir,{recursive:true});screenshotRef=path.join(this.options.evidenceDir,`window-${randomUUID()}.${snapshot.shot.url.startsWith('data:image/png')?'png':'jpg'}`);fs.writeFileSync(screenshotRef,Buffer.from(snapshot.shot.url.split(',')[1]!,'base64'),{flag:'wx',mode:0o600});}
    else if(a.operation==='pressKey'){if(!this.options.allowedKeys.includes(a.key??''))throw Error('key_not_authorized');await this.options.sky.press_key({window,key:a.key});mode='KEYBOARD';}
    else if(a.operation==='typeText'){if(!this.options.allowedText.includes(a.text??'')||!snapshot.state.accessibility?.focused_element)throw Error('text_or_focus_not_authorized');await this.options.sky.type_text({window,text:a.text});mode='KEYBOARD';}
    else if(a.operation==='click'){
      if(a.elementId){const old=elements(prior.state.accessibility?.tree??'').find(e=>e.id===a.elementId),next=fresh.elements.find(e=>e.id===a.elementId);if(!old||!next||old.name!==next.name||old.role!==next.role)throw Error('stale_element');await this.options.sky.click({window,element_index:Number(a.elementId.slice(1))});mode='ACCESSIBILITY';}
      else{const r=this.review;this.review=undefined;if(!a.source||!r||Date.now()-r.at>120000||r.key!==key||r.bounds!==JSON.stringify(current.bounds)||r.image!==hash(snapshot.shot.url)||r.x!==a.source.x||r.y!==a.source.y||r.x<0||r.y<0||r.x>=current.bounds.width||r.y>=current.bounds.height)throw Error('coordinate_review_stale');await this.options.sky.click({window,screenshotId:snapshot.shot.id,x:r.x,y:r.y});mode='SCREEN_COORDINATE';fallback=true;}
    }else throw Error('operation_unsupported');
    this.last=undefined;return{detail:`${a.operation}_acknowledged`,mode,fallback,...(screenshotRef?{screenshotRef}:{})};
  }
}

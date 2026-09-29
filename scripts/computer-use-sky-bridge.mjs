import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID, timingSafeEqual} from 'node:crypto';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const compare=(left,right)=>{const a=Buffer.from(String(left)),b=Buffer.from(String(right));return a.length===b.length&&timingSafeEqual(a,b);};
const elements=tree=>[...String(tree??'').matchAll(/^\s*(\d+)\s+([^\r\n]+)/gm)].map(match=>({id:`e${match[1]}`,index:Number(match[1]),role:match[2].split(/\s+/)[0],name:match[2].slice(0,180)}));
const json=(response,status,value)=>{response.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});response.end(JSON.stringify(value));};

/** Ephemeral, loopback-only transport for the Windows Computer Use provider. sky is injected by the desktop runtime. */
export async function startSkyBridge({sky,window,application,evidenceDir,token,allowedKeys=[],forbiddenTitlePattern,port=0}={}){
  if(!sky||!window||!Number.isInteger(window.id)||!window.app||!application||!evidenceDir||!token||String(token).length<32||!Number.isInteger(port)||port<0||port>65535)throw Error('sky_bridge_configuration_invalid');
  fs.mkdirSync(evidenceDir,{recursive:true});
  const keySet=new Set(allowedKeys),app=window.app,id=window.id;let state=null,revision='',sessionId='',lastScreenshotRef;
  const selected=async()=>{
    const matches=(await sky.list_windows()).filter(item=>item.id===id&&item.app===app);
    if(matches.length!==1)throw Error('target_window_unavailable');
    if(forbiddenTitlePattern&&new RegExp(forbiddenTitlePattern,'i').test(matches[0].title??''))throw Error('protected_window_title');
    return sky.get_window({id,app});
  };
  const capture=async()=>{
    const target=await selected();state=await sky.get_window_state({window:target,include_screenshot:true,include_text:true});
    if(state.window.id!==id||state.window.app!==app)throw Error('wrong_window_observed');
    revision=randomUUID();const shot=state.screenshots?.at(-1),mediaType=shot?.url?.startsWith('data:image/png;base64,')?'image/png':shot?.url?.startsWith('data:image/jpeg;base64,')?'image/jpeg':null,bytes=mediaType?Buffer.from(shot.url.split(',')[1],'base64'):null;
    return {revision,at:new Date().toISOString(),target:{machine:'controller-local',application,window:String(id)},title:state.window.title??'',text:String(state.accessibility?.tree??state.accessibility?.document_text??'').slice(0,8000),elements:elements(state.accessibility?.tree),screenshot:bytes?{sha256:digest(bytes),mediaType,...(lastScreenshotRef?{evidenceRef:lastScreenshotRef}:{})}:undefined};
  };
  const action=async input=>{
    if(!sessionId||input.sessionId!==sessionId)throw Error('sky_session_missing');
    const action=input.action;if(!action||action.revision!==revision||!state)throw Error('stale_observation');
    const target=await selected();const latest=await sky.get_window_state({window:target,include_screenshot:true,include_text:true});
    if(latest.window.id!==id||latest.window.app!==app)throw Error('window_state_changed');
    const oldShot=state.screenshots?.at(-1),newShot=latest.screenshots?.at(-1);
    if(oldShot&&newShot&&(oldShot.width!==newShot.width||oldShot.height!==newShot.height))throw Error('window_layout_changed');
    let mode='OTHER',detail=`${action.operation}_acknowledged`,fallback=false;
    if(action.operation==='focusWindow'){await sky.activate_window({window:target});mode='OTHER';}
    else if(action.operation==='pressKey'){if(!keySet.has(action.key))throw Error('keyboard_shortcut_not_allowed');await sky.press_key({window:target,key:action.key});mode='KEYBOARD';}
    else if(action.operation==='typeText'){if(typeof action.text!=='string'||action.text.length>1024)throw Error('text_invalid');if(!latest.accessibility?.focused_element)throw Error('focus_unverified');await sky.type_text({window:target,text:action.text});mode='KEYBOARD';}
    else if(action.operation==='click'||action.operation==='doubleClick'){
      const count=action.operation==='doubleClick'?2:1;
      if(action.elementId){const original=elements(state.accessibility?.tree).find(item=>item.id===action.elementId),fresh=elements(latest.accessibility?.tree).find(item=>item.id===action.elementId);if(!original||!fresh||original.role!==fresh.role||original.name!==fresh.name)throw Error('stale_element');await sky.click({window:target,element_index:fresh.index,click_count:count});mode='ACCESSIBILITY';}
      else {if(!action.source||!newShot?.id||!oldShot?.url||oldShot.url!==newShot.url)throw Error('coordinate_state_changed');const {x,y}=action.source;if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=newShot.width||y>=newShot.height)throw Error('coordinate_out_of_bounds');await sky.click({window:target,screenshotId:newShot.id,x,y,click_count:count});mode='SCREEN_COORDINATE';fallback=true;}
    }
    else if(action.operation==='screenshot'){
      const ext=newShot?.url?.startsWith('data:image/png;base64,')?'png':newShot?.url?.startsWith('data:image/jpeg;base64,')?'jpg':null;if(!ext)throw Error('screenshot_unavailable');const bytes=Buffer.from(newShot.url.split(',')[1],'base64'),file=path.join(evidenceDir,`window-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID()}.${ext}`);fs.writeFileSync(file,bytes,{flag:'wx'});lastScreenshotRef=file;detail=`window_screenshot_sha256:${digest(bytes)}`;mode='OTHER';
    }
    else if(action.operation==='wait'){await new Promise(resolve=>setTimeout(resolve,Math.min(Math.max(action.timeoutMs??500,0),5000)));mode='OTHER';}
    else throw Error('operation_unsupported');
    state=null;revision='';return {detail,mode,fallback,...(lastScreenshotRef?{screenshotRef:lastScreenshotRef}:{})};
  };
  const server=http.createServer(async(request,response)=>{
    try{
      if(!compare(request.headers.authorization?.replace(/^Bearer\s+/i,'')??'',token))return json(response,401,{error:'unauthorised'});
      if(request.method!=='POST')return json(response,405,{error:'method_not_allowed'});
      let body='';for await(const chunk of request){body+=chunk;if(body.length>65536)throw Error('request_too_large');}
      const input=body?JSON.parse(body):{};
      if(request.url==='/capabilities')return json(response,200,{provider:'windows-sky',machine:'controller-local',application,windowId:String(id),operations:['observe','inspect','screenshot','click','doubleClick','typeText','pressKey','focusWindow','wait'],targeting:['accessibility','coordinate'],persistentSession:true,screenshots:true});
      if(request.url==='/open'){if(input.windowId!==String(id))throw Error('target_window_mismatch');await selected();sessionId=randomUUID();state=null;revision='';return json(response,200,{sessionId});}
      if(request.url==='/observe'){if(input.sessionId!==sessionId||!sessionId)throw Error('sky_session_missing');return json(response,200,await capture());}
      if(request.url==='/act')return json(response,200,await action(input));
      if(request.url==='/close'){if(input.sessionId===sessionId){sessionId='';state=null;revision='';}return json(response,200,{closed:true});}
      return json(response,404,{error:'not_found'});
    }catch(error){return json(response,409,{error:error instanceof Error?error.message:String(error)});}
  });
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  return {port:server.address().port,close:()=>new Promise(resolve=>server.close(resolve))};
}

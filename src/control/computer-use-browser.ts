import {randomUUID} from 'node:crypto';
import {BrowserDestinationPolicy} from './browser-worker.js';
import type {ComputerAction,ComputerObservation,ComputerProvider,ComputerSession,ComputerTarget} from './computer-use.js';

/** Isolated semantic browser worker. It has no authenticated profile or raw script primitive. */
export class PlaywrightComputerProvider implements ComputerProvider {
  readonly id='playwright-browser';
  constructor(private readonly options:{executablePath?:string;allowedPrivateHosts?:string[];headless?:boolean}={}){}
  capabilities(){return {operations:['observe','inspect','click','doubleClick','typeText','pressKey','scroll','focusTab','newTab','navigate','wait'] as Array<'observe'|'inspect'|'click'|'doubleClick'|'typeText'|'pressKey'|'scroll'|'focusTab'|'newTab'|'navigate'|'wait'>,targeting:['accessibility','selector'] as Array<'accessibility'|'selector'>,persistentSession:true,screenshots:false};}
  async available(target:ComputerTarget){return Boolean(target.browser)&&!target.application;}
  async open(target:ComputerTarget,signal?:AbortSignal):Promise<ComputerSession>{
    const {chromium}=await import('playwright-core');
    const browser=await chromium.launch({headless:this.options.headless??true,executablePath:this.options.executablePath});
    const context=await browser.newContext({acceptDownloads:false,serviceWorkers:'block'});
    const policy=new BrowserDestinationPolicy(this.options.allowedPrivateHosts);
    const qualified=async(url:string)=>{const host=new URL(url).hostname;if(!this.options.allowedPrivateHosts?.includes(host))throw Error('browser_destination_not_qualified');await policy.assert(url);};
    await context.route('**/*',async route=>{try{await qualified(route.request().url());await route.continue();}catch{await route.abort('blockedbyclient');}});
    await context.routeWebSocket(/.*/,route=>route.close({code:1008,reason:'WebSocket unavailable in Computer Use qualification'}));
    const page=await context.newPage();let active=page;let revision='';let elements=new Map<string,string>();
    const abort=()=>void browser.close();signal?.addEventListener('abort',abort,{once:true});
    const observe=async():Promise<ComputerObservation>=>{
      revision=randomUUID();elements=new Map();
      const raw=await active.locator('a,button,input,textarea,select,[role]').evaluateAll(nodes=>nodes.slice(0,150).map((node,index)=>({index,role:node.getAttribute('role')??node.tagName.toLowerCase(),name:node.getAttribute('aria-label')??node.getAttribute('placeholder')??node.textContent?.trim().slice(0,120)??'',text:node.textContent?.trim().slice(0,120)??''})));
      const rows=raw.map(item=>{const id=`e${item.index}`;elements.set(id,`a,button,input,textarea,select,[role] >> nth=${item.index}`);return {id,role:item.role,name:item.name,text:item.text};});
      return {revision,at:new Date().toISOString(),target:{...target,tab:active.url()},url:active.url(),title:await active.title(),text:(await active.locator('body').innerText().catch(()=>'' )).slice(0,8000),elements:rows};
    };
    const act=async(action:ComputerAction)=>{
      if(action.revision!==revision)throw Error('stale_element');
      if(['click','doubleClick','typeText','pressKey'].includes(action.operation)){
        const host=new URL(active.url()).hostname;
        if(!this.options.allowedPrivateHosts?.includes(host))throw Error('browser_external_interaction_requires_approval');
      }
      const locator=()=>{const selector=elements.get(action.elementId??'');if(!selector)throw Error('stale_element');return active.locator(selector);};
      switch(action.operation){
        case 'click':await locator().click();break;
        case 'doubleClick':await locator().dblclick();break;
        case 'typeText':if(typeof action.text!=='string')throw Error('text_required');if(await locator().getAttribute('type')==='password')throw Error('credential_form_entry_blocked');await locator().fill(action.text);break;
        case 'pressKey':if(!action.key)throw Error('key_required');await active.keyboard.press(action.key);break;
        case 'scroll':await active.mouse.wheel(action.deltaX??0,action.deltaY??0);break;
        case 'navigate':if(!action.url)throw Error('url_required');await qualified(action.url);await active.goto(action.url,{waitUntil:'domcontentloaded',timeout:Math.min(action.timeoutMs??30000,30000)});await qualified(active.url());break;
        case 'newTab':active=await context.newPage();break;
        case 'focusTab':{const found=context.pages().find(item=>item.url()===action.tab);if(!found)throw Error('tab_unavailable');active=found;await active.bringToFront();break;}
        case 'wait':await active.waitForLoadState('domcontentloaded',{timeout:Math.min(action.timeoutMs??10000,30000)});break;
        case 'observe':case 'inspect':break;
        default:throw Error('operation_unsupported');
      }
      revision='';elements.clear();return {detail:`${action.operation}_acknowledged`};
    };
    return {observe,act,close:async()=>{signal?.removeEventListener('abort',abort);await context.close();await browser.close();}};
  }
}

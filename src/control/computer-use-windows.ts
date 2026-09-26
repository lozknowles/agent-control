import type {ComputerAction,ComputerActionResult,ComputerCapability,ComputerObservation,ComputerProvider,ComputerSession,ComputerTarget} from './computer-use.js';

interface BridgeDiscovery extends ComputerCapability {provider:string;machine:string;application:string;windowId:string;}
interface BridgeOpen {sessionId:string;}
export class WindowsSkyComputerProvider implements ComputerProvider {
  readonly id='windows-sky';
  private discovered:BridgeDiscovery|undefined;
  private readonly base:string;
  constructor(options:{url:string;token:string;fetcher?:typeof fetch}){
    const url=new URL(options.url);
    if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname)||url.username||url.password||url.search||url.hash||!options.token||options.token.length<32)throw Error('windows_bridge_configuration_invalid');
    this.base=url.origin;this.token=options.token;this.fetcher=options.fetcher??fetch;
  }
  private readonly token:string;
  private readonly fetcher:typeof fetch;
  capabilities():ComputerCapability{return this.discovered?{operations:[...this.discovered.operations],targeting:[...this.discovered.targeting],persistentSession:this.discovered.persistentSession,screenshots:this.discovered.screenshots}:{operations:[],targeting:[],persistentSession:false,screenshots:false};}
  async available(target:ComputerTarget){
    if(!target.application||!target.window||target.browser)return false;
    try{const value=await this.request<BridgeDiscovery>('/capabilities',{});if(value.provider!==this.id||value.application!==target.application||value.windowId!==target.window||!Array.isArray(value.operations)||!Array.isArray(value.targeting))return false;this.discovered=value;return true;}catch{return false;}
  }
  async open(target:ComputerTarget,signal?:AbortSignal):Promise<ComputerSession>{
    if(!this.discovered||this.discovered.windowId!==target.window)throw Error('windows_provider_not_discovered');
    const opened=await this.request<BridgeOpen>('/open',{windowId:target.window},signal),sessionId=opened.sessionId;
    if(!sessionId)throw Error('windows_session_invalid');
    return {id:sessionId,observe:async()=>{
      const value=await this.request<ComputerObservation>('/observe',{sessionId},signal);
      if(!value||!value.revision||value.target.window!==target.window||value.target.application!==target.application)throw Error('windows_wrong_target_observed');
      return {...value,target:{...target,window:value.target.window}};
    },act:async(action:ComputerAction)=>this.request<ComputerActionResult>('/act',{sessionId,action},signal),close:async()=>{await this.request('/close',{sessionId},signal);}};
  }
  private async request<T=unknown>(endpoint:string,body:unknown,signal?:AbortSignal):Promise<T>{
    const response=await this.fetcher(`${this.base}${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.token}`},body:JSON.stringify(body),signal});
    const value=await response.json() as {error?:string};
    if(!response.ok)throw Error(value.error??`windows_bridge_http_${response.status}`);
    return value as T;
  }
}

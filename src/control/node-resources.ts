import os from 'node:os';
import fs from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import type {ResourceMeasurement} from './resource-telemetry.js';
import {scalarMeasurement, unavailableMeasurement} from './resource-telemetry.js';

const execute = promisify(execFile);
/** Read-only native sampler. Never probes a remote address or launches a model. */
export class LocalNodeResources {
  private previous?: {at: number; total: number; idle: number};
  private readonly pending=new Map<string,Promise<Awaited<ReturnType<LocalNodeResources['collect']>>>>();
  private readonly cached=new Map<string,Awaited<ReturnType<LocalNodeResources['collect']>>>();
  async sample(accelerators: Array<{id: string; index: number; adapter: string}>) {
    const key=JSON.stringify(accelerators.map(a=>[a.id,a.index,a.adapter]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
    const cached=this.cached.get(key);if(cached&&Date.now()-Date.parse(cached.observedAt)<1000)return cached;
    const pending=this.pending.get(key);if(pending)return pending;
    const collecting=this.collect(accelerators);this.pending.set(key,collecting);
    try {const result=await collecting;if(this.cached.size>=16)this.cached.delete(this.cached.keys().next().value!);this.cached.set(key,result);return result;}finally{this.pending.delete(key);}

  }
  private async collect(accelerators: Array<{id: string; index: number; adapter: string}>) {
    const now=Date.now(),at=new Date(now).toISOString(),cpus=os.cpus();
    const current={at:now,total:cpus.reduce((n,c)=>n+Object.values(c.times).reduce((a,b)=>a+b,0),0),idle:cpus.reduce((n,c)=>n+c.times.idle,0)};
    const previous=this.previous;this.previous=current;
    let busy:ResourceMeasurement<number>=unavailableMeasurement(at,'node:os.cpus','first_sample_requires_prior_counter_frame');
    if(previous&&now-previous.at<=30000&&current.total>previous.total){const total=current.total-previous.total,idle=current.idle-previous.idle;if(idle>=0&&idle<=total)busy={...scalarMeasurement((1-idle/total)*100,at,'node:os.cpus counter delta'),intervalMs:now-previous.at};}
    let storage:{totalBytes:number;availableBytes:number}|null=null;
    try {const s=fs.statfsSync(process.cwd());storage={totalBytes:s.blocks*s.bsize,availableBytes:s.bavail*s.bsize};}catch{/* Unsupported platforms retain unavailable storage. */}
    const gpu:Array<{id:string;usedBytes:ResourceMeasurement<number>;busyPercent:ResourceMeasurement<number>}>=[];
    // Adapter choice follows observed accelerator capability, never the host name.
    if(accelerators.some(a=>a.adapter==='nvidia')){
      try {const result=await execute('nvidia-smi',['--query-gpu=index,memory.used,utilization.gpu','--format=csv,noheader,nounits'],{timeout:2000,maxBuffer:16384,windowsHide:true});
        for(const line of result.stdout.trim().split(/\r?\n/)){const [index,memory,utilization]=line.split(',').map(x=>Number(x.trim()));const bound=accelerators.find(a=>a.adapter==='nvidia'&&a.index===index);if(!bound)continue;gpu.push({id:bound.id,usedBytes:scalarMeasurement(Number.isFinite(memory)&&memory>=0?memory*1048576:null,at,'nvidia-smi device memory.used'),busyPercent:scalarMeasurement(Number.isFinite(utilization)&&utilization>=0&&utilization<=100?utilization:null,at,'nvidia-smi device utilization.gpu')});}
      }catch{/* An unavailable adapter cannot produce zero usage. */}
    }
    return {observedAt:at,scope:'WHOLE_NODE' as const,attribution:'Not attributed to individual jobs',cpuModel:cpus[0]?.model??null,cpuBusyPercent:busy,memoryTotalBytes:scalarMeasurement(os.totalmem()||null,at,'node:os.totalmem'),memoryAvailableBytes:scalarMeasurement(os.freemem(),at,'node:os.freemem'),storage,gpu};
  }
}

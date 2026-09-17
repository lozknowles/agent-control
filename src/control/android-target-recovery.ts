import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {OwnedProcessManager} from './owned-process.js';
import {sshResourceArgs} from './managed-node-ssh.js';
import {validateRuntimeTarget,type RuntimeTarget} from './target-llama-runtime.js';
import type {ResetPort,ResetObservation} from './target-reset.js';
/** Production target operation. No benchmark profile, prompt, scoring or admission dependency. */
export function androidRecoveryPort(raw:RuntimeTarget):ResetPort{
 const t=validateRuntimeTarget(raw),a=t.adb;
 if(t.telemetry!=='android-termux'||!a||!t.originalService)throw Error('android_recovery_configuration_required');
 const base=['-H',a.host,'-P',String(a.port),'-s',a.serial];
 async function command(command:string,args:string[],input?:string,timeout=15000){const owned=new OwnedProcessManager();try{const r=await owned.runProcess({command,args,input,maxOutputBytes:100000},AbortSignal.timeout(timeout));if(r.exitCode!==0)throw Error('target_recovery_transport_unavailable');return r.stdout.trim();}finally{await owned.terminateAll('recovery_probe_finished');}}
 async function adb(args:string[]){return command(a!.executable,[...base,...args]);}
 async function identity(){const serial=await adb(['shell','getprop','ro.serialno']);if(serial!==a!.expectedSerial)throw Error('physical_target_identity_mismatch');const boot=await adb(['shell','cat','/proc/sys/kernel/random/boot_id']);if(!/^[a-f0-9-]{36}$/i.test(boot))throw Error('target_boot_identity_unavailable');return {serial,boot};}
 async function helper(operation:string,expectedBootId?:string):Promise<ResetObservation>{
  const source=fs.readFileSync(new URL('../../assets/runtime/llama-invocation.py',import.meta.url),'utf8');const request={operation,expectedBootId,stateDirectory:t.stateDirectory,originalService:t.originalService};
  const input=source+'\nprint(json.dumps(dispatch(json.loads('+JSON.stringify(JSON.stringify(request))+'))),flush=True)\n';
  const remote=t.resource.transport.type==='ssh',args=remote?['-o','StrictHostKeyChecking=yes',...sshResourceArgs(t.resource,['python3','-'])]:['-'];
  const result=JSON.parse((await command(remote?'ssh':'python3',args,input,operation==='restore-service'?110000:20000)).split('\n').at(-1)!);
  return {...result,physicalIdentity:createHash('sha256').update(a!.expectedSerial).digest('hex')};
 }
 return {
  async observe(){const id=await identity(),o=await helper('recovery-observe');if(o.bootId!==id.boot)throw Error('adb_ssh_boot_identity_mismatch');return o;},
  async reboot(){await identity();await adb(['reboot']);},
  async restore(boot){const id=await identity();if(id.boot!==boot)throw Error('target_boot_identity_mismatch');return helper('restore-service',boot);}
 };
}

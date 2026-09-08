import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const [mode,file]=process.argv.slice(2),config=JSON.parse(fs.readFileSync(file,'utf8'));
const root=path.dirname(file),pidFile=path.join(root,'runtime-pid.json');
const identity=pid=>fs.readFileSync(`/proc/${pid}/stat`,'utf8').split(') ')[1].split(' ')[19];
if(mode==='start'){
 for(const entry of fs.readdirSync('/proc')){if(!/^\d+$/.test(entry))continue;try{const command=fs.readFileSync(`/proc/${entry}/cmdline`,'utf8').split('\0');if(command[0]===config.binary)throw new Error('refuse_second_owned_model_process:'+entry);}catch(e){if(e.message?.startsWith('refuse_second_owned_model_process:'))throw e;if(!['ENOENT','EACCES','ESRCH'].includes(e.code))throw e;}}
 if(fs.existsSync(pidFile)){const old=JSON.parse(fs.readFileSync(pidFile));try{if(identity(old.pid)===old.startTicks)throw new Error('runtime_already_active');}catch(e){if(e.code!=='ENOENT')throw e;}}
 const args=['--model',config.modelPath,'--alias',config.modelId,'--host','127.0.0.1','--port',String(config.port),'--ctx-size',String(config.contextTokens),'--threads','4','--threads-batch','4','--parallel','1','--n-gpu-layers','0','--jinja','--reasoning','off'];
 const log=fs.openSync(path.join(root,'runtime.log'),'a');
 const startedAt=new Date().toISOString(),start=performance.now();
 const child=spawn(config.binary,args,{detached:true,stdio:['ignore',log,log]});
 child.unref();const record={pid:child.pid,startTicks:identity(child.pid),binary:config.binary,args,startedAt};fs.writeFileSync(pidFile,JSON.stringify(record,null,2));
 let ready=false,error=null;
 for(let i=0;i<180;i++){try{if(identity(child.pid)!==record.startTicks)throw new Error('process_identity_changed');const r=await fetch(`http://127.0.0.1:${config.port}/health`,{signal:AbortSignal.timeout(800)});if(r.ok){ready=true;break;}}catch(e){if(e.code==='ENOENT'){error='process_exited_before_ready';break;}}await new Promise(r=>setTimeout(r,500));}
 fs.writeFileSync(path.join(root,'load.json'),JSON.stringify({...record,ready,error,process_cold_load_to_health_ms:performance.now()-start,page_cache_state:'uncontrolled; no root or cache dropping',warmup:'runtime default',contextTokens:config.contextTokens},null,2));
 console.log(fs.readFileSync(path.join(root,'load.json'),'utf8'));
 if(!ready)process.exitCode=2;
}else if(mode==='stop'){
 const record=JSON.parse(fs.readFileSync(pidFile));
 if(identity(record.pid)!==record.startTicks)throw new Error('refuse_signal_identity_mismatch');
 process.kill(-record.pid,'SIGTERM');
 console.log(JSON.stringify({signal:'SIGTERM',pid:record.pid,at:new Date().toISOString()}));
}else if(mode==='status'){
 const record=JSON.parse(fs.readFileSync(pidFile));console.log(JSON.stringify({...record,identityMatches:identity(record.pid)===record.startTicks,status:fs.readFileSync(`/proc/${record.pid}/status`,'utf8')}));
}else throw new Error('invalid_mode');
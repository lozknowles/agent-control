import {spawn} from 'node:child_process';
import {Readable} from 'node:stream';

// Static remote command; all variable request data (including auth) travels on encrypted stdin.
const proxy=`const fs=require('node:fs');const p=JSON.parse(fs.readFileSync(0,'utf8'));if(!p.path.startsWith('/api/')||!['127.0.0.1','localhost'].includes(p.host)||!Number.isInteger(p.port)||p.port<1||p.port>65535)process.exit(2);fetch('http://'+p.host+':'+p.port+p.path,{method:p.method,headers:p.headers,body:p.body,redirect:'error'}).then(async r=>{process.stdout.write(JSON.stringify({status:r.status,headers:{'content-type':r.headers.get('content-type')||'application/json'}})+'\\n');if(r.body)for await(const c of r.body){if(!process.stdout.write(c))await new Promise(resolve=>process.stdout.once('drain',resolve));}}).catch(()=>process.exit(7));`;
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
export async function sshApiRequest(target,pathname,init={},spawner=spawn){
 const args=['-o','BatchMode=yes','-o','ConnectTimeout=8','-p',String(target.port),...(target.identityFile?['-i',target.identityFile]:[]),...(target.user?['-l',target.user]:[]),target.host,'node -e '+quote(proxy)];
 const child=spawner('ssh',args,{stdio:['pipe','pipe','ignore'],windowsHide:true});
 child.stdin.on('error',()=>{});
 child.stdin.end(JSON.stringify({host:target.statusHost,port:target.statusPort,path:pathname,method:init.method??'GET',headers:init.headers,body:init.body}));
 return new Promise((resolve,reject)=>{
  let header=Buffer.alloc(0),responseStarted=false,closed=false,control;
  const fail=()=>{if(closed)return;closed=true;if(responseStarted)control.error(Error('SSH API stream unavailable'));else reject(Error('SSH API transport unavailable'));child.kill();};
  const abort=()=>fail();init.signal?.addEventListener('abort',abort,{once:true});if(init.signal?.aborted)return fail();
  child.on('error',fail);child.on('exit',code=>{init.signal?.removeEventListener('abort',abort);if(closed)return;if(!responseStarted||code!==0)return fail();closed=true;control.close();});
  child.stdout.on('data',chunk=>{
   if(closed)return;
   if(responseStarted){control.enqueue(new Uint8Array(chunk));return;}
   header=Buffer.concat([header,chunk]);const index=header.indexOf(10);if(index<0){if(header.length>8192)fail();return;}
   try{const metadata=JSON.parse(header.subarray(0,index).toString());if(!Number.isInteger(metadata.status)||metadata.status<200||metadata.status>599)throw Error();const initial=header.subarray(index+1);const stream=new ReadableStream({start(c){control=c;},cancel(){closed=true;init.signal?.removeEventListener('abort',abort);child.kill();}});responseStarted=true;const response=new Response(stream,{status:metadata.status,headers:metadata.headers});if(initial.length)control.enqueue(new Uint8Array(initial));header=Buffer.alloc(0);resolve(response);}catch{fail();}
  });
 });
}

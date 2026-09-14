import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
export async function exportReport({baseUrl,token,runId,profile='simple',format,directory='.',request=fetch}){
 const base=new URL(baseUrl);
 if(!['https:','http:'].includes(base.protocol)||base.username||base.password||base.search||base.hash||(base.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(base.hostname)))throw Error('report_endpoint_invalid');
 if(!token||!runId||runId.length>240||!/^[a-z][a-z0-9-]{0,47}$/.test(profile))throw Error('report_request_invalid');
 const url=new URL(`/api/observability/runs/${encodeURIComponent(runId)}/outputs/${encodeURIComponent(profile)}`,base);if(format)url.searchParams.set('format',format);
 const response=await request(url,{headers:{Authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`report_download_http_${response.status}`);
 let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>16*1024*1024)throw Error('report_response_too_large');chunks.push(chunk);}
 const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(typeof value.filename!=='string'||!(/^[A-Za-z0-9_-]+\.(md|txt|json)$/).test(value.filename)||typeof value.content!=='string'||createHash('sha256').update(value.content).digest('hex')!==value.sha256)throw Error('report_response_invalid');
 const target=path.resolve(directory,value.filename);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,value.content,{flag:'wx',mode:0o600});
 return {path:target,runId:value.runId,profile:value.profile,sourceSha256:value.sourceSha256,sha256:value.sha256};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{const options={};for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i],value=process.argv[i+1];if(!['--run','--output-profile','--format','--directory','--url'].includes(key)||!value||options[key])throw Error('report_arguments_invalid');options[key]=value;}
 const result=await exportReport({baseUrl:options['--url']??process.env.AGENT_CONTROL_WEB_BASE_URL??'http://127.0.0.1:4310',token:process.env.AGENT_CONTROL_WEB_OPERATOR_TOKEN,runId:options['--run'],profile:options['--output-profile']??'simple',format:options['--format'],directory:options['--directory']??'.'});console.log(JSON.stringify(result,null,2));
 }catch(error){console.error(error.code==='EEXIST'?'Report file already exists; choose another directory.':error.message);process.exitCode=1;}
}

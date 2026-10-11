import {readFile,realpath} from 'node:fs/promises';
import {isAbsolute,join,resolve} from 'node:path';
import {ExternalSessionStore,type AuthorizedExternalSessionFile,type ExternalSessionStoreReport} from './external-session-store.js';

export interface ExternalUsageRuntime {
  snapshot():ExternalSessionStoreReport & {freshness:'CURRENT'|'STALE_SOURCE_ERROR'};
  refresh():Promise<void>;
  close():void;
}

/** Opt-in manifest outside HTTP. A dashboard request only reads the committed projection. */
export async function startExternalUsageRuntime(manifestPath:string,stateRoot:string,pollMs=30000):Promise<ExternalUsageRuntime>{
  if(!isAbsolute(manifestPath))throw Error('external_manifest_absolute_path_required');
  const manifest=JSON.parse(await readFile(resolve(manifestPath),'utf8')) as {schema?:unknown;files?:unknown};
  if(manifest.schema!=='agent-control.external-usage-manifest/v1'||!Array.isArray(manifest.files)||manifest.files.length<1||manifest.files.length>32)throw Error('external_manifest_invalid');
  const files:AuthorizedExternalSessionFile[]=await Promise.all(manifest.files.map(async(value:unknown)=>{
    if(!value||typeof value!=='object')throw Error('external_manifest_invalid');
    const row=value as Record<string,unknown>;
    if(!['codex','claude'].includes(String(row.source))||typeof row.file!=='string'||!isAbsolute(row.file)||Object.keys(row).some(k=>!['source','file'].includes(k)))throw Error('external_manifest_invalid');
    // Pin the canonical target selected by the operator. A later symlink retarget
    // cannot silently authorize a different source file.
    return {source:row.source as 'codex'|'claude',file:await realpath(row.file)};
  }));
  if(new Set(files.map(f=>f.source+'\0'+resolve(f.file))).size!==files.length)throw Error('external_manifest_duplicate_source');
  const store=new ExternalSessionStore(join(stateRoot,'external-usage','evidence.json'));
  let latest:ExternalSessionStoreReport & {freshness:'CURRENT'|'STALE_SOURCE_ERROR'}={...await store.snapshot(),freshness:'STALE_SOURCE_ERROR'};
  let fatalError:Error|null=null;
  let running=false;
  const refresh=async()=>{
    if(running)return;running=true;
    try{
      for(const file of files)if(await realpath(file.file)!==file.file)throw Error('external_source_target_changed');
      latest={...await store.ingest(files),freshness:'CURRENT'};fatalError=null;
    }
    catch{
      try{latest={...await store.snapshot(),freshness:'STALE_SOURCE_ERROR'};fatalError=null;}
      catch(error){fatalError=error instanceof Error?error:Error('external_store_unavailable');}
    }
    finally{running=false;}
  };
  await refresh();
  const timer=setInterval(()=>void refresh(),pollMs);timer.unref();
  return {snapshot:()=>{if(fatalError)throw fatalError;return latest;},refresh,close:()=>clearInterval(timer)};
}

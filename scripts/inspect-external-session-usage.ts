import {readExternalSessionLog,reconcileExternalSnapshots} from '../src/control/external-session-usage.js';
import {ExternalSessionStore} from '../src/control/external-session-store.js';

const args=process.argv.slice(2);
let storeFile:string|undefined;
if(args[0]==='--store'){args.shift();storeFile=args.shift();}
const [source,...files]=args;
if((source!=='codex'&&source!=='claude')||files.length<1||files.length>32){
  process.stderr.write('Usage: node --import tsx scripts/inspect-external-session-usage.ts [--store <external-evidence-store>] <codex|claude> <authorized-jsonl-file> [...files, maximum 32]\n');
  process.exitCode=1;
}else{
  try{
    if(storeFile){
      const report=await new ExternalSessionStore(storeFile).ingest(files.map(file=>({source,file})));
      process.stdout.write(JSON.stringify(report,null,2)+'\n');
    }else{
      const snapshots=[];
      for(const file of files)snapshots.push(await readExternalSessionLog(source,file));
      process.stdout.write(JSON.stringify(reconcileExternalSnapshots(snapshots),null,2)+'\n');
    }
  }catch{
    // Avoid exposing private paths or conversation text in filesystem errors.
    process.stderr.write('External session inspection failed; verify authorized paths, file type and size.\n');
    process.exitCode=1;
  }
}

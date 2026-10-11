import {readExternalSessionLog,reconcileExternalSnapshots} from '../src/control/external-session-usage.js';

const [source,...files]=process.argv.slice(2);
if((source!=='codex'&&source!=='claude')||files.length<1||files.length>32){
  process.stderr.write('Usage: node --import tsx scripts/inspect-external-session-usage.ts <codex|claude> <authorized-jsonl-file> [...files, maximum 32]\n');
  process.exitCode=1;
}else{
  try{
    const snapshots=[];
    for(const file of files)snapshots.push(await readExternalSessionLog(source,file));
    process.stdout.write(JSON.stringify(reconcileExternalSnapshots(snapshots),null,2)+'\n');
  }catch{
    // Avoid exposing private paths or conversation text in filesystem errors.
    process.stderr.write('External session inspection failed; verify authorized paths, file type and size.\n');
    process.exitCode=1;
  }
}

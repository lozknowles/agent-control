import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export function blenderSceneVerifier(executable){
  return{id:'blender-isolated-read/v1',async verify(file){
    const {stdout}=await promisify(execFile)(executable,['--background','--disable-autoexec',file,'--python',fileURLToPath(new URL('./computer-use-verify-blender.py',import.meta.url))],{windowsHide:true,timeout:30000,maxBuffer:128000});
    const lines=stdout.split(/\r?\n/).filter(line=>line.startsWith('AGENT_CONTROL_SCENE='));if(lines.length!==1)throw Error('blender_verification_output_invalid');
    const value=JSON.parse(lines[0].slice('AGENT_CONTROL_SCENE='.length));
    const passed=path.resolve(value.filepath)===path.resolve(file)&&JSON.stringify(value.location)==='[1,0,0]'&&JSON.stringify(value.scale)==='[2,2,2]'&&JSON.stringify(value.objects)==='["Camera","Cube","Light"]';
    return{passed,details:value};
  }};
}

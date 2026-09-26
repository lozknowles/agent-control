import {ComputerProviderRegistry,ComputerUseCapability,DefaultComputerAuthority,type ComputerTask,type ComputerAuthority} from '../src/control/computer-use.js';
import type {ComputerProvider} from '../src/control/computer-use.js';

export async function runQualification(task:ComputerTask,options:{provider:ComputerProvider;windowId:string}){
  const provider=options.provider;
  const base=new DefaultComputerAuthority();
  const authority:ComputerAuthority={authorize(t,a,o){
    if(t.taskId.startsWith('msi-blender-qualification-')&&t.target.machine==='controller-local'&&t.target.application==='Blender'&&t.target.window===options.windowId&&['screenshot','click'].includes(a.operation))return 'ALLOW';
    return base.authorize(t,a,o);
  }};
  return new ComputerUseCapability(new ComputerProviderRegistry().register(provider),authority).execute(task);
}

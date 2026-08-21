import type {Resource} from './capabilities.js';
import {capabilityId} from './capabilities.js';
import {androidProvisioningWorkItems,createAndroidProvisioningHandler} from './android-provisioning.js';
import type {AndroidProvisioningOperations} from './android-provisioning.js';
import {WorkCoordinator} from './work-coordinator.js';
import {WorkExecutor,type ExecutionEvent} from './work-executor.js';
import {WorkQueue,type ResourceLoad} from './work-queue.js';
import type {WorkQueueStore} from './work-queue-store.js';
export const PIXEL_PAIRING_WORK_ID='android.pixel.provision.pairing-approval';
export function ensureAndroidProvisioningMission(queue:WorkQueue){let added=0;for(const item of androidProvisioningWorkItems())if(!queue.get(item.id)){queue.enqueue(item);added++;}return added;}
export function hpubuntuProvisioningResource(adbQualified:boolean):Resource{return{id:'hpubuntu',type:'host',health:'healthy',capabilities:[{id:capabilityId.shell,kind:'tool'},{id:capabilityId.packageInstall,kind:'tool'},{id:capabilityId.networkRead,kind:'tool'},{id:capabilityId.ssh,kind:'transport'},{id:capabilityId.repoWrite,kind:'tool'},{id:capabilityId.androidPackageInstall,kind:'tool'},{id:capabilityId.codex,kind:'harness'},...(adbQualified?[{id:capabilityId.adb,kind:'transport' as const}]:[])]};}
export interface ProvisioningRunOptions{queue:WorkQueue;store:WorkQueueStore;ops:AndroidProvisioningOperations;approvePairing?:boolean;maxSteps?:number;onEvent?:(event:ExecutionEvent)=>void;}
export async function runAndroidProvisioning(o:ProvisioningRunOptions){o.queue.reconcileDependencies();const pairing=o.queue.get(PIXEL_PAIRING_WORK_ID);if(o.approvePairing&&pairing?.status==='human-review'&&pairing.dependsOn.every(id=>o.queue.get(id)?.status==='completed')){pairing.status='completed';pairing.resultRef='android-wireless-debugging-pairing-approved';pairing.claimedBy=undefined;}o.store.save(o.queue);const handler=createAndroidProvisioningHandler(o.ops),events:ExecutionEvent[]=[];for(let i=0;i<(o.maxSteps??100);i++){const adbQualified=await o.ops.detectAdb();const resource=hpubuntuProvisioningResource(adbQualified);const coordinator=new WorkCoordinator(o.queue,undefined,o.store);const executor=new WorkExecutor(coordinator,handler);const event=await executor.step([resource],[{resourceId:resource.id,busy:0,capacity:1}]);events.push(event);o.queue.reconcileDependencies();o.store.save(o.queue);o.onEvent?.(event);if(['idle','review','failed','loop'].includes(event.kind))break;}return{events,queue:o.queue};}
export function provisioningSummary(queue:WorkQueue){queue.reconcileDependencies();return queue.all().filter(w=>w.id.startsWith('android.pixel.provision.')).map(w=>`${w.status.padEnd(12)} ${w.id}${w.resultRef?` ${w.resultRef}`:''}`).join('\n');}

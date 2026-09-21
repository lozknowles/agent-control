/** Pure, bounded display/replay functions. No runtime calls. */
export function positionEstate(entities){
 const positions=new Map(),hosts=entities.filter(e=>e.kind==='host'),groups=new Map();
 for(const e of entities){const host=e.laneId||e.detail?.hostId||e.id;if(!groups.has(host))groups.set(host,[]);groups.get(host).push(e);}
 const hostIds=[...new Set([...hosts.map(e=>e.id),...groups.keys()])].sort();
 const rows=new Map();for(const e of entities){const group=hostIds.indexOf(e.kind==='host'?e.id:e.laneId||e.detail?.hostId||e.id),gx=(group%5)*58,gz=Math.floor(group/5)*60;const key=`${group}:${e.kind}`,i=rows.get(key)||0;rows.set(key,i+1);const column={host:0,cpu:-16,gpu:-16,storage:-25,repository:-25,worker:16,runtime:0,endpoint:0,model:19,service:-4,skill:28,capability:28,unknown:28}[e.kind]??0;const z={host:-12,cpu:-5,gpu:2,storage:13,repository:21,worker:-5,runtime:2,endpoint:8,model:10,service:23,skill:20,capability:27,unknown:30}[e.kind]??0;positions.set(e.id,{x:gx+column+(e.kind==='service'?i%5*5:i%2*5),y:e.kind==='host'?2:1,z:gz+z+Math.floor(i/(e.kind==='service'?5:2))*5});}
 return{positions,lanes:[],unassignedZ:Math.max(8,Math.ceil(hostIds.length/5)*30)};
}
export function filterEstate(projection,{query='',host='',kind='',collapsed=false,limit=160,selected=null}={}){
 const q=query.toLowerCase();let all=projection.entities.filter(e=>(!host||e.id===host||e.laneId===host)&&(!kind||e.kind===kind)&&(!q||`${e.label} ${e.id} ${e.state}`.toLowerCase().includes(q))&&(!collapsed||q||kind||e.id===selected||!['service','skill'].includes(e.kind)));
 all=all.sort((a,b)=>(a.id===selected?-1:b.id===selected?1:0)||(a.kind==='host'?-1:b.kind==='host'?1:0)||a.id.localeCompare(b.id));const entities=all.slice(0,limit),ids=new Set(entities.map(e=>e.id));return{...projection,entities,relations:projection.relations.filter(r=>ids.has(r.from)&&ids.has(r.to)),displayCoverage:{matched:all.length,shown:entities.length,total:projection.entities.length,limit}};
}
export function replayEstate(record,index){
 if(record?.schema!=='agent-control.estate-replay/v1'||!Array.isArray(record.events)||record.events.length>50000)throw Error('Invalid estate replay');
 const entities=new Map(),relationships=new Map(),events=record.events.slice(0,index+1);for(const e of events){if(e.entity)entities.set(e.entity.id,e.entity);if(e.relationship)relationships.set(e.relationship.id,e.relationship);}
 return{schema:'agent-control.factory/v1',domain:'ESTATE',observedAt:events.at(-1)?.at??record.snapshot.startedAt,authority:'READ_ONLY_RUNTIME_PROJECTION',estate:{snapshotId:record.snapshot.id,status:'REPLAY',relationships:[...relationships.values()],diff:[]},entities:[...entities.values()].map(e=>({id:e.id,sourceId:e.id,kind:e.kind,label:e.label,state:e.state,laneId:e.hostId,runId:record.snapshot.runId,at:e.lastSeen,metrics:{},links:[],detail:{...e,howDoWeKnow:e.evidence}})),relations:[...relationships.values()].map(r=>({...r,sourceId:r.id,label:r.kind,kind:'evidence'})),events:events.slice(-100).map(e=>({id:e.id,at:e.at,kind:e.type,entityId:e.entity?.id??null,caption:e.caption,sourceId:e.id})),coverage:{omittedEntities:0,limits:{entities:10000,runs:1,invocations:0},limitations:['Recorded evidence only. Playback never reruns discovery or workloads.']}};
}

import type {DiscoveryScan} from './environment-discovery.js';
import {estateObservationState,projectEstateMap} from './estate-map.js';
import type {RunRecord} from './job-types.js';
import type {RuntimeMapProjection} from './runtime-map.js';

export interface CapabilityCandidate {resourceId:string;nodeId:string;capability:string;confidence:string;evidence:{fingerprint:string;expiresAt?:string;[key:string]:unknown};}
export interface DeclaredReadiness {
  id:string;jobDigest:string;primaryState:string;qualification:string;authority:{state:string;[key:string]:unknown};
  requirements:Array<{type:string;requirement:string;satisfied:boolean;candidates:CapabilityCandidate[];evidence:CapabilityCandidate[]}>;
  reasons:Array<{state:string;code:string;requirement:string}>;
  [key:string]:unknown;
}
export interface ExecutionAdmission {
  jobDigest:string;resourceIds:string[];capabilities:string[];state:'QUALIFIED';
  runId:string;artifactSha256:string;implementationSha256:string;expiresAt:string;
  authentication:'NOT_REQUIRED'|'AUTHENTICATED';scope:'READ_ONLY_LOCAL_INSPECTION';
}
// Controller-owned admission records are produced from successful, independently
// verified JobRuntime runs, never accepted from catalogue or model output.
export function operationalReadiness(declared:DeclaredReadiness,scan:DiscoveryScan,admissions:ExecutionAdmission[]=[],now=new Date()) {
  const byId=new Map(scan.items.map(i=>[i.id,i]));
  const reasons=[...declared.reasons];
  const add=(state:string,code:string,requirement:string)=>reasons.push({state,code,requirement});
  const chains=declared.requirements.map(requirement=>({...requirement,resources:requirement.evidence.map(binding=>{
    const resource=byId.get(binding.resourceId);
    const machine=scan.items.find(i=>i.kind==='MACHINE'&&i.nodeId===binding.nodeId);
    const state=resource?estateObservationState(resource,+now):null;
    const deviceState=machine?estateObservationState(machine,+now):null;
    const currentProof=binding.confidence==='VERIFIED' && resource?.fingerprint===binding.evidence.fingerprint &&
      Boolean(binding.evidence.expiresAt) && Date.parse(binding.evidence.expiresAt!)>+now;
    const alive=Boolean(currentProof&&state?.alive&&deviceState?.alive);
    return {resourceId:binding.resourceId,nodeId:binding.nodeId,deviceId:machine?.id??null,
      capability:binding.capability,bindingConfidence:binding.confidence,evidence:binding.evidence,
      discovered:Boolean(resource),reachable:alive,alive,fresh:state?.fresh??false,
      health:resource?.health??'UNKNOWN',authentication:state?.authentication??'UNKNOWN',
      resourceQualification:resource?.lifecycle??'UNKNOWN',deviceAlive:deviceState?.alive??null};
  })}));
  for(const r of chains) {
    if(r.satisfied&&!r.resources.some(resource=>resource.alive)) add('BLOCKED','supporting_resource_not_alive',r.requirement);
    if(r.resources.some(resource=>['AUTHENTICATION_REQUIRED','INVALID','EXPIRED'].includes(resource.authentication))) add('AUTHENTICATION_REQUIRED','resource_authentication_required',r.requirement);
  }
  const admission=admissions.find(a=>a.jobDigest===declared.jobDigest && a.state==='QUALIFIED' &&
    /^[a-f0-9]{64}$/.test(a.implementationSha256)&&/^[a-f0-9]{64}$/.test(a.artifactSha256)&&a.runId &&
    Date.parse(a.expiresAt)>+now && ['NOT_REQUIRED','AUTHENTICATED'].includes(a.authentication) &&
    a.scope==='READ_ONLY_LOCAL_INSPECTION' && a.resourceIds.length>0 &&
    new Set(a.resourceIds.map(id=>byId.get(id)?.nodeId)).size===1 &&
    a.resourceIds.every(id=>{const i=byId.get(id);return i&&estateObservationState(i,+now).alive;}) &&
    chains.filter(r=>r.type==='capability').every(r=>a.capabilities.includes(r.requirement)&&r.resources.some(c=>c.alive&&a.resourceIds.includes(c.resourceId))));
  if(!admission) add('UNSUPPORTED','qualified_execution_contract_missing',declared.id);
  const primaryState=['BLOCKED','AUTHENTICATION_REQUIRED','UNSUPPORTED','CONNECTOR_REQUIRED','CREDENTIAL_REQUIRED','CONFIGURATION_REQUIRED'].find(s=>reasons.some(r=>r.state===s))??'READY';
  return {...declared,schema:'agent-control.operational-job-readiness/v1',declaredReadiness:declared.primaryState,
    primaryState,technicalReadiness:primaryState,reasons,chains,executionAdmission:admission??null,
    authorityGranted:false,executable:false,execution:'NOT_STARTED',
    launchRequirement:'Fresh resource proof, target/input-bound permission and budget checks are still mandatory.'};
}

export type OperationalReadiness=ReturnType<typeof operationalReadiness>;
/** Extends the existing Estate Map schema; topology is derived, never fabricated. */
export function projectJobEstateMap(scan:DiscoveryScan,results:OperationalReadiness[],runs:RunRecord[]=[],now=new Date()):RuntimeMapProjection {
  const map=projectEstateMap(scan,now.toISOString());
  for(const result of results) {
    const jobId=`library-job:${result.id}`;
    map.nodes.push({id:jobId,type:'job',label:result.id,state:result.primaryState==='READY'?'SUCCEEDED':'BLOCKED',expandable:true,
      detail:{technicalReadiness:result.primaryState,declaredReadiness:result.declaredReadiness,authority:result.authority,
        qualification:result.qualification,whyReady:result.chains},evidence:[{kind:'job-library-manifest',id:result.id,sha256:result.jobDigest}]});
    for(const requirement of result.chains) {
      const capId=`library-capability:${requirement.type}:${requirement.requirement}`;
      if(!map.nodes.some(n=>n.id===capId)) map.nodes.push({id:capId,type:'validation',label:requirement.requirement,state:'WAITING',expandable:true,
        detail:{requirementType:requirement.type},evidence:[]});
      map.edges.push({id:`${jobId}:${capId}`,from:jobId,to:capId,kind:'dependency',state:requirement.satisfied?'SUCCEEDED':'BLOCKED',evidence:[]});
      for(const binding of requirement.resources) {
        const node=map.nodes.find(n=>n.id===binding.resourceId); if(!node) continue;
        const edgeId=`${capId}:${node.id}`;
        if(!map.edges.some(e=>e.id===edgeId)) map.edges.push({id:edgeId,from:capId,to:node.id,kind:'evidence',state:binding.alive?'SUCCEEDED':'WAITING',
          label:binding.bindingConfidence,evidence:[{kind:'capability-binding',id:node.id,sha256:String(binding.evidence.fingerprint)}]});
        const impact=(node.detail.jobLibrary??={capabilitiesProvided:[],jobsDependingOn:[],jobsEnabled:[],readyJobs:[],approvalRequiredJobs:[],activeJobs:[],recentJobs:[]}) as Record<string,string[]>;
        const append=(key:string,value:string)=>{if(!impact[key].includes(value))impact[key].push(value);};
        if(binding.bindingConfidence==='VERIFIED'&&binding.alive) append('capabilitiesProvided',requirement.requirement);
        append('jobsDependingOn',result.id);
        if(binding.alive&&result.primaryState==='READY') append('jobsEnabled',result.id);
        if(result.primaryState==='READY') append('readyJobs',result.id);
        if(result.authority.state==='APPROVAL_REQUIRED') append('approvalRequiredJobs',result.id);
        for(const run of runs.filter(r=>r.parameters.libraryJobId===result.id)) append(['SUCCEEDED','FAILED','CANCELLED','DEGRADED'].includes(run.status)?'recentJobs':'activeJobs',run.id);
      }
    }
  }
  return map;
}

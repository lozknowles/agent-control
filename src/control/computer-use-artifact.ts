import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export interface ComputerOutputGrant {runId:string;root:string;relativePath:string;notBefore:string;maxBytes:number;}
export interface ComputerArtifactProof {path:string;size:number;mtime:string;sha256:string;application?:{verifier:string;passed:boolean;details:unknown};}
export interface ComputerApplicationVerifier {id:string;verify(file:string):Promise<{passed:boolean;details:unknown}>;}
/** The grant is controller configuration, never accepted from rendered UI or task JSON. */
export async function verifyComputerArtifact(grant:ComputerOutputGrant,runId:string,verifier?:ComputerApplicationVerifier):Promise<ComputerArtifactProof>{
  if(grant.runId!==runId||!Number.isFinite(Date.parse(grant.notBefore))||!Number.isSafeInteger(grant.maxBytes)||grant.maxBytes<1)throw Error('artifact_grant_invalid');
  if(!grant.relativePath||path.isAbsolute(grant.relativePath)||grant.relativePath.includes(':')||grant.relativePath.split(/[\\/]/).some(p=>p==='..'||p==='.'||!p))throw Error('artifact_path_out_of_scope');
  const root=fs.realpathSync(grant.root),file=path.resolve(root,grant.relativePath),relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('artifact_path_out_of_scope');
  let cursor=root;for(const part of relative.split(path.sep)){cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink())throw Error('artifact_link_forbidden');}
  if(fs.realpathSync(file)!==file)throw Error('artifact_path_out_of_scope');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
  try{
    const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.nlink!==1||stat.size===0||stat.size>grant.maxBytes||stat.mtimeMs<Date.parse(grant.notBefore)||stat.mtimeMs>Date.now()+2000)throw Error('artifact_file_invalid_or_stale');
    const bytes=fs.readFileSync(fd),sha256=createHash('sha256').update(bytes).digest('hex');
    const proof:ComputerArtifactProof={path:file,size:stat.size,mtime:stat.mtime.toISOString(),sha256};
    if(verifier){const application=await verifier.verify(file);proof.application={verifier:verifier.id,...application};if(!application.passed)throw Error('application_verification_failed');}
    cursor=root;for(const part of relative.split(path.sep)){cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink())throw Error('artifact_changed_during_verification');}
    if(fs.realpathSync(file)!==file)throw Error('artifact_changed_during_verification');
    const final=fs.statSync(file);if(final.dev!==stat.dev||final.ino!==stat.ino||final.size!==stat.size||final.mtimeMs!==stat.mtimeMs||createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==sha256)throw Error('artifact_changed_during_verification');
    return proof;
  }finally{fs.closeSync(fd);}
}

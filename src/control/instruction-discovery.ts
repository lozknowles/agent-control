import fs from 'node:fs';
import path from 'node:path';
import {instructionHash, instructionPath, type InstructionSource} from './instruction-resolver.js';

export interface InstructionRepository {id: string; root: string; revision: string | null; approvedRoots: string[]; targetPaths: string[];}
function contained(root: string, candidate: string) { const relative=path.relative(root,candidate); return relative==='' || relative!=='..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); }

/** Reads only canonical instruction filenames along explicit target ancestry. Never reads shell profiles or environment files. */
export function discoverRepositoryInstructions(repository: InstructionRepository, maximumFileBytes=262144): InstructionSource[] {
  if (!Number.isSafeInteger(maximumFileBytes) || maximumFileBytes<1 || maximumFileBytes>1048576) throw new Error('instruction_discovery_budget_invalid');
  const root=fs.realpathSync(repository.root);
  if (!repository.approvedRoots.some(approved=>contained(fs.realpathSync(approved),root))) throw new Error('instruction_repository_not_approved');
  const scopes=new Set<string>(['.']);
  for (const target of repository.targetPaths.map(instructionPath)) {
    let scope=target==='.'?'.':path.posix.dirname(target);
    while (scope!=='.') {scopes.add(scope);scope=path.posix.dirname(scope);}
  }
  if (scopes.size>128) throw new Error('instruction_discovery_scope_limit');
  const sources: InstructionSource[]=[];
  for (const scope of [...scopes].sort()) for (const filename of ['AGENTS.md','agents.md']) {
    const relative=scope==='.'?filename:`${scope}/${filename}`, candidate=path.join(root,...relative.split('/'));
    const source: InstructionSource={type:'REPOSITORY',uri:`repo://${repository.id}/${relative}`,revision:repository.revision,scope,reason:'Canonical AGENTS.md ancestor of an explicitly assigned target.'};
    if (!fs.existsSync(candidate)) continue;
    if (filename!=='AGENTS.md') {sources.push({...source,exclusion:'NON_CANONICAL_FILENAME_NOT_LOADED'});continue;}
    let fd: number | undefined;
    try {
      if (fs.lstatSync(candidate).isSymbolicLink() || path.resolve(candidate)!==fs.realpathSync(candidate) || !contained(root,fs.realpathSync(candidate))) {sources.push({...source,exclusion:'SYMLINK_OR_SCOPE_ESCAPE'});continue;}
      fd=fs.openSync(candidate,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
      const stat=fs.fstatSync(fd);
      if (!stat.isFile() || stat.size>maximumFileBytes) {sources.push({...source,exclusion:'FILE_TYPE_OR_DISCOVERY_BUDGET_EXCLUDED'});continue;}
      const buffer=Buffer.alloc(stat.size+1), bytes=fs.readSync(fd,buffer,0,buffer.length,0), after=fs.fstatSync(fd);
      if (bytes!==stat.size || after.size!==stat.size || after.mtimeMs!==stat.mtimeMs) {sources.push({...source,exclusion:'SOURCE_CHANGED_DURING_DISCOVERY'});continue;}
      const content=buffer.subarray(0,bytes).toString('utf8');
      if (content.includes('\0') || !Buffer.from(content).equals(buffer.subarray(0,bytes))) {sources.push({...source,exclusion:'NON_UTF8_INSTRUCTIONS'});continue;}
      sources.push({...source,content,contentHash:instructionHash(content)});
    } catch {sources.push({...source,exclusion:'DISCOVERY_UNAVAILABLE'});}
    finally {if(fd!==undefined)fs.closeSync(fd);}
  }
  return sources;
}

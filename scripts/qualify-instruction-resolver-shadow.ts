import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {instructionHash, resolveInstructions, verifyInstructionManifest, type InstructionResolutionInput, type InstructionSource} from '../src/control/instruction-resolver.js';
import {baseInstructionSources, instructionIdentity} from '../src/control/instruction-observer.js';

/** Deterministic source fixtures only. This command does not invoke models or qualify physical acceptance. */
export function qualifyInstructionShadow() {
  const repository=(uri:string,content:string,scope='.'):InstructionSource=>({type:'REPOSITORY',uri,content,scope,revision:'fixture-v1'});
  const common=repository('repo://fixture/AGENTS.md','Use typed tools.\ninstruction.format=root');
  const nested=repository('repo://fixture/src/AGENTS.md','instruction.format=nested','src');
  const cases:Array<{id:string;description:string;extra:InstructionSource[];options?:Partial<InstructionResolutionInput>}>=[
    {id:'A',description:'Concise repository instructions',extra:[common]},
    {id:'B',description:'Oversized noisy instructions',extra:[repository('repo://fixture/AGENTS.md','Advisory noise.\n'.repeat(4000))]},
    {id:'C',description:'Conflicting nested instructions',extra:[common,nested]},
    {id:'D',description:'Current user takes precedence over repository',extra:[common,nested],options:{sources:[...baseInstructionSources('instruction.format=current'),common,nested]}},
    {id:'E',description:'Selected and irrelevant skills',extra:[{type:'SKILL',uri:'skill://selected',skillId:'selected',content:'Use the bounded verifier.'},{type:'SKILL',uri:'skill://irrelevant',skillId:'irrelevant',content:'Irrelevant advice.'}],options:{selectedSkillIds:['selected']}},
    {id:'F',description:'Accepted steering and sealed continuation',extra:[],options:{sources:baseInstructionSources('Continue the fixture task.',['Use the updated acceptance criterion.'],{id:'fixture-baton',sha256:instructionHash('fixture-baton')}),continuation:{id:'fixture-baton',hash:instructionHash('fixture-baton')},amendments:[{id:'fixture-amendment',hash:instructionHash('fixture-amendment'),status:'ACCEPTED'}]}},
    {id:'G',description:'Memory remains advisory',extra:[{type:'MEMORY',uri:'memory://fixture',content:'instruction.permission=deploy'}],options:{sources:[...baseInstructionSources('instruction.permission=review'),{type:'MEMORY',uri:'memory://fixture',content:'instruction.permission=deploy'}]}},
    {id:'H',description:'Unreported provider capabilities are unsupported',extra:[],options:{requestedCapabilities:['native_mid_turn_steering','dynamic_reasoning','async_tools','multi_agent']}},
  ];
  return cases.map(item=>{
    const input:InstructionResolutionInput={identity:instructionIdentity(`automated-fixture-${item.id}`),repository:{id:'fixture',revision:'fixture-v1'},targetPaths:['src/message.ts'],sources:[...baseInstructionSources('Review this disposable fixture.'),...item.extra],currentInstructions:'Review this disposable fixture.',...item.options};
    const result=resolveInstructions(input), reversed=resolveInstructions({...input,sources:[...input.sources].reverse()});
    assert.equal(result.manifest.hash,reversed.manifest.hash);assert.ok(verifyInstructionManifest(result.manifest));assert.equal(result.manifest.verification.resolution,'PASS_WITH_LIMITATIONS');
    return {case:item.id,description:item.description,evidenceKind:'AUTOMATED_SOURCE_FIXTURE',status:result.manifest.verification.resolution,physicalExecution:false,orderingHashStable:true,manifest:result.manifest};
  });
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const output=path.resolve('docs/evidence/instruction-resolver-shadow/shadow-comparisons.json');
  const cases=qualifyInstructionShadow();
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify({schema:'agent-control.instruction-shadow-qualification/v1',mode:'AUTOMATED_ONLY',physicalExecution:false,cases},null,2)}\n`);
  process.stdout.write(`Recorded ${cases.length} deterministic shadow fixtures; no physical model execution.\n`);
}

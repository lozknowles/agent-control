import type {ExecutionRecipe} from './adaptive-harness.js';
import type {ContextPacketSource} from './harness-efficiency.js';
import type {InstructionSource, InstructionSourceType} from './instruction-resolver.js';

/** Classification is supplied by controller-owned context builders, never by text inside a file. */
export function recipeInstructionSources(recipe: ExecutionRecipe, contexts: ContextPacketSource[] = []): InstructionSource[] {
  const types: Record<ContextPacketSource['kind'], InstructionSourceType> = {
    system_instructions: 'PLATFORM_POLICY', agent_control_instructions: 'GOVERNANCE', tool_schemas: 'PROVIDER_OVERLAY',
    skills: 'SKILL', workspace_bootstrap: 'REPOSITORY', repository_instructions: 'REPOSITORY',
    task_context: 'MEMORY', memory_shared_context: 'MEMORY', conversation_history: 'CONTINUATION', other: 'MEMORY',
  };
  return [
    ...(recipe.skills??[]).map(skill => ({type: 'SKILL' as const, uri: `agent-control://skills/${skill.id}`, revision: skill.version,
      skillId: skill.id, content: undefined, reason: 'Selected recipe skill; definition contains capability metadata, not instruction text.',
      exclusion: 'SELECTED_SKILL_TEXT_NOT_OBSERVED'})),
    ...contexts.map(source => ({type: types[source.kind], uri: `agent-control://context/${source.id}`, content: source.content,
      revision: source.provenanceIds.join(',') || null, ...(source.kind === 'skills' ? {skillId: source.id} : {}),
      reason: `Controller context source: ${source.kind}. Repository ancestry is only asserted by bounded file discovery.`})),
  ];
}

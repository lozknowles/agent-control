import type {ProviderConfig} from './config.js';

export type ProviderKind = 'local' | 'responses' | 'cli' | 'browser-bridge';
export type ProviderHealth = 'unconfigured' | 'unknown' | 'healthy' | 'degraded' | 'offline';
export interface ProviderDefinition {id: string; name: string; kind: ProviderKind; baseUrl?: string; wireApi?: 'responses'; requiresAuth: boolean; parallelism: number; costClass: 'free' | 'included' | 'metered'; capabilities: string[]; qualificationModel?: string;}
export interface ProviderState {providerId: string; health: ProviderHealth; detail?: string; checkedAt: string;}
export interface AgentRecipe {id: string; providerId: string; model: string; profile: string; reasoning: 'off' | 'low' | 'medium' | 'high'; promptVersion: string; tools: string[]; skills: string[];}

export class ProviderRegistry {
  private defs = new Map<string, ProviderDefinition>();
  private states = new Map<string, ProviderState>();
  register(definition: ProviderDefinition) {
    this.defs.set(definition.id, definition);
    if (!this.states.has(definition.id)) this.states.set(definition.id, {providerId: definition.id, health: 'unknown', checkedAt: new Date(0).toISOString()});
    return definition;
  }
  get(id: string) { return this.defs.get(id); }
  list() { return [...this.defs.values()]; }
  setHealth(providerId: string, health: ProviderHealth, detail?: string) {
    if (!this.defs.has(providerId)) throw new Error(`provider ${providerId} not registered`);
    const state = {providerId, health, detail, checkedAt: new Date().toISOString()};
    this.states.set(providerId, state);
    return state;
  }
  health(id: string) { return this.states.get(id); }
  canRun(recipe: AgentRecipe) {
    const definition = this.defs.get(recipe.providerId), state = this.states.get(recipe.providerId);
    return Boolean(definition && state?.health === 'healthy');
  }
}

export function providersFromConfig(configured: ProviderConfig[]): ProviderDefinition[] {
  return configured.map(provider => ({
    id: provider.id,
    name: provider.name ?? provider.id,
    kind: provider.kind,
    baseUrl: provider.baseUrl,
    wireApi: provider.wireApi,
    requiresAuth: provider.requiresAuth ?? false,
    parallelism: provider.parallelism ?? 1,
    costClass: provider.costClass ?? 'metered',
    capabilities: [...(provider.capabilities ?? [])],
    qualificationModel: provider.qualificationModel,
  }));
}

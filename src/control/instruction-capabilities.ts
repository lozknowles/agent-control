/** Mechanism names and outcomes are portable. Adapter offers are evidence, never authority. */
export const INSTRUCTION_CAPABILITIES = ['native_mid_turn_steering', 'dynamic_reasoning', 'async_tools', 'multi_agent'] as const;
export type InstructionCapability = typeof INSTRUCTION_CAPABILITIES[number];
export type CapabilityMechanism = 'NATIVE' | 'CONTINUATION' | 'EMULATED' | 'UNSUPPORTED';
export interface InstructionCapabilityOffer {
  capability: InstructionCapability;
  outcome: CapabilityMechanism;
  adapter: string;
  reason: string;
  evidence: string[];
}
export interface InstructionCapabilityResult extends InstructionCapabilityOffer {requested: boolean;}

export function negotiateInstructionCapabilities(requested: readonly InstructionCapability[], offers: readonly InstructionCapabilityOffer[]): InstructionCapabilityResult[] {
  for (const capability of requested) if (!INSTRUCTION_CAPABILITIES.includes(capability)) throw new Error('instruction_capability_unknown');
  for (const offer of offers) {
    if (!INSTRUCTION_CAPABILITIES.includes(offer.capability) || !['NATIVE','CONTINUATION','EMULATED','UNSUPPORTED'].includes(offer.outcome)) throw new Error('instruction_capability_offer_invalid');
    if (offer.outcome !== 'UNSUPPORTED' && !offer.evidence.length) throw new Error('instruction_capability_evidence_required');
  }
  return INSTRUCTION_CAPABILITIES.map(capability => {
    const matches = offers.filter(offer => offer.capability === capability);
    if (matches.length > 1) throw new Error('instruction_capability_offer_ambiguous');
    return {...(matches[0] ?? {capability, outcome: 'UNSUPPORTED' as const, adapter: 'unreported', reason: 'No qualified mechanism reported by this invocation adapter.', evidence: []}), requested: requested.includes(capability)};
  });
}

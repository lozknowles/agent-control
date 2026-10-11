import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeExternalUsage } from "./external-token-normalization.js";
test("Codex inclusive cached reads are not double counted", () => {
 const u=normalizeExternalUsage({source:"codex",externalSessionId:"s",externalEventId:"e",at:"2026-10-11T12:00:00Z",inputTokens:100,cachedInputTokens:70,outputTokens:20,reasoningOutputTokens:5,cacheReadIsIncludedInInput:true});
 assert.equal(u.freshInput,30);assert.equal(u.totalProcessed,120);assert.equal(u.reasoningOutput,5);
});
test("Claude exclusive cache reads become additive", () => {
 const u=normalizeExternalUsage({source:"claude",externalSessionId:"s",externalEventId:"e",at:"2026-10-11T12:00:00Z",inputTokens:30,cachedInputTokens:70,cacheWriteTokens:10,outputTokens:20,cacheReadIsIncludedInInput:false});
 assert.equal(u.totalProcessed,130);assert.equal(u.freshInput,30);
});
test("Unknown cached input remains unknown",()=>{
 const u=normalizeExternalUsage({source:"codex",externalSessionId:"s",externalEventId:"e",at:"2026-10-11T12:00:00Z",inputTokens:100,outputTokens:20,cacheReadIsIncludedInInput:true});
 assert.equal(u.freshInput,null);assert.equal(u.totalProcessed,120);
});
test("Inconsistent inclusive counters fail closed",()=>assert.throws(()=>normalizeExternalUsage({source:"codex",externalSessionId:"s",externalEventId:"e",at:"2026-10-11T12:00:00Z",inputTokens:5,cachedInputTokens:8,cacheReadIsIncludedInInput:true})));

import assert from "node:assert/strict";
import test from "node:test";
import { PtyRegistry } from "./pty";
import { advanceStage, planOvernight } from "./experiments";
import type { ModelRecipe } from "./types";

const recipe = (id: string): ModelRecipe => ({ id, modelSha: `${id}-sha`, modelName: id, runtime: "llama.cpp", contextSize: 16384, chatTemplate: "embedded", promptVersion: "v1", skillSnapshot: [], toolSnapshot: [], parameters: { temperature: .2 } });

test("PTY ownership is exclusive and human takeover is unconditional", () => {
  const registry = new PtyRegistry();
  registry.upsert({ id: "pty-1", cwd: "/tmp", command: "psql", recovery: "reattachable" }, "1");
  registry.attach("pty-1", "qwen", "own");
  assert.throws(() => registry.attach("pty-1", "codex", "own"));
  registry.humanTakeover("pty-1", "loz");
  assert.equal(registry.attached("pty-1").find(a => a.access === "own")?.actorId, "loz");
});

test("PTY control can be transferred between agents", () => {
  const registry = new PtyRegistry();
  registry.upsert({ id: "pty-2", cwd: "/repo", command: "vim", recovery: "reconstructable" }, "2");
  registry.attach("pty-2", "qwen", "own");
  registry.transferControl("pty-2", "qwen", "codex");
  assert.equal(registry.attached("pty-2").find(a => a.access === "own")?.actorId, "codex");
});

test("overnight successive halving advances strongest cheap candidates", () => {
  const plan = planOvernight([recipe("a"), recipe("b"), recipe("c"), recipe("d")], 100);
  const results = ["a","b","c","d"].map((id, i) => ({ recipeId: id, capability: "coding", passed: true, quality: 1 - i * .2, latencyMs: 10, substitutions: 0 }));
  const advanced = advanceStage(plan, results, "cheap");
  assert.equal(advanced.variants.filter(v => v.stage === "capability").length, 2);
  assert.ok(advanced.variants.find(v => v.recipe.id === "a")?.stage === "capability");
});

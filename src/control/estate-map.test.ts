import assert from "node:assert/strict";
import test from "node:test";
import { projectEstateMap } from "./estate-map.js";
import type { DiscoveryItem, DiscoveryScan } from "./environment-discovery.js";

const at = "2026-09-12T12:00:00.000Z";
function item(
  input: Partial<DiscoveryItem> & Pick<DiscoveryItem, "id" | "kind" | "label">,
): DiscoveryItem {
  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    nodeId: input.nodeId ?? "controller",
    health: input.health ?? "HEALTHY",
    lifecycle: input.lifecycle ?? "QUALIFIED",
    resourceClasses: input.resourceClasses ?? [],
    operationalState: input.operationalState ?? "QUALIFIED",
    change: input.change ?? "NEW",
    fingerprint: input.fingerprint ?? input.id.padEnd(64, "0").slice(0, 64),
    attributes: input.attributes ?? {},
    provenance: input.provenance ?? [
      {
        adapter: "fixture",
        method: "bounded-probe",
        observedAt: at,
        authority: "AUTHORITATIVE",
      },
    ],
    ...(input.configuredId ? { configuredId: input.configuredId } : {}),
    ...(input.relatedIds ? { relatedIds: input.relatedIds } : {}),
  };
}
function scan(items: DiscoveryItem[]): DiscoveryScan {
  return {
    schema: "agent-control.environment-discovery/v1",
    id: "scan-1",
    mode: "FULL_DISCOVERY",
    testing: "QUICK_TEST",
    startedAt: at,
    completedAt: at,
    includeRemote: true,
    includeMemory: false,
    status: "COMPLETED",
    items,
    failures: [],
    summary: {
      machines: 1,
      gpus: 0,
      localModels: 1,
      providers: 0,
      agents: 0,
      tools: 0,
      memorySources: 0,
      healthy: items.length,
      needsQualification: 0,
      unavailable: 0,
      new: items.length,
    },
    recommendations: [],
  };
}

test("estate graph reuses runtime graph schema and creates only evidenced hierarchy", () => {
  const machine = item({
      id: "machine:controller",
      kind: "MACHINE",
      label: "Controller",
      nodeId: "controller",
      configuredId: "controller",
      attributes: {
        platform: "linux",
        transport: "ssh",
        address: "100.64.0.2",
        port: 2222,
        username: "loz",
        authenticationMethod: "ssh-identity-reference",
        credentialStatus: "CONFIGURED",
      },
    }),
    runtime = item({
      id: "runtime:controller:llama",
      kind: "RUNTIME",
      label: "llama.cpp",
      nodeId: "controller",
    }),
    model = item({
      id: "model:controller:qwen",
      kind: "MODEL",
      label: "Qwen",
      nodeId: "controller",
      attributes: { runtime: "llama.cpp" },
    }),
    projection = projectEstateMap(
      scan([machine, runtime, model]),
      "2026-09-12T12:01:00.000Z",
    );
  assert.equal(projection.mapKind, "ESTATE");
  assert.equal(
    projection.authority,
    "Agent Control governed discovery inventory",
  );
  assert.ok(projection.nodes.some((node) => node.type === "transport"));
  assert.ok(
    projection.edges.some(
      (edge) => edge.from === runtime.id && edge.to === model.id,
    ),
  );
  const transport = projection.nodes.find((node) => node.type === "transport")!;
  assert.equal(transport.detail.port, 2222);
  assert.equal(transport.detail.authentication, "••••••••••••");
  assert.doesNotMatch(
    JSON.stringify(projection),
    /identityFile|PRIVATE KEY|Bearer /i,
  );
});

test("discovered is not alive after resource-specific evidence expires", () => {
  const machine = item({
      id: "machine:controller",
      kind: "MACHINE",
      label: "Controller",
      configuredId: "controller",
    }),
    projection = projectEstateMap(scan([machine]), "2026-09-12T12:03:00.001Z"),
    node = projection.nodes.find((value) => value.id === machine.id)!;
  assert.equal(node.detail.availability, "NOT_CURRENTLY_VERIFIED");
  assert.equal(node.state, "WAITING");
  assert.equal(projection.freshness.state, "STALE");
});

test("unknown relationships are never inferred from similar labels", () => {
  const machine = item({
      id: "machine:a",
      kind: "MACHINE",
      label: "A",
      nodeId: "a",
    }),
    runtime = item({
      id: "runtime:b:ollama",
      kind: "RUNTIME",
      label: "Ollama",
      nodeId: "b",
    }),
    model = item({
      id: "model:a:ollama-like",
      kind: "MODEL",
      label: "Ollama Model",
      nodeId: "a",
      attributes: { runtime: "not-ollama" },
    }),
    projection = projectEstateMap(
      scan([machine, runtime, model]),
      "2026-09-12T12:00:30.000Z",
    );
  assert.equal(
    projection.edges.some(
      (edge) => edge.from === runtime.id && edge.to === model.id,
    ),
    false,
  );
});

test("estate projection remains bounded for fifty-plus resources", () => {
  const items = [
      item({
        id: "machine:controller",
        kind: "MACHINE",
        label: "Controller",
        nodeId: "controller",
      }),
      ...Array.from({ length: 60 }, (_, index) =>
        item({
          id: `model:controller:m${index}`,
          kind: "MODEL",
          label: `Model ${index}`,
          nodeId: "controller",
        }),
      ),
    ],
    started = performance.now(),
    projection = projectEstateMap(scan(items), "2026-09-12T12:00:30.000Z");
  assert.equal(projection.nodes.length, 62);
  assert.ok(performance.now() - started < 250);
  assert.equal(projection.summary.groups, 1);
});

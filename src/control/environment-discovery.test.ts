import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DefaultDiscoveryProbe,
  EnvironmentDiscoveryRuntime,
  type DiscoveryAdapter,
  type DiscoveryAdapterContext,
  type DiscoveryItem,
  type DiscoveryObservation,
  type DiscoveryProbe,
} from "./environment-discovery.js";
import { emptyConfig, type AgentControlConfig } from "./config.js";

test("default command probe bounds descendant processes that retain stdio", async () => {
  const started = Date.now(),
    result = await new DefaultDiscoveryProbe().command(
      process.execPath,
      [
        "-e",
        "require('node:child_process').spawn(process.execPath,['-e','setTimeout(()=>{},10000)'],{stdio:['ignore','inherit','inherit']});setTimeout(()=>{},10000)",
      ],
      100,
    );
  assert.equal(result.ok, false);
  assert.match(result.stderr, /command_timeout/);
  assert.ok(Date.now() - started < 2_000);
});

const probe: DiscoveryProbe = {
  command: async (command) =>
    command === "nvidia-smi"
      ? { ok: true, stdout: "0, Fixture GPU, 8192, 555.1\n", stderr: "" }
      : {
          ok: command === "which",
          stdout: command === "which" ? "/usr/bin/tool\n" : "tool 1.0\n",
          stderr: "",
        },
  json: async (url) =>
    url.includes("11434")
      ? {
          ok: true,
          status: 200,
          body: {
            models: [
              { name: "qwen-fixture", size: 42, digest: "sha256:fixture" },
            ],
          },
        }
      : { ok: false, status: 0, body: null },
};
function setup(
  config: AgentControlConfig = emptyConfig(),
  adapters?: DiscoveryAdapter[],
) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "environment-discovery-")),
    file = path.join(root, "state.json");
  let revision = "r1",
    applied = 0,
    parcels = 0;
  const runtime = new EnvironmentDiscoveryRuntime({
    file,
    config: () => structuredClone(config),
    configurationRevision: () => revision,
    environment: { FIXTURE_KEY: "synthetic-value" },
    probe,
    adapters,
    createWorkParcel: () => `parcel-${++parcels}`,
    applyConfiguration: () => {
      applied++;
      revision = "r2";
    },
  });
  return {
    root,
    file,
    runtime,
    setRevision(value: string) {
      revision = value;
    },
    get applied() {
      return applied;
    },
    get parcels() {
      return parcels;
    },
  };
}

test("discovers machine GPU runtimes and local model without treating a file as qualified", async (t) => {
  const s = setup();
  t.after(() => fs.rmSync(s.root, { recursive: true, force: true }));
  const scan = await s.runtime.discover({ mode: "FULL_DISCOVERY" });
  assert.equal(scan.status, "COMPLETED");
  assert.ok(scan.items.some((item) => item.kind === "MACHINE"));
  assert.equal(
    scan.items.find((item) => item.kind === "GPU")?.attributes.vramMiB,
    8192,
  );
  assert.equal(
    scan.items.find((item) => item.label === "qwen-fixture")?.health,
    "NEEDS_QUALIFICATION",
  );
  assert.ok(
    scan.items.some(
      (item) => item.kind === "ENDPOINT" && item.health === "HEALTHY",
    ),
  );
});

test("configured providers credentials models routes and remote permission boundary are projected without secrets", async (t) => {
  const config: AgentControlConfig = {
    ...emptyConfig(),
    resources: [
      {
        id: "remote-a",
        name: "Remote A",
        platform: "linux",
        transport: { type: "ssh", host: "node.example" },
        capabilities: ["compute"],
        managedNode: {},
      },
    ],
    providers: [
      {
        id: "provider-a",
        kind: "openai-compatible",
        baseUrl: "https://provider.example/v1",
        auth: { type: "api-key-env", env: "FIXTURE_KEY" },
        accountProfiles: [],
      },
    ],
    models: [
      {
        id: "model-a",
        provider: "provider-a",
        providerModel: "model-a",
        capabilities: ["coding"],
        qualification: {
          state: "QUALIFIED",
          version: "q1",
          capabilities: ["coding"],
          nodes: ["remote-a"],
        },
      },
    ],
    modelRouting: { roles: { coding: { primary: "model-a" } } },
  };
  const s = setup(config);
  t.after(() => fs.rmSync(s.root, { recursive: true, force: true }));
  const scan = await s.runtime.discover({ mode: "QUICK_RESCAN" });
  assert.equal(
    scan.items.some(
      (item) => item.kind === "MACHINE" && item.configuredId === "remote-a",
    ),
    false,
  );
  assert.equal(
    scan.items.find((item) => item.kind === "CREDENTIAL")?.attributes.available,
    true,
  );
  assert.doesNotMatch(JSON.stringify(scan), /synthetic-value|FIXTURE_KEY/);
  await assert.rejects(
    () => s.runtime.discover({ mode: "ADD_MACHINE" }),
    /remote_permission_required/,
  );
  const remote = await s.runtime.discover({
    mode: "ADD_MACHINE",
    includeRemote: true,
  });
  assert.ok(
    remote.items.some(
      (item) => item.kind === "MACHINE" && item.configuredId === "remote-a",
    ),
  );
});

test("change detection distinguishes authentication model endpoint offline and removed resources", async (t) => {
  let generation = 0;
  const adapter: DiscoveryAdapter = {
    id: "fixture",
    discover: async (_context: DiscoveryAdapterContext) => {
      const rows: DiscoveryObservation[] =
        generation++ === 0
          ? [
              {
                id: "credential:p",
                kind: "CREDENTIAL",
                label: "P credential",
                nodeId: "controller",
                health: "UNAVAILABLE",
                lifecycle: "DISCOVERED",
                attributes: { available: false },
                provenance: [
                  {
                    adapter: "fixture",
                    method: "fixture",
                    observedAt: "2026-01-01T00:00:00Z",
                    authority: "AUTHORITATIVE",
                  },
                ],
              },
              {
                id: "model:m",
                kind: "MODEL",
                label: "M",
                nodeId: "controller",
                health: "HEALTHY",
                lifecycle: "QUALIFIED",
                attributes: { digest: "one" },
                provenance: [
                  {
                    adapter: "fixture",
                    method: "fixture",
                    observedAt: "2026-01-01T00:00:00Z",
                    authority: "AUTHORITATIVE",
                  },
                ],
              },
              {
                id: "endpoint:e",
                kind: "ENDPOINT",
                label: "E",
                nodeId: "controller",
                health: "HEALTHY",
                lifecycle: "QUALIFIED",
                attributes: { scope: "loopback", version: "one" },
                provenance: [
                  {
                    adapter: "fixture",
                    method: "fixture",
                    observedAt: "2026-01-01T00:00:00Z",
                    authority: "AUTHORITATIVE",
                  },
                ],
              },
              {
                id: "machine:x",
                kind: "MACHINE",
                label: "X",
                nodeId: "x",
                health: "HEALTHY",
                lifecycle: "QUALIFIED",
                attributes: { version: "one" },
                provenance: [
                  {
                    adapter: "fixture",
                    method: "fixture",
                    observedAt: "2026-01-01T00:00:00Z",
                    authority: "AUTHORITATIVE",
                  },
                ],
              },
            ]
          : [
              {
                id: "credential:p",
                kind: "CREDENTIAL",
                label: "P credential",
                nodeId: "controller",
                health: "HEALTHY",
                lifecycle: "QUALIFIED",
                attributes: { available: true },
                provenance: [
                  {
                    adapter: "fixture",
                    method: "fixture",
                    observedAt: "2026-01-02T00:00:00Z",
                    authority: "AUTHORITATIVE",
                  },
                ],
              },
              {
                id: "model:m",
                kind: "MODEL",
                label: "M",
                nodeId: "controller",
                health: "HEALTHY",
                lifecycle: "QUALIFIED",
                attributes: { digest: "two" },
                provenance: [
                  {
                    adapter: "fixture",
                    method: "fixture",
                    observedAt: "2026-01-02T00:00:00Z",
                    authority: "AUTHORITATIVE",
                  },
                ],
              },
              {
                id: "endpoint:e",
                kind: "ENDPOINT",
                label: "E",
                nodeId: "controller",
                health: "OFFLINE",
                lifecycle: "DISCOVERED",
                attributes: { scope: "loopback", version: "two" },
                provenance: [
                  {
                    adapter: "fixture",
                    method: "fixture",
                    observedAt: "2026-01-02T00:00:00Z",
                    authority: "AUTHORITATIVE",
                  },
                ],
              },
            ];
      return rows;
    },
  };
  const s = setup(emptyConfig(), [adapter]);
  t.after(() => fs.rmSync(s.root, { recursive: true, force: true }));
  await s.runtime.discover({ mode: "QUICK_RESCAN" });
  const scan = await s.runtime.discover({ mode: "QUICK_RESCAN" }),
    changes = Object.fromEntries(
      scan.items.map((item) => [item.id, item.change]),
    );
  assert.equal(changes["credential:p"], "AUTHENTICATION_CHANGED");
  assert.equal(changes["model:m"], "MODEL_UPDATED");
  assert.equal(changes["endpoint:e"], "OFFLINE");
  assert.equal(changes["machine:x"], "REMOVED");
});

test("partial adapter failure is isolated and malformed model metadata is ignored", async (t) => {
  const adapters: DiscoveryAdapter[] = [
    {
      id: "broken",
      discover: async () => {
        throw new Error("adapter unavailable");
      },
    },
    { id: "healthy", discover: async () => [] },
  ];
  const s = setup(emptyConfig(), adapters);
  t.after(() => fs.rmSync(s.root, { recursive: true, force: true }));
  const scan = await s.runtime.discover({ mode: "FULL_DISCOVERY" });
  assert.equal(scan.status, "PARTIAL");
  assert.equal(scan.failures[0]?.adapter, "broken");
});

test("duplicate observations merge provenance and empty installations remain truthful", async (t) => {
  const adapter: DiscoveryAdapter = {
    id: "duplicates",
    discover: async (context) => {
      const rows: DiscoveryObservation[] = [
        {
          id: "runtime:same",
          kind: "RUNTIME",
          label: "same",
          nodeId: "controller",
          health: "UNKNOWN",
          lifecycle: "DISCOVERED",
          attributes: { version: "one" },
          provenance: [
            {
              adapter: "one",
              method: "configured",
              observedAt: context.observedAt,
              authority: "CONFIGURED",
            },
          ],
        },
        {
          id: "runtime:same",
          kind: "RUNTIME",
          label: "same",
          nodeId: "controller",
          health: "HEALTHY",
          lifecycle: "QUALIFIED",
          attributes: { reachable: true },
          provenance: [
            {
              adapter: "two",
              method: "probe",
              observedAt: context.observedAt,
              authority: "AUTHORITATIVE",
            },
          ],
        },
      ];
      return rows;
    },
  };
  const s = setup(emptyConfig(), [adapter]);
  t.after(() => fs.rmSync(s.root, { recursive: true, force: true }));
  const scan = await s.runtime.discover({ mode: "QUICK_RESCAN" });
  assert.equal(scan.items.length, 1);
  assert.equal(scan.items[0]?.health, "HEALTHY");
  assert.equal(scan.items[0]?.provenance.length, 2);
  assert.equal(scan.summary.providers, 0);
  assert.equal(scan.summary.localModels, 0);
  assert.equal(
    scan.recommendations.some((value) => value.category !== "CONFIGURATION"),
    false,
  );
});

test("offline configured node remains visible only after explicit remote discovery permission", async (t) => {
  const config = {
    ...emptyConfig(),
    resources: [
      {
        id: "pixel",
        platform: "android" as const,
        transport: { type: "ssh" as const, host: "pixel" },
        capabilities: ["android"],
      },
    ],
    modelRouting: { roles: {} },
  };
  const s = setup(config);
  t.after(() => fs.rmSync(s.root, { recursive: true, force: true }));
  const scan = await s.runtime.discover({
    mode: "FULL_DISCOVERY",
    includeRemote: true,
  });
  const machine = scan.items.find(
    (item) => item.kind === "MACHINE" && item.configuredId === "pixel",
  );
  assert.equal(machine?.health, "UNKNOWN");
  assert.equal(machine?.provenance[0]?.authority, "CONFIGURED");
});

test("proposal hash revision Work Parcel and explicit approval guard configuration application", async (t) => {
  const s = setup();
  t.after(() => fs.rmSync(s.root, { recursive: true, force: true }));
  const scan = await s.runtime.discover({ mode: "FIRST_RUN" }),
    recommendation = scan.recommendations.find((item) => item.operation);
  assert.ok(recommendation);
  const draft = s.runtime.createProposal(
    scan.id,
    [recommendation.id],
    "operator",
  );
  assert.equal(draft.state, "DRAFT");
  assert.throws(
    () => s.runtime.approveProposal(draft.id, "bad", "operator"),
    /hash_mismatch/,
  );
  const saved = s.runtime.saveProposal(draft.id, draft.sha256),
    approved = s.runtime.approveProposal(saved.id, saved.sha256, "operator");
  assert.equal(approved.state, "APPROVED");
  assert.equal(s.parcels, 1);
  assert.equal(s.applied, 0);
  const applied = s.runtime.applyProposal(
    approved.id,
    approved.sha256,
    "operator",
  );
  assert.equal(applied.state, "APPLIED");
  assert.equal(s.applied, 1);
});

test("configuration movement invalidates a stale discovery proposal before approval", async (t) => {
  const s = setup();
  t.after(() => fs.rmSync(s.root, { recursive: true, force: true }));
  const scan = await s.runtime.discover({ mode: "FIRST_RUN" }),
    recommendation = scan.recommendations.find((item) => item.operation)!;
  const proposal = s.runtime.createProposal(
    scan.id,
    [recommendation.id],
    "operator",
  );
  s.setRevision("changed-by-another-operator");
  assert.throws(
    () => s.runtime.approveProposal(proposal.id, proposal.sha256, "operator"),
    /configuration_changed/,
  );
  assert.equal(s.applied, 0);
  assert.equal(s.parcels, 0);
});

test("secrets from a defective adapter are redacted at the discovery boundary before persistence", async (t) => {
  const secret = ["nvapi", "fixture", "VERYSECRETFIXTUREVALUE"].join("-"),
    adapter: DiscoveryAdapter = {
      id: "unsafe",
      discover: async (context) => [
        {
          id: "provider:unsafe",
          kind: "PROVIDER",
          label: "unsafe",
          nodeId: "controller",
          health: "HEALTHY",
          lifecycle: "DISCOVERED",
          attributes: { detail: secret },
          provenance: [
            {
              adapter: "unsafe",
              method: "bad",
              observedAt: context.observedAt,
              authority: "UNKNOWN",
            },
          ],
        },
      ],
    };
  const s = setup(emptyConfig(), [adapter]);
  t.after(() => fs.rmSync(s.root, { recursive: true, force: true }));
  const scan = await s.runtime.discover({ mode: "QUICK_RESCAN" }),
    stored = fs.readFileSync(s.file, "utf8");
  assert.doesNotMatch(JSON.stringify(scan), new RegExp(secret));
  assert.doesNotMatch(stored, new RegExp(secret));
  assert.match(stored, /REDACTED/);
});

test("configured mobile edge observations remain transport-neutral and do not infer routing", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "environment-edge-")),
    config: AgentControlConfig = {
      ...emptyConfig(),
      resources: [
        {
          id: "pixel",
          name: "Pixel",
          platform: "android",
          transport: {
            type: "ssh",
            host: "100.64.0.9",
            port: 8022,
            user: "termux",
          },
          capabilities: [],
          managedNode: {},
          metadata: { metered: true },
        },
      ],
    },
    runtime = new EnvironmentDiscoveryRuntime({
      file: path.join(root, "state.json"),
      config: () => config,
      configurationRevision: () => "r1",
      probe,
      edgeNodes: () => [
        {
          nodeId: "pixel",
          adapterId: "fixture-mobile-companion",
          transportClass: "PRIVATE",
          transportLabel: "Tailscale + SSH",
          authority: "AUTHORITATIVE",
          observedAt: "2026-09-12T12:00:00Z",
          device: {
            label: "Pixel",
            platform: "android",
            batteryPercent: 72,
            charging: false,
            metered: true,
            accelerator: "mobile",
          },
          runtimes: [
            { id: "llama.cpp", version: "fixture", health: "HEALTHY" },
          ],
          models: [
            {
              id: "gemma",
              label: "Gemma",
              runtime: "llama.cpp",
              parameterSize: "4B",
              quantisation: "Q4",
              loaded: true,
              health: "HEALTHY",
            },
          ],
          authentication: "AUTHENTICATED",
        },
      ],
    });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scan = await runtime.discover({
      mode: "FULL_DISCOVERY",
      includeRemote: true,
    }),
    machine = scan.items.find(
      (item) => item.kind === "MACHINE" && item.nodeId === "pixel",
    )!,
    model = scan.items.find(
      (item) => item.kind === "MODEL" && item.nodeId === "pixel",
    )!;
  assert.equal(machine.attributes.computeClass, "MOBILE_LOCAL");
  assert.equal(machine.attributes.metered, true);
  assert.equal(model.attributes.loaded, true);
  assert.equal(model.attributes.routingEligible, false);
  assert.equal(
    scan.recommendations.some(
      (value) =>
        value.resourceIds.includes(model.id) &&
        value.category !== "CONFIGURATION",
    ),
    false,
  );
  assert.doesNotMatch(JSON.stringify(scan), /password|PRIVATE KEY/i);
});

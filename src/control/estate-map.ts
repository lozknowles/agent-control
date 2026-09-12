import { createHash } from "node:crypto";
import type {
  DiscoveryItem,
  DiscoveryKind,
  DiscoveryScan,
} from "./environment-discovery.js";
import type {
  RuntimeMapEdge,
  RuntimeMapNode,
  RuntimeMapNodeType,
  RuntimeMapProjection,
  RuntimeMapState,
} from "./runtime-map.js";
import { redactSensitiveValue } from "./security-redaction.js";

export const ESTATE_FRESHNESS_MS: Record<DiscoveryKind, number> = {
  MACHINE: 120_000,
  GPU: 86_400_000,
  RUNTIME: 300_000,
  MODEL: 900_000,
  PROVIDER: 1_800_000,
  CREDENTIAL: 1_800_000,
  AGENT: 120_000,
  TOOL: 900_000,
  SKILL: 86_400_000,
  MCP: 300_000,
  PLUGIN: 86_400_000,
  MEMORY: 900_000,
  ENDPOINT: 300_000,
  JOB: 300_000,
  ROUTE: 300_000,
};
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const safe = <T>(value: T) => redactSensitiveValue(value) as T;
const ESTATE_GROUP_THRESHOLD = 4;
const GROUP_LABELS: Record<DiscoveryKind, string> = {
  MACHINE: "Machines",
  GPU: "GPUs",
  RUNTIME: "Runtimes",
  MODEL: "Models",
  PROVIDER: "Providers",
  CREDENTIAL: "Credentials",
  AGENT: "Agents",
  TOOL: "Tools",
  SKILL: "Skills",
  MCP: "MCP servers",
  PLUGIN: "Plugins",
  MEMORY: "Memory sources",
  ENDPOINT: "Endpoints",
  JOB: "Jobs",
  ROUTE: "Routes",
};
const typeFor = (item: DiscoveryItem): RuntimeMapNodeType =>
  (
    ({
      MACHINE: ["android", "ios", "ipados"].includes(
        String(item.attributes.platform),
      )
        ? "device"
        : "machine",
      GPU: "gpu",
      RUNTIME: "runtime",
      MODEL: "model",
      PROVIDER: "provider",
      CREDENTIAL: "credential",
      AGENT: "worker",
      TOOL: "tool",
      SKILL: "skill",
      MCP: "mcp-server",
      PLUGIN: "tool",
      MEMORY: "memory",
      ENDPOINT: "endpoint",
      JOB: "job",
      ROUTE: "decision",
    }) as Record<DiscoveryKind, RuntimeMapNodeType>
  )[item.kind];
function observedAt(item: DiscoveryItem, scan: DiscoveryScan) {
  return (
    item.provenance
      .map((value) => value.observedAt)
      .sort()
      .at(-1) ?? scan.completedAt
  );
}
function stateFor(item: DiscoveryItem, fresh: boolean): RuntimeMapState {
  if (!fresh) return "WAITING";
  if (item.health === "HEALTHY")
    return item.lifecycle === "ACTIVE" ? "RUNNING" : "SUCCEEDED";
  if (item.health === "NEEDS_QUALIFICATION") return "DEGRADED";
  if (item.health === "UNAVAILABLE")
    return item.configuredId ? "FAILED" : "WAITING";
  if (item.health === "OFFLINE")
    return item.configuredId ? "FAILED" : "WAITING";
  return "WAITING";
}
function groupedState(states: RuntimeMapState[]): RuntimeMapState {
  if (states.includes("FAILED")) return "FAILED";
  if (states.includes("DEGRADED")) return "DEGRADED";
  if (states.includes("RUNNING")) return "RUNNING";
  if (states.some((state) => ["WAITING", "BLOCKED"].includes(state)))
    return "WAITING";
  return "SUCCEEDED";
}
function relation(
  from: string,
  to: string,
  kind: RuntimeMapEdge["kind"] = "contains",
  label?: string,
): RuntimeMapEdge {
  return {
    id: `estate-edge:${digest([from, to, kind, label]).slice(0, 16)}`,
    from,
    to,
    kind,
    state: "WAITING",
    ...(label ? { label } : {}),
    evidence: [
      { kind: "environment-discovery-relationship", id: `${from}:${to}` },
    ],
  };
}

export function projectEstateMap(
  scan: DiscoveryScan | null,
  now = new Date().toISOString(),
): RuntimeMapProjection {
  if (!scan) return empty(now);
  const time = Date.parse(now),
    nodes: RuntimeMapNode[] = [],
    edges: RuntimeMapEdge[] = [],
    root = "estate:agent-control",
    byId = new Map(scan.items.map((item) => [item.id, item]));
  nodes.push({
    id: root,
    type: "estate",
    label: "Agent Control Estate",
    subtitle: "Latest governed discovery inventory",
    state: "SUCCEEDED",
    expandable: true,
    detail: {
      scanId: scan.id,
      mode: scan.mode,
      testing: scan.testing,
      completedAt: scan.completedAt,
    },
    evidence: [
      { kind: "environment-discovery-scan", id: scan.id, sha256: digest(scan) },
    ],
  });
  const machineIds = new Map(
    scan.items
      .filter((item) => item.kind === "MACHINE")
      .map((item) => [item.nodeId, item.id]),
  );
  const baseParentFor = (item: DiscoveryItem) =>
      item.kind === "MACHINE" ? root : (machineIds.get(item.nodeId) ?? root),
    groupedItems = new Map<string, DiscoveryItem[]>(),
    groupParents = new Map<string, string>();
  for (const item of scan.items) {
    if (item.kind === "MACHINE") continue;
    const parent = baseParentFor(item),
      key = `${parent}|${item.kind}`,
      values = groupedItems.get(key) ?? [];
    values.push(item);
    groupedItems.set(key, values);
  }
  for (const [key, items] of groupedItems) {
    if (items.length < ESTATE_GROUP_THRESHOLD) continue;
    const [parent, kind] = key.split("|") as [string, DiscoveryKind],
      id = `estate-group:${digest([parent, kind]).slice(0, 16)}`,
      states = items.map((item) =>
        stateFor(
          item,
          Number.isFinite(Date.parse(observedAt(item, scan))) &&
            time - Date.parse(observedAt(item, scan)) <=
              ESTATE_FRESHNESS_MS[item.kind],
        ),
      ),
      counts = Object.fromEntries(
        [...new Set(states)].map((state) => [
          state,
          states.filter((value) => value === state).length,
        ]),
      );
    groupParents.set(key, id);
    nodes.push({
      id,
      type: "estate",
      label: `${GROUP_LABELS[kind]} · ${items.length}`,
      subtitle: "Derived view group · expand to inspect",
      state: groupedState(states),
      parentId: parent,
      groupId: items[0].nodeId,
      expandable: true,
      detail: {
        projectionGroup: true,
        resourceKind: kind,
        resourceNodeType: typeFor(items[0]),
        resourceCount: items.length,
        stateCounts: counts,
        authority: "Derived only from this discovery scan",
      },
      evidence: [{ kind: "environment-discovery-scan", id: scan.id }],
    });
    edges.push(relation(parent, id, "contains", `groups ${kind.toLowerCase()}`));
  }
  for (const item of scan.items) {
    const last = observedAt(item, scan),
      fresh =
        Number.isFinite(Date.parse(last)) &&
        time - Date.parse(last) <= ESTATE_FRESHNESS_MS[item.kind],
      baseParent = baseParentFor(item),
      parent =
        groupParents.get(`${baseParent}|${item.kind}`) ?? baseParent;
    nodes.push(
      safe({
        id: item.id,
        type: typeFor(item),
        label: item.label,
        subtitle: `${item.operationalState.replaceAll("_", " ")} · ${fresh ? "recently verified" : "stale / not currently verified"}`,
        state: stateFor(item, fresh),
        startedAt: last,
        parentId: parent,
        groupId: item.nodeId,
        expandable: true,
        detail: {
          kind: item.kind,
          configuredId: item.configuredId ?? null,
          nodeId: item.nodeId,
          health: item.health,
          availability:
            fresh && item.health === "HEALTHY"
              ? "ALIVE"
              : "NOT_CURRENTLY_VERIFIED",
          freshness: fresh ? "CURRENT" : "STALE",
          lastSeen: last,
          lastVerified:
            item.lifecycle === "QUALIFIED" || item.lifecycle === "ACTIVE"
              ? last
              : null,
          verificationSource: item.provenance.at(-1)?.method ?? "unknown",
          verificationAuthority: item.provenance.at(-1)?.authority ?? "UNKNOWN",
          qualification: item.lifecycle,
          change: item.change,
          resourceClasses: item.resourceClasses,
          ...item.attributes,
          credentialMask:
            item.kind === "CREDENTIAL"
              ? "••••••••••••"
              : item.attributes.credentialMask,
        },
        evidence: [
          {
            kind: "environment-discovery-item",
            id: item.id,
            sha256: item.fingerprint,
          },
          { kind: "environment-discovery-scan", id: scan.id },
        ],
      }),
    );
    edges.push(
      relation(
        parent,
        item.id,
        "contains",
        item.kind === "MACHINE"
          ? "discovered estate resource"
          : "observed on node",
      ),
    );
  }
  for (const machine of scan.items.filter((item) => item.kind === "MACHINE")) {
    const transports = [
      ...new Set(
        [machine.attributes.transport, machine.attributes.privateTransport]
          .map((value) => String(value ?? "").trim())
          .filter((value) => value && value !== "unreported"),
      ),
    ];
    for (const transport of transports) {
      const id = `transport:${machine.id}:${transport}`;
      nodes.push(
        safe({
          id,
          type: "transport",
          label: transport.toUpperCase(),
          subtitle: `${machine.label} connection`,
          state: stateFor(
            machine,
            time - Date.parse(observedAt(machine, scan)) <=
              ESTATE_FRESHNESS_MS.MACHINE,
          ),
          parentId: machine.id,
          groupId: machine.nodeId,
          expandable: true,
          detail: {
            transport,
            source: "Agent Control",
            destination: machine.label,
            address: machine.attributes.address ?? "unreported",
            port: machine.attributes.port ?? "unreported",
            username: machine.attributes.username ?? "unreported",
            authenticationMethod:
              machine.attributes.authenticationMethod ?? "unreported",
            credentialStatus:
              machine.attributes.credentialStatus ?? "unreported",
            authentication: "••••••••••••",
            health: machine.health,
            lastVerified: observedAt(machine, scan),
          },
          evidence: [
            {
              kind: "environment-discovery-item",
              id: machine.id,
              sha256: machine.fingerprint,
            },
          ],
        }),
      );
      edges.push(relation(machine.id, id, "contains", "reachable through"));
    }
  }
  const providerByConfigured = new Map(
    scan.items
      .filter((item) => item.kind === "PROVIDER" && item.configuredId)
      .map((item) => [item.configuredId!, item.id]),
  );
  const runtimeCandidates = scan.items.filter(
    (item) => item.kind === "RUNTIME",
  );
  for (const item of scan.items) {
    if (item.kind === "MODEL" && typeof item.attributes.provider === "string") {
      const provider = providerByConfigured.get(item.attributes.provider);
      if (provider)
        edges.push(relation(provider, item.id, "dependency", "provides"));
    }
    if (item.kind === "MODEL" && typeof item.attributes.runtime === "string") {
      const runtime = runtimeCandidates.find(
        (value) =>
          value.nodeId === item.nodeId &&
          (value.label === item.attributes.runtime ||
            value.configuredId === item.attributes.runtime),
      );
      if (runtime)
        edges.push(relation(runtime.id, item.id, "contains", "hosts model"));
    }
    if (item.kind === "CREDENTIAL" && item.configuredId) {
      const provider = providerByConfigured.get(item.configuredId);
      if (provider)
        edges.push(
          relation(provider, item.id, "evidence", "authentication reference"),
        );
    }
    for (const related of item.relatedIds ?? []) {
      const target = byId.get(related);
      if (target)
        edges.push(
          relation(item.id, target.id, "dependency", "discovery relationship"),
        );
    }
  }
  const uniqueEdges = [
      ...new Map(
        edges.map((edge) => [`${edge.from}|${edge.to}|${edge.kind}`, edge]),
      ).values(),
    ],
    counts = (kind: DiscoveryKind) =>
      scan.items.filter((item) => item.kind === kind),
    alive = (values: DiscoveryItem[]) =>
      values.filter(
        (item) =>
          stateFor(
            item,
            time - Date.parse(observedAt(item, scan)) <=
              ESTATE_FRESHNESS_MS[item.kind],
          ) === "SUCCEEDED" ||
          stateFor(
            item,
            time - Date.parse(observedAt(item, scan)) <=
              ESTATE_FRESHNESS_MS[item.kind],
          ) === "RUNNING",
      ).length;
  const estateCounts = {
    devices: {
      alive: alive(counts("MACHINE")),
      total: counts("MACHINE").length,
    },
    transports: {
      alive: nodes.filter(
        (node) =>
          node.type === "transport" &&
          ["SUCCEEDED", "RUNNING"].includes(node.state),
      ).length,
      total: nodes.filter((node) => node.type === "transport").length,
    },
    runtimes: {
      alive: alive(counts("RUNTIME")),
      total: counts("RUNTIME").length,
    },
    models: { alive: alive(counts("MODEL")), total: counts("MODEL").length },
    agents: { alive: alive(counts("AGENT")), total: counts("AGENT").length },
    warnings: nodes.filter(
      (node) =>
        ["FAILED", "DEGRADED", "WAITING"].includes(node.state) &&
        node.id !== root,
    ).length,
  };
  const latest =
      scan.items
        .map((item) => observedAt(item, scan))
        .sort()
        .at(-1) ?? scan.completedAt,
    resourceNodes = nodes.filter(
      (node) => node.detail.projectionGroup !== true,
    ),
    summary = {
      nodes: resourceNodes.length,
      edges: uniqueEdges.length,
      running: resourceNodes.filter((n) => n.state === "RUNNING").length,
      waiting: resourceNodes.filter((n) =>
        ["WAITING", "QUEUED", "BLOCKED"].includes(n.state),
      ).length,
      succeeded: resourceNodes.filter((n) => n.state === "SUCCEEDED").length,
      failed: resourceNodes.filter((n) => n.state === "FAILED").length,
      degraded: resourceNodes.filter((n) => n.state === "DEGRADED").length,
      groups: new Set(nodes.map((n) => n.groupId).filter(Boolean)).size,
    };
  const anyCurrent = scan.items.some(
    (item) =>
      time - Date.parse(observedAt(item, scan)) <=
      ESTATE_FRESHNESS_MS[item.kind],
  );
  return safe({
    schema: "agent-control.runtime-map/v1",
    authority: "Agent Control governed discovery inventory",
    mapKind: "ESTATE",
    mode: "LIVE",
    parcelId: scan.id,
    observedAt: now,
    replayAt: null,
    range: { startedAt: scan.startedAt, endedAt: scan.completedAt },
    freshness: {
      state: anyCurrent ? "LIVE" : "STALE",
      lastAuthoritativeAt: latest,
    },
    summary,
    nodes,
    edges: uniqueEdges,
    events: scan.items
      .flatMap((item) =>
        item.provenance.map((provenance) => ({
          at: provenance.observedAt,
          kind: "estate.resource_observed",
          nodeId: item.id,
          state: stateFor(
            item,
            time - Date.parse(provenance.observedAt) <=
              ESTATE_FRESHNESS_MS[item.kind],
          ),
          summary: `${item.label} observed by ${provenance.adapter}`,
          evidence: [
            {
              kind: "environment-discovery-item",
              id: item.id,
              sha256: item.fingerprint,
            },
          ],
        })),
      )
      .sort((a, b) => a.at.localeCompare(b.at)),
    controlRoom: [],
    limitations: [
      "Alive requires recent resource-appropriate evidence; discovery alone is not availability.",
      "Cloud providers are not invoked merely to create heartbeat traffic.",
    ],
    estateCounts,
  } as RuntimeMapProjection & { estateCounts: typeof estateCounts });
}
function empty(now: string): RuntimeMapProjection {
  return {
    schema: "agent-control.runtime-map/v1",
    authority: "Agent Control governed discovery inventory",
    mapKind: "ESTATE",
    mode: "LIVE",
    parcelId: null,
    observedAt: now,
    replayAt: null,
    range: { startedAt: null, endedAt: null },
    freshness: { state: "STALE", lastAuthoritativeAt: null },
    summary: {
      nodes: 0,
      edges: 0,
      running: 0,
      waiting: 0,
      succeeded: 0,
      failed: 0,
      degraded: 0,
      groups: 0,
    },
    nodes: [],
    edges: [],
    events: [],
    controlRoom: [],
    limitations: [
      "Run Environment Discovery to establish the governed estate topology.",
    ],
  };
}

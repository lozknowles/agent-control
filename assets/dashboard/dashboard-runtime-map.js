(() => {
  "use strict";
  const rt = {
    projection: null,
    parcels: [],
    parcelId: "",
    mode: "map",
    selected: null,
    collapsed: new Set(),
    autoClustered: false,
    scale: 1,
    panX: 0,
    panY: 0,
    drag: null,
    timer: null,
    active: false,
  };
  const $ = (id) => document.getElementById(id),
    safe = (value) =>
      String(value ?? "").replace(
        /[&<>'"]/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          })[c],
      ),
    icons = {
      request: "✦",
      poe: "◉",
      planner: "⌁",
      decision: "◆",
      "work-parcel": "▣",
      job: "▤",
      "parallel-lane": "⑂",
      worker: "●",
      "model-call": "✧",
      cache: "◫",
      memory: "◇",
      skill: "⚙",
      tool: "⌘",
      terminal: ">_",
      validation: "✓",
      retry: "↻",
      escalation: "↑",
      approval: "!",
      baton: "⇢",
      aggregation: "⋈",
      consensus: "∑",
      result: "◎",
    };
  const headers = () => ({ Authorization: `Bearer ${state.token}` });
  async function get(url) {
    if (state.operatorAuth !== "authenticated")
      throw new Error("Authenticate to inspect governed runtime evidence.");
    const response = await fetch(url, { headers: headers() });
    if (response.status === 401) authenticationExpired();
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`);
    return value;
  }
  async function loadParcels() {
    rt.parcels = await get("/api/parcels");
    const select = $("runtime-parcel"),
      prior = rt.parcelId;
    select.innerHTML = rt.parcels
      .map(
        (p) =>
          `<option value="${safe(p.id)}">${safe(p.objective.slice(0, 72))} · ${safe(p.status)}</option>`,
      )
      .join("");
    rt.parcelId = rt.parcels.some((p) => p.id === prior)
      ? prior
      : (rt.parcels.find((p) => !p.endedAt)?.id ?? rt.parcels[0]?.id ?? "");
    select.value = rt.parcelId;
  }
  function replayAt() {
    if (rt.mode !== "replay" || !rt.projection?.range.startedAt) return "";
    const start = Date.parse(rt.projection.range.startedAt),
      end = Date.parse(rt.projection.range.endedAt || rt.projection.observedAt),
      ratio = Number($("runtime-replay").value) / 1000;
    return new Date(start + (end - start) * ratio).toISOString();
  }
  async function load() {
    if (!rt.active) return;
    try {
      if (!rt.parcels.length) await loadParcels();
      if (!rt.parcelId) {
        empty("No Work Parcels have authoritative runtime records yet.");
        return;
      }
      const at = replayAt(),
        query = new URLSearchParams({
          parcelId: rt.parcelId,
          ...(at ? { at } : {}),
        }),
        previous = rt.projection;
      rt.projection = await get(`/api/runtime-map?${query}`);
      if (!previous || previous.parcelId !== rt.projection.parcelId) {
        rt.collapsed.clear();
        rt.autoClustered = false;
      }
      if (rt.projection.nodes.length > 30 && !rt.autoClustered) {
        for (const node of rt.projection.nodes)
          if (
            (node.type === "parallel-lane" || node.type === "job") &&
            rt.projection.nodes.some((child) => child.parentId === node.id)
          )
            rt.collapsed.add(node.id);
        rt.autoClustered = true;
      }
      render();
    } catch (error) {
      empty(error.message || String(error));
    }
  }
  function empty(message) {
    $("runtime-map-health").className = "runtime-map-health disconnected";
    $("runtime-map-health").textContent = message;
    $("runtime-map-canvas").innerHTML =
      `<div class="runtime-map-empty">${safe(message)}</div>`;
  }
  function visibleNodes() {
    const all = rt.projection.nodes;
    return all.filter(
      (node) => !node.parentId || !ancestorCollapsed(node, all),
    );
  }
  function ancestorCollapsed(node, all) {
    let parent = node.parentId;
    while (parent) {
      if (rt.collapsed.has(parent)) return true;
      parent = all.find((n) => n.id === parent)?.parentId;
    }
    return false;
  }
  function layout(nodes, edges) {
    const byId = new Map(nodes.map((n) => [n.id, n])),
      depth = new Map(nodes.map((n) => [n.id, 0]));
    for (let i = 0; i < nodes.length; i++)
      for (const e of edges) {
        if (!byId.has(e.from) || !byId.has(e.to)) continue;
        depth.set(
          e.to,
          Math.max(depth.get(e.to) || 0, (depth.get(e.from) || 0) + 1),
        );
      }
    const columns = new Map();
    for (const n of nodes) {
      const d = Math.min(depth.get(n.id) || 0, 12),
        row = columns.get(d) || [];
      row.push(n);
      columns.set(d, row);
    }
    const positions = new Map();
    for (const [d, row] of columns)
      row.forEach((n, i) =>
        positions.set(n.id, { x: 36 + d * 244, y: 36 + i * 112 }),
      );
    return {
      positions,
      width: Math.max(900, (Math.max(0, ...columns.keys()) + 1) * 244 + 80),
      height: Math.max(
        520,
        Math.max(0, ...[...columns.values()].map((x) => x.length)) * 112 + 80,
      ),
    };
  }
  function render() {
    const p = rt.projection,
      stale = p.freshness.state === "STALE";
    $("runtime-map-health").className =
      `runtime-map-health ${p.freshness.state.toLowerCase()}`;
    $("runtime-map-health").innerHTML =
      `<strong>${safe(p.mode)} · ${safe(p.freshness.state)}</strong><span>${safe(p.parcelId)} · authoritative ${safe(p.freshness.lastAuthoritativeAt ? new Date(p.freshness.lastAuthoritativeAt).toLocaleTimeString() : "unavailable")}</span>${stale ? "<b>Dashboard data is stale; execution authority is unaffected.</b>" : ""}`;
    $("runtime-map-summary").textContent =
      `${p.summary.running} running · ${p.summary.waiting} waiting · ${p.summary.succeeded} succeeded · ${p.summary.degraded} degraded · ${p.summary.failed} failed · ${p.summary.nodes} operations`;
    document.querySelector(".runtime-replay-control").hidden =
      rt.mode !== "replay";
    if (rt.mode === "replay")
      $("runtime-replay-time").textContent = new Date(
        p.replayAt,
      ).toLocaleTimeString();
    $("runtime-map-canvas").hidden = rt.mode === "control";
    $("runtime-control-room").hidden = rt.mode !== "control";
    if (rt.mode === "control") {
      renderControl();
      return;
    }
    renderGraph();
    if (rt.selected) inspect(p.nodes.find((n) => n.id === rt.selected));
  }
  function renderGraph() {
    const p = rt.projection,
      nodes = visibleNodes(),
      ids = new Set(nodes.map((n) => n.id)),
      edges = p.edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
      map = layout(nodes, edges),
      canvas = $("runtime-map-canvas"),
      viewWidth = map.width / rt.scale,
      viewHeight = map.height / rt.scale;
    canvas.innerHTML = `<svg class="runtime-map-world" viewBox="${-rt.panX} ${-rt.panY} ${viewWidth} ${viewHeight}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Governed execution topology">${edges
      .map((e) => {
        const a = map.positions.get(e.from),
          b = map.positions.get(e.to);
        if (!a || !b) return "";
        const x1 = a.x + 184,
          y1 = a.y + 34,
          x2 = b.x,
          y2 = b.y + 34,
          m = (x1 + x2) / 2;
        return `<path class="runtime-edge state-${safe(e.state)} kind-${safe(e.kind)}" d="M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}"><title>${safe(e.label || e.kind)}</title></path>`;
      })
      .join("")}${nodes
      .map((n) => {
        const pos = map.positions.get(n.id),
          children = p.nodes.filter((x) => x.parentId === n.id).length;
        return `<g class="runtime-graph-node type-${safe(n.type)} state-${safe(n.state)} ${rt.selected === n.id ? "selected" : ""}" transform="translate(${pos.x} ${pos.y})" data-runtime-node="${safe(n.id)}" role="button" tabindex="0" aria-label="${safe(n.label)}, ${safe(n.state)}"><rect width="184" height="76" rx="10"/><text class="runtime-node-icon" x="13" y="25">${safe(icons[n.type] || "◇")}</text><text class="runtime-node-label" x="42" y="22">${safe(short(n.label, 21))}</text><text class="runtime-node-subtitle" x="42" y="42">${safe(short(n.subtitle || n.type, 24))}</text><text class="runtime-node-status" x="13" y="64">${safe(n.state)}</text>${children ? `<text class="runtime-node-collapse" x="150" y="64" data-runtime-collapse="${safe(n.id)}">${rt.collapsed.has(n.id) ? "+" : "−"} ${children}</text>` : ""}</g>`;
      })
      .join("")}</svg>`;
    canvas.querySelectorAll("[data-runtime-node]").forEach((button) =>
      button.addEventListener("click", (event) => {
        const collapse = event.target.closest("[data-runtime-collapse]");
        if (collapse) {
          event.stopPropagation();
          const id = collapse.dataset.runtimeCollapse;
          rt.collapsed.has(id) ? rt.collapsed.delete(id) : rt.collapsed.add(id);
          renderGraph();
          return;
        }
        rt.selected = button.dataset.runtimeNode;
        inspect(p.nodes.find((n) => n.id === rt.selected));
        renderGraph();
      }),
    );
  }
  function short(value, maximum) {
    const text = String(value ?? "");
    return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
  }
  function evidenceList(items) {
    return items?.length
      ? items
          .map(
            (e) =>
              `<li><b>${safe(e.kind)}</b> ${safe(e.id)}${e.sha256 ? `<code>${safe(e.sha256)}</code>` : ""}</li>`,
          )
          .join("")
      : "<li>No evidence reference reported.</li>";
  }
  function inspect(node) {
    if (!node) {
      rt.selected = null;
      $("runtime-breadcrumbs").textContent = "Runtime Map";
      return;
    }
    $("runtime-breadcrumbs").innerHTML =
      `<button data-runtime-back>Runtime Map</button> › ${safe(node.type)} › <strong>${safe(node.label)}</strong>`;
    const detail = Object.entries(node.detail || {})
        .map(
          ([k, v]) =>
            `<dt>${safe(k)}</dt><dd>${safe(typeof v === "object" ? JSON.stringify(v, null, 2) : v)}</dd>`,
        )
        .join(""),
      session = node.type === "terminal" ? node.detail.sessionId : null;
    $("runtime-inspector").innerHTML =
      `<header><span class="runtime-node-state state-${safe(node.state)}">${safe(icons[node.type] || "◇")} ${safe(node.state)}</span><h2>${safe(node.label)}</h2><p>${safe(node.subtitle || node.type)}</p></header>${session ? `<button class="button" data-runtime-session="${safe(session)}">${node.state === "RUNNING" ? "Watch live session" : "Open recorded transcript"}</button>` : ""}<dl>${detail}</dl><h3>Authoritative evidence</h3><ul class="runtime-evidence">${evidenceList(node.evidence)}</ul>`;
    $("runtime-breadcrumbs")
      .querySelector("[data-runtime-back]")
      .addEventListener("click", () => {
        rt.selected = null;
        inspect(null);
        renderGraph();
      });
    $("runtime-inspector")
      .querySelector("[data-runtime-session]")
      ?.addEventListener("click", () => {
        const id = session,
          button = document.querySelector(
            `[data-live-shell-open="${CSS.escape(id)}"], [data-live-shell-transcript-open="${CSS.escape(id)}"]`,
          );
        if (button) button.click();
        else
          toast(
            "Execution Session is recorded but not currently projected in Live Shell.",
          );
      });
  }
  function renderControl() {
    $("runtime-control-room").innerHTML = rt.projection.controlRoom.length
      ? rt.projection.controlRoom
          .map(
            (tile) =>
              `<button class="runtime-tile state-${safe(tile.state)}" data-runtime-tile="${safe(tile.id)}"><span>${safe(tile.state)}</span><strong>${safe(tile.job)}</strong><small>${safe(tile.worker)} · ${safe(tile.model)}</small><p>${safe(tile.activity)}</p><pre>${safe(tile.latestSafeOutput || "No safe session output recorded.")}</pre></button>`,
          )
          .join("")
      : '<div class="runtime-map-empty">No jobs belong to this Work Parcel.</div>';
    $("runtime-control-room")
      .querySelectorAll("[data-runtime-tile]")
      .forEach((b) =>
        b.addEventListener("click", () => {
          rt.mode = "map";
          modeButtons();
          rt.selected = b.dataset.runtimeTile;
          render();
        }),
      );
  }
  function modeButtons() {
    document
      .querySelectorAll("[data-runtime-mode]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.runtimeMode === rt.mode),
      );
  }
  function schedule() {
    clearTimeout(rt.timer);
    rt.timer = setTimeout(() => load(), 250);
  }
  function fit() {
    rt.scale = 1;
    rt.panX = 0;
    rt.panY = 0;
    renderGraph();
  }
  function activate() {
    rt.active = true;
    loadParcels()
      .then(load)
      .catch((error) => empty(error.message));
  }
  document.addEventListener("DOMContentLoaded", () => {
    $("runtime-parcel").addEventListener("change", (e) => {
      rt.parcelId = e.target.value;
      rt.selected = null;
      load();
    });
    document.querySelectorAll("[data-runtime-mode]").forEach((b) =>
      b.addEventListener("click", () => {
        rt.mode = b.dataset.runtimeMode;
        modeButtons();
        load();
      }),
    );
    $("runtime-replay").addEventListener("input", schedule);
    $("runtime-fit").addEventListener("click", fit);
    const canvas = $("runtime-map-canvas");
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        rt.scale = Math.max(
          0.35,
          Math.min(1.7, rt.scale + (e.deltaY < 0 ? 0.1 : -0.1)),
        );
        renderGraph();
      },
      { passive: false },
    );
    canvas.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".runtime-graph-node")) return;
      rt.drag = { x: e.clientX, y: e.clientY, px: rt.panX, py: rt.panY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!rt.drag) return;
      rt.panX = rt.drag.px + e.clientX - rt.drag.x;
      rt.panY = rt.drag.py + e.clientY - rt.drag.y;
      renderGraph();
    });
    canvas.addEventListener("pointerup", () => (rt.drag = null));
    document.addEventListener("agent-control:event-received", schedule);
    new MutationObserver(() => {
      if (rt.active) schedule();
    }).observe($("stream-state"), { childList: true, attributes: true });
  });
  window.AgentControlRuntimeMap = { activate, schedule };
})();

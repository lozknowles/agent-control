import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { once } from "node:events";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { AgentControlService } from "../src/control/application-service.js";
import { PoeRuntime } from "../src/control/poe.js";
import { PtyRegistry } from "../src/control/pty.js";
import {
  ImmutableSessionVault,
  SessionVaultRuntime,
} from "../src/control/session-vault.js";
import { startWebDashboard } from "../src/control/web-server.js";
import {
  defaultCapabilities,
  type LaneState,
  type WorkspaceState,
} from "../src/state.js";

const root = path.resolve("qualification/agent-control-session-vault-20260912"),
  vaultRoot = path.join(root, "state", "vault"),
  rawVideoRoot = path.join(root, ".video-raw"),
  videoFile = path.join(root, "agent-control-4.5-session-vault.mp4"),
  screenshotFile = path.join(root, "session-vault-dashboard.png"),
  transcriptFile = path.join(root, "complete-human-readable-transcript.md"),
  manifestFile = path.join(root, "video-evidence.json"),
  token = randomBytes(24).toString("hex"),
  sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex"),
  require = createRequire(import.meta.url);

assert.ok(fs.existsSync(path.join(root, "physical-qualification.json")));
assert.ok(fs.existsSync(vaultRoot), "qualified Session Vault state is missing");
fs.rmSync(rawVideoRoot, { recursive: true, force: true });
fs.rmSync(path.join(root, "poe-video-conversation.json"), { force: true });
fs.mkdirSync(rawVideoRoot, { recursive: true });

const now = new Date().toISOString(),
  lane: LaneState = {
    id: 1,
    name: "Session Continuation",
    status: "waiting",
    model: "codex-0.154.0",
    reasoning: "medium",
    context: "Preserved provider-native evidence",
    lines: ["Physical qualification complete.", "Evidence ready."],
    contract: {
      version: 2,
      laneId: 1,
      goal: "Inspect governed cross-device continuation evidence",
      constraints: ["Provider-native evidence remains authoritative"],
      cwd: process.cwd(),
      priority: 1,
      mode: "manual",
      capabilities: defaultCapabilities(),
      resourceLocks: {},
      modelLock: null,
      sharedTaskIds: [],
      updatedAt: now,
    },
    baton: {
      version: 1,
      laneId: 1,
      revision: 1,
      status: "verified",
      progress: [
        `${report.nodes.source.id} capture`,
        `${report.nodes.destination.id} continuation`,
      ],
      hypothesis: "Immutable native evidence supports safe continuation",
      evidence: ["Session Vault SHA-256", "Work Parcel verification"],
      changes: [],
      nextAction: "Operator review",
      openQuestions: [],
      model: "codex-0.154.0",
      reasoning: "medium",
      updatedAt: now,
    },
    lease: { laneId: 1, holder: null, acquiredAt: null, expiresAt: null },
  },
  state: WorkspaceState = {
    version: 1,
    paused: false,
    lastRestorePoint: null,
    lanes: [lane],
  },
  service = new AgentControlService(
    state,
    new PtyRegistry(),
    undefined,
    "4.5.0-experimental",
    () => {},
  ),
  sessionVault = new SessionVaultRuntime(new ImmutableSessionVault(vaultRoot)),
  poe = new PoeRuntime({
    evidence: {
      overview: () => ({
        title: "Agent Control qualification",
        summary: "Session Vault physical evidence is available.",
        facts: [],
        related: [],
      }),
      resolve: () => ({
        title: "Knowledge unavailable",
        summary: "No current operational object was selected.",
        facts: [],
        related: [],
        unavailable: "No matching current object.",
      }),
    },
    sessionVault,
    file: path.join(root, "poe-video-conversation.json"),
  });
service.configureProjection({ poe });
const webOptions = {
  host: "127.0.0.1",
  port: 0,
  operatorToken: token,
  assetsDir: path.resolve("assets/dashboard"),
  sessionVault,
  allowedOrigins: [] as string[],
};
const server = startWebDashboard(service, webOptions);
await once(server, "listening");
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  { chromium } = require("playwright-core"),
  browserErrors: string[] = [],
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.AGENT_CONTROL_CHROMIUM ??
      "/home/loz/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  }),
  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: rawVideoRoot,
      size: { width: 1920, height: 1080 },
    },
    colorScheme: "dark",
  }),
  page = await context.newPage(),
  video = page.video();
webOptions.allowedOrigins.push(base);
page.on("pageerror", (error: Error) => browserErrors.push(error.message));
page.on("console", (message: any) => {
  if (
    message.type() === "error" &&
    !message.text().includes("503 (Service Unavailable)")
  )
    browserErrors.push(message.text());
});

try {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.click("#operator-button");
  await page.fill("#operator-token", token);
  await page.click('#operator-form button[type="submit"]');
  await page.getByRole("button", { name: "Session Vault" }).click();
  await page.waitForFunction(
    () => document.querySelector("#vault-health")?.textContent === "READY",
  );
  await page.waitForTimeout(2500);
  await page.fill("#vault-search", "why stale route policy changed commit");
  await page.click('#vault-search-form button[type="submit"]');
  await page.waitForSelector(".vault-session");
  await page.waitForTimeout(3500);
  await page.screenshot({ path: screenshotFile, fullPage: true });

  for (const section of [
    "decisions",
    "provenance",
    "continuations",
    "replication",
    "policy",
  ]) {
    await page.click(`[data-vault-view="${section}"]`);
    await page.waitForTimeout(section === "continuations" ? 4500 : 2500);
  }
  const conversationId = await page.evaluate(async (operatorToken) => {
    const response = await fetch("/api/poe/conversations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${operatorToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: "dashboard" }),
    });
    if (!response.ok) throw new Error(`POE conversation ${response.status}`);
    const conversation = await response.json();
    sessionStorage.setItem(
      "agent-control-poe-dashboard-conversation",
      conversation.id,
    );
    return conversation.id;
  }, token);
  assert.match(conversationId, /^poe-conversation:/);
  await page.getByRole("button", { name: "POE", exact: true }).click();
  await page.evaluate(() =>
    document.dispatchEvent(new CustomEvent("poe:open")),
  );
  await page.waitForSelector("#poe-input");
  await page.waitForFunction(
    () => document.querySelectorAll("#poe-turns .poe-turn").length >= 1,
  );
  const request =
    "Find the historical session that changed the stale-route policy, identify the commit, explain why it changed, and show the immutable evidence used for the cross-device continuation.";
  await page.type("#poe-input", request, { delay: 22 });
  await page.click('#poe-form button[type="submit"]');
  await page.waitForFunction(
    () => document.querySelectorAll("#poe-turns .poe-turn").length >= 3,
  );
  assert.match(
    await page.locator("#poe-turns").innerText(),
    /Session Vault history/,
  );
  await page.waitForTimeout(6500);
  await page.getByRole("button", { name: "Session Vault" }).click();
  await page.click('[data-vault-view="continuations"]');
  await page.waitForTimeout(4500);
} finally {
  await context.close();
  const raw = await video!.path();
  await browser.close();
  server.close();
  execFileSync("ffmpeg", [
    "-nostdin",
    "-y",
    "-loglevel",
    "error",
    "-i",
    raw,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    videoFile,
  ]);
  fs.rmSync(rawVideoRoot, { recursive: true, force: true });
}

const poeStore = JSON.parse(
    fs.readFileSync(path.join(root, "poe-video-conversation.json"), "utf8"),
  ),
  recordedConversation = poeStore.conversations.find(
    (conversation: any) => conversation.turns?.length >= 3,
  ),
  physical = JSON.parse(
    fs.readFileSync(path.join(root, "physical-qualification.json"), "utf8"),
  );
assert.ok(recordedConversation);
fs.writeFileSync(
  transcriptFile,
  `# Agent Control 4.5 Session Vault complete human-readable transcript\n\n## Natural POE interaction\n\n${recordedConversation.turns
    .map(
      (turn: any) =>
        `### ${turn.actor === "poe" ? "POE" : "Operator"} — ${turn.at}\n\n${turn.text}\n\nAuthority: ${turn.authority}; channel: ${turn.channel}; evidence: ${
          (turn.evidence ?? [])
            .map((item: any) => item.evidence)
            .flat()
            .join(", ") || "none"
        }.`,
    )
    .join(
      "\n\n",
    )}\n\n## Governed physical lifecycle\n\n- Native session: ${physical.codex.recordId}\n- Native evidence SHA-256: ${physical.codex.nativeSha256}\n- Repository commit: ${physical.codex.commit}\n- Destination node: ${physical.nodes.destination.id}\n- Governed session: ${physical.scenarios.D.governedSessionId}\n- Work Parcel: ${physical.scenarios.D.workParcelId}\n- Work Parcel outcome: ${physical.scenarios.D.parcelStatus}\n- Continuation SHA-256: ${physical.scenarios.D.continuation.sha256}\n- Destination result SHA-256: ${physical.scenarios.D.remoteResult.resultSha256}\n- Split-brain attempt: ${physical.scenarios.E.mutableAttempt}\n- Durable lease events: ${physical.scenarios.E.durableLeaseAudit.map((event: any) => `${event.action}@${event.nodeId}:${event.sha256}`).join(" → ")}\n- Synthetic-secret gate: ${physical.scenarios.F.status}\n- Tamper gate: ${physical.scenarios.G.status}\n- Provider-neutral gate: ${physical.scenarios.H.status}\n- Your Memories record: ${physical.yourMemories.memoryId}\n- Your Memories source evidence: ${physical.yourMemories.sourceEvidenceSha256}\n- Configured MSI Obsidian application: ${physical.yourMemories.obsidianApplicationOnMsi}\n\n## Final verdict\n\n**${physical.verdict}**\n`,
  { mode: 0o600 },
);

const videoBytes = fs.readFileSync(videoFile),
  screenshotBytes = fs.readFileSync(screenshotFile),
  probe = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration,size:stream=codec_name,width,height,r_frame_rate",
        "-of",
        "json",
        videoFile,
      ],
      { encoding: "utf8" },
    ),
  ),
  manifest = {
    schema: "agent-control.session-vault-video-evidence/v1",
    recordedAt: new Date().toISOString(),
    continuousCapture: true,
    editedOrSpliced: false,
    playbackSpeed: 1,
    source: {
      physicalQualification: "physical-qualification.json",
      completeTranscript: path.basename(transcriptFile),
      vaultRoot: "state/vault",
    },
    interaction: {
      initiatedThroughPoe: true,
      operatorRequest:
        "Find the historical session that changed the stale-route policy, identify the commit, explain why it changed, and show the immutable evidence used for the cross-device continuation.",
      views: [
        "Session Explorer",
        "Decision Explorer",
        "Repository Provenance",
        "Continuations",
        "Replication Health",
        "Policy & Retention",
      ],
    },
    video: {
      file: path.basename(videoFile),
      bytes: videoBytes.length,
      sha256: sha(videoBytes),
      media: probe,
    },
    screenshot: {
      file: path.basename(screenshotFile),
      bytes: screenshotBytes.length,
      sha256: sha(screenshotBytes),
    },
    browserErrors,
  };
assert.deepEqual(browserErrors, []);
assert.equal(probe.streams[0].width, 1920);
assert.equal(probe.streams[0].height, 1080);
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, {
  mode: 0o600,
});
const evidenceManifestFile = path.join(root, "evidence-manifest.json"),
  evidenceManifest = fs
    .readdirSync(root)
    .filter(
      (name) =>
        name !== path.basename(evidenceManifestFile) &&
        fs.statSync(path.join(root, name)).isFile(),
    )
    .sort()
    .map((name) => {
      const bytes = fs.readFileSync(path.join(root, name));
      return { path: name, sizeBytes: bytes.length, sha256: sha(bytes) };
    });
fs.writeFileSync(
  evidenceManifestFile,
  `${JSON.stringify(evidenceManifest, null, 2)}\n`,
  { mode: 0o600 },
);
process.stdout.write(
  `${JSON.stringify({ videoFile, screenshotFile, manifestFile, videoSha256: manifest.video.sha256, durationSeconds: Number(probe.format.duration), browserErrors }, null, 2)}\n`,
);

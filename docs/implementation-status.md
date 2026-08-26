# Implementation status

Release boundary: **3.1.0-development**. Registry updated: **2026-08-26**.

This document is generated from `config/implementation-status.json`. Update the registry and run `npm run status:implementation -- --write`; do not edit this projection directly. `IMPLEMENTED` means executable source and focused tests exist. `QUALIFIED` additionally requires recorded real evidence. `PARTIAL`, `PLANNED` and `NOT_IMPLEMENTED` remain explicit gaps.

| Capability | Status | Executable truth | Remaining boundary |
| --- | --- | --- | --- |
| Safe empty-configuration bootstrap (`bootstrap.safe-empty-config`) | **IMPLEMENTED** | An idempotent initializer creates a schema-valid empty configuration without discovering infrastructure or overwriting operator state. | None recorded. |
| Universal authoritative status command (`status.universal-authoritative-command`) | **IMPLEMENTED** | The same agent-control status command reads the versioned AgentControlService projection used by the web dashboard, locally or through one fixed read-only localhost request over SSH. | None recorded. |
| Generic managed Linux nodes (`nodes.generic-linux-management`) | **QUALIFIED** | Authorised Linux/SSH resources receive fixed read-only discovery, heartbeat and workload projection plus typed governed inspection and maintenance Actions without an arbitrary remote-command path. | None recorded. |
| DERP-aware Android secure-overlay discovery (`network.android-secure-overlay-discovery`) | **QUALIFIED** | Structured Tailscale peer discovery and supported non-direct-only ping semantics distinguish offline, DERP relay and direct routes without treating relay as failure. | None recorded. |
| Generic typed Android node adapter (`nodes.android-typed-adapter`) | **PARTIAL** | A generic authenticated executor-only Android contract, dynamic capability registration and typed diagnostic dispatch are implemented and automatically tested. | The observed remote Android peer has not yet installed and enabled the adapter, so no live authenticated typed diagnostic was dispatched. |
| Read-only Android NFC inspection (`android.nfc-read-only-inspection`) | **PARTIAL** | The native adapter and Job runtime implement approval-gated one-shot NFC metadata inspection with visible human wait, cancellation, timeout, raw bytes and normalized identifiers. | No live NFC capability advertisement, WAITING_FOR_CARD state or authorised physical card read has yet been observed. |
| Default adaptive-harness dispatch (`harness.default-work-dispatch`) | **IMPLEMENTED** | Normal WorkExecutor agent work builds and records an ExecutionRecipe and receives only a live policy gateway. | None recorded. |
| Central live ToolPolicy gateway (`tools.central-live-policy`) | **IMPLEMENTED** | Gateway tools are checked against recipe grants, worker compatibility, live lease and ownership generations, approvals and human ownership. | None recorded. |
| Job Catalog, scheduler and Run Ledger (`jobs.catalog-scheduler-ledger`) | **IMPLEMENTED** | Versioned Jobs and Schedules produce durable Runs with capability placement, locks, retries, artifacts, approvals and recovery. | None recorded. |
| Capability-advertising Worker Registry (`workers.capability-registry`) | **IMPLEMENTED** | Workers advertise semantic capabilities and health separately from provider/model routing. | None recorded. |
| Model-backed Job Action bridge (`jobs.model-backed-action`) | **QUALIFIED** | Agent Actions delegate through HarnessDispatcher, return tool requests through ToolPolicy and stop at the verification boundary. | None recorded. |
| OpenAI Responses API execution (`providers.openai-responses`) | **QUALIFIED** | A real Responses API Job returned a policy-gated function call and a verified checksummed artifact. | None recorded. |
| Codex execution with ChatGPT-plan authentication (`providers.openai-codex-chatgpt-plan`) | **QUALIFIED** | A real Codex Job used saved ChatGPT authentication, a read-only process envelope and the central return-data tool gateway. | None recorded. |
| Universal verification-to-acceptance coverage (`verification.universal-adapter-coverage`) | **PARTIAL** | Claim, evidence, verification and acceptance are distinct and model-backed Jobs are gated, but every adapter and task type is not yet universally covered. | Add task-specific verification policies and enforce them across every adapter and Action family. |
| Opaque CLI internal-tool mediation (`executors.opaque-cli-internal-tools`) | **PARTIAL** | CLI processes can be constrained by an approved capability envelope, but their internal tools are not individually authorised by ToolPolicy. | Add authoritative process supervision and immediate termination or suspension when live authority changes. |
| Qualified skill selection (`skills.qualified-selection`) | **IMPLEMENTED** | Only qualified, evidence-carrying skills may satisfy recipe capability requirements and skills cannot expand tool authority. | None recorded. |
| Governed skill proposal and promotion (`skills.governed-lifecycle`) | **PLANNED** | Agents may eventually propose skills, but Agent Control must statically check, sandbox-test, qualify, approve and grant them. | No proposal, security-review, sandbox-qualification or promotion workflow is implemented. |
| Automatic governed recipe learning (`recipes.automatic-learning`) | **PLANNED** | Successive halving exists, but winners are not automatically promoted into a durable governed recipe catalog. | Persist qualification evidence and require policy approval before learned recipes influence routing. |

## Evidence map

### Safe empty-configuration bootstrap

- Source: [`scripts/config.mjs`](../scripts/config.mjs), [`scripts/init-config.mjs`](../scripts/init-config.mjs)
- Tests: [`scripts/init-config.test.mjs`](../scripts/init-config.test.mjs)
- Qualification evidence: [`docs/evidence/truthful-bootstrap-status-20260825.md`](../docs/evidence/truthful-bootstrap-status-20260825.md)

### Universal authoritative status command

- Source: [`scripts/agent-control.mjs`](../scripts/agent-control.mjs), [`scripts/status-client.mjs`](../scripts/status-client.mjs), [`src/control/application-service.ts`](../src/control/application-service.ts)
- Tests: [`scripts/agent-control.test.mjs`](../scripts/agent-control.test.mjs), [`scripts/status-client.test.mjs`](../scripts/status-client.test.mjs), [`src/control/application-service.test.ts`](../src/control/application-service.test.ts), [`src/control/web-server.test.ts`](../src/control/web-server.test.ts)

### Generic managed Linux nodes

- Source: [`src/control/managed-node.ts`](../src/control/managed-node.ts), [`src/control/managed-node-ssh.ts`](../src/control/managed-node-ssh.ts), [`src/control/managed-node-actions.ts`](../src/control/managed-node-actions.ts)
- Tests: [`src/control/managed-node.test.ts`](../src/control/managed-node.test.ts), [`src/control/managed-node-ssh.test.ts`](../src/control/managed-node-ssh.test.ts), [`src/control/managed-node-actions.test.ts`](../src/control/managed-node-actions.test.ts)
- Qualification evidence: [`docs/evidence/macubuntu-managed-node-qualification-20260826.md`](../docs/evidence/macubuntu-managed-node-qualification-20260826.md)

### DERP-aware Android secure-overlay discovery

- Source: [`src/control/secure-overlay.ts`](../src/control/secure-overlay.ts), [`src/integrations/secure-overlay.ts`](../src/integrations/secure-overlay.ts), [`src/control/android-node.ts`](../src/control/android-node.ts)
- Tests: [`src/integrations/secure-overlay.test.ts`](../src/integrations/secure-overlay.test.ts), [`src/control/android-node.test.ts`](../src/control/android-node.test.ts)
- Qualification evidence: [`docs/evidence/android-node-adapter-qualification-20260826.md`](../docs/evidence/android-node-adapter-qualification-20260826.md)

### Generic typed Android node adapter

- Source: [`src/control/android-node.ts`](../src/control/android-node.ts), [`src/control/node-client.ts`](../src/control/node-client.ts), [`android/node-server.mjs`](../android/node-server.mjs), [`android/native-adapter/app/src/main/java/org/agentcontrol/android/adapter/AdapterServer.java`](../android/native-adapter/app/src/main/java/org/agentcontrol/android/adapter/AdapterServer.java)
- Tests: [`src/control/android-node.test.ts`](../src/control/android-node.test.ts), [`src/control/node-client.test.ts`](../src/control/node-client.test.ts), [`scripts/android-node-server.test.mjs`](../scripts/android-node-server.test.mjs), [`scripts/android-native-policy.test.mjs`](../scripts/android-native-policy.test.mjs)
- Qualification evidence: [`docs/evidence/android-node-adapter-qualification-20260826.md`](../docs/evidence/android-node-adapter-qualification-20260826.md)

### Read-only Android NFC inspection

- Source: [`src/control/android-node-actions.ts`](../src/control/android-node-actions.ts), [`config/jobs/android-nfc-inspection.job.yaml`](../config/jobs/android-nfc-inspection.job.yaml), [`android/native-adapter/app/src/main/java/org/agentcontrol/android/adapter/NfcMetadata.java`](../android/native-adapter/app/src/main/java/org/agentcontrol/android/adapter/NfcMetadata.java), [`android/native-adapter/app/src/main/java/org/agentcontrol/android/adapter/MainActivity.java`](../android/native-adapter/app/src/main/java/org/agentcontrol/android/adapter/MainActivity.java)
- Tests: [`src/control/android-node-actions.test.ts`](../src/control/android-node-actions.test.ts), [`src/control/job-runtime.test.ts`](../src/control/job-runtime.test.ts), [`scripts/android-native-policy.test.mjs`](../scripts/android-native-policy.test.mjs), [`android/native-adapter/app/src/test/java/org/agentcontrol/android/adapter/HexCodecTest.java`](../android/native-adapter/app/src/test/java/org/agentcontrol/android/adapter/HexCodecTest.java)
- Qualification evidence: [`docs/evidence/android-node-adapter-qualification-20260826.md`](../docs/evidence/android-node-adapter-qualification-20260826.md)

### Default adaptive-harness dispatch

- Source: [`src/control/adaptive-harness.ts`](../src/control/adaptive-harness.ts), [`src/control/harness-dispatch.ts`](../src/control/harness-dispatch.ts), [`src/control/work-executor.ts`](../src/control/work-executor.ts)
- Tests: [`src/control/harness-dispatch.test.ts`](../src/control/harness-dispatch.test.ts), [`src/control/work-executor.test.ts`](../src/control/work-executor.test.ts)

### Central live ToolPolicy gateway

- Source: [`src/control/adaptive-harness.ts`](../src/control/adaptive-harness.ts), [`src/control/harness-dispatch.ts`](../src/control/harness-dispatch.ts)
- Tests: [`src/control/adaptive-harness.test.ts`](../src/control/adaptive-harness.test.ts), [`src/control/harness-dispatch.test.ts`](../src/control/harness-dispatch.test.ts)

### Job Catalog, scheduler and Run Ledger

- Source: [`src/control/job-catalog.ts`](../src/control/job-catalog.ts), [`src/control/job-runtime.ts`](../src/control/job-runtime.ts)
- Tests: [`src/control/job-catalog.test.ts`](../src/control/job-catalog.test.ts), [`src/control/job-runtime.test.ts`](../src/control/job-runtime.test.ts)

### Capability-advertising Worker Registry

- Source: [`src/control/job-runtime.ts`](../src/control/job-runtime.ts), [`src/control/job-bootstrap.ts`](../src/control/job-bootstrap.ts)
- Tests: [`src/control/job-runtime.test.ts`](../src/control/job-runtime.test.ts)

### Model-backed Job Action bridge

- Source: [`src/control/harness-dispatch.ts`](../src/control/harness-dispatch.ts)
- Tests: [`src/control/harness-job-action.test.ts`](../src/control/harness-job-action.test.ts), [`src/control/responses-provider-job.test.ts`](../src/control/responses-provider-job.test.ts)
- Qualification evidence: [`docs/evidence/windows-openai-harness-qualification-20260824.md`](../docs/evidence/windows-openai-harness-qualification-20260824.md)

### OpenAI Responses API execution

- Source: [`src/control/responses-provider.ts`](../src/control/responses-provider.ts)
- Tests: [`src/control/responses-provider.test.ts`](../src/control/responses-provider.test.ts), [`src/control/responses-provider-job.test.ts`](../src/control/responses-provider-job.test.ts)
- Qualification evidence: [`docs/evidence/windows-openai-responses-live-20260824.json`](../docs/evidence/windows-openai-responses-live-20260824.json)

### Codex execution with ChatGPT-plan authentication

- Source: [`src/control/codex-exec-provider.ts`](../src/control/codex-exec-provider.ts), [`src/control/openai-provider-selector.ts`](../src/control/openai-provider-selector.ts)
- Tests: [`src/control/codex-exec-provider.test.ts`](../src/control/codex-exec-provider.test.ts), [`src/control/openai-provider-selector.test.ts`](../src/control/openai-provider-selector.test.ts)
- Qualification evidence: [`docs/evidence/windows-openai-chatgpt-plan-live-20260824.json`](../docs/evidence/windows-openai-chatgpt-plan-live-20260824.json)

### Universal verification-to-acceptance coverage

- Source: [`src/control/verification.ts`](../src/control/verification.ts), [`src/control/job-runtime.ts`](../src/control/job-runtime.ts)
- Tests: [`src/control/verification.test.ts`](../src/control/verification.test.ts), [`src/control/harness-job-action.test.ts`](../src/control/harness-job-action.test.ts)

### Opaque CLI internal-tool mediation

- Source: [`src/control/codex-exec-provider.ts`](../src/control/codex-exec-provider.ts), [`src/control/execution-provider.ts`](../src/control/execution-provider.ts)
- Tests: [`src/control/codex-exec-provider.test.ts`](../src/control/codex-exec-provider.test.ts), [`src/control/orca-execution-provider.test.ts`](../src/control/orca-execution-provider.test.ts)

### Qualified skill selection

- Source: [`src/control/adaptive-harness.ts`](../src/control/adaptive-harness.ts)
- Tests: [`src/control/adaptive-harness.test.ts`](../src/control/adaptive-harness.test.ts)

### Governed skill proposal and promotion

- Source: not implemented
- Tests: [`src/control/adaptive-harness.test.ts`](../src/control/adaptive-harness.test.ts)

### Automatic governed recipe learning

- Source: [`src/control/experiments.ts`](../src/control/experiments.ts)
- Tests: [`src/control/control.test.ts`](../src/control/control.test.ts)

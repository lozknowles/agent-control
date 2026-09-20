# Agent templates

Agent Control can load portable Agent Control Lab templates and bind one exact template version and digest to an existing registered Job. A template supplies role instructions and declares requirements; it does not grant access, credentials, approvals, budget or target authority.

Set `AGENT_CONTROL_TEMPLATE_DIR` to the Lab `agent-templates` directory before starting Agent Control. Set `AGENT_CONTROL_LAB_DIR` to the Lab repository root to register the allow-listed native adapters for `technical-research`, `review-pull-request`, `hallucination-resistance`, `documentation-consistency` and `compare-models`. Both directories are read at startup. A missing Lab directory leaves those executors unregistered; readiness then returns `BLOCKED` with `native-executor:unregistered` instead of implying that the run can start.

Authenticated API surfaces:

- `GET /api/agent-templates` lists templates.
- `GET /api/agent-templates/:id?version=1.0.0` inspects one template.
- `POST /api/agent-templates/:id/readiness` checks a registered Job, eligible worker capabilities and explicitly supplied scoped permissions.
- `POST /api/agent-templates/:id/use` rechecks readiness and submits a digest-bound stage through the existing Work Parcel and Job Runtime path.

The `use` body includes `version`, template `digest`, native Job reference, exact Lab `jobDigest`, Job parameters, scoped permission receipt, prompt and a 64-character hexadecimal request key. It cannot submit an unregistered Job, an incompatible template, a changed template or Job digest, an unavailable provider adaptation or a stage without an eligible worker. Runtime policy remains authoritative after readiness.

The native run retains the effective Job, Job digest, parameter/input digest, portable instructions, template version and digest, model route, worker selection, attempts, evidence and usage. Optional provider adaptations are loaded only from the template manifest, verified against their own version and digest, appended after the portable instructions, and retained in run provenance. Imported instructions are untrusted content below Agent Control governance.

Only the five paths above are translated, and only after the complete declared Job payload is validated and hashed. Arbitrary imported manifests cannot execute. One shared harness-backed action owns model invocation, timeout/cancellation, budget routing, tool denial, cleanup and candidate evidence; a separate control action checks the hidden acceptance oracle and verifies the model execution contract. Job-specific scenarios and validators remain explicit.

## Executed qualification example

The 20 September 2026 candidate executed 34 matched runs on the existing `qwen2.5-3b-instruct-q4_k_m.gguf` backend: three repetitions per primary case and one repetition per clean-review and agreeing-documentation control, in both plain and template arms. All model calls completed in the final suite, but the independent exact-fact verifier accepted none. The templates therefore are **not shown effective** on this model. Full candidate output, verifier decisions, runtime-safety approvals, identities, tokens, cache tokens, elapsed time and unavailable authoritative cost are retained in Agent Control Lab at `qualifications/native-execution/2026-09-20-qwen25-3b.json`. The earlier all-negative contract-design suite is retained separately rather than overwritten.

Run one matched case against the same already-running local backend:

```sh
npm run qualify:agent-templates -- \
  --lab ../agent-control-jobs \
  --output /tmp/docs-agree-native.json \
  --base-url http://127.0.0.1:8080/v1 \
  --provider-model qwen2.5-3b-instruct-q4_k_m.gguf \
  --case docs-agree \
  --arm both \
  --repetitions 1
```

This command uses an existing authorized backend and does not download, restart or reconfigure it. Omit `--case`, `--arm` and `--repetitions` to reproduce the complete suite. Runtime safety still requires an explicit recorded approval; the qualification runner supplies the operator authority represented by this deliberate command and refuses any unexpected approval type.

The authenticated API supports catalogue inspection, readiness and submission. The command above is the repository qualification CLI. No Agent Templates dashboard selector was implemented or claimed in this candidate.

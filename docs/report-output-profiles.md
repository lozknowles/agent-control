# Report output profiles

One governed run can offer **Simple**, **Detailed** and **Evidence** without another analysis or model call. All are deterministic projections of the retained result. Outputs identifies the source run, generation time, source hash and downloaded-file hash. Human-readable History remains separate.

## Use

In Jobs, select a completed run and open **Outputs**. Simple is the normal default; choose Detailed or Evidence in the report selector and download the actual file. Run Inspector also has an Outputs section. Desktop and mobile use the same controls and system theme.

Markdown and plain text reports require no document renderer. Evidence is an authorised JSON projection, not a ZIP of arbitrary files. HTML/PDF/ZIP rendering is not added. No output selector grants access to a protected file or resurrects deleted evidence.

```bash
npm run report:output -- --run RUN_ID --output-profile simple --directory ./reports
npm run report:output -- --run RUN_ID --output-profile detailed --directory ./reports
npm run report:output -- --run RUN_ID --output-profile evidence --directory ./reports
```

The CLI uses the existing `AGENT_CONTROL_WEB_OPERATOR_TOKEN` from the environment and defaults to the local controller. `--url` or `AGENT_CONTROL_WEB_BASE_URL` can select the authorised HTTPS/loopback controller. Redirects are refused. Files are written with owner-only permissions where supported; existing files are never overwritten. Use `--format text` for a Markdown profile's plain-text alternative. Credentials never belong in arguments or reports.

Authenticated API:

```text
GET /api/observability/runs/RUN_ID/outputs
GET /api/observability/runs/RUN_ID/outputs/simple
GET /api/observability/runs/RUN_ID/outputs/detailed?download=1
GET /api/observability/runs/RUN_ID/outputs/evidence?download=1
```

Without `download=1`, a rendered output returns content plus provenance and filename as JSON. Downloads return the file bytes with a safe attachment filename and no-store headers. Rendering is read-only: it cannot dispatch, retry, or alter work. Unknown profiles/formats are rejected.

## Catalogue declarations

Core YAML Jobs extend the existing `spec`, keeping step artifact declarations authoritative:

```yaml
spec:
  reportArtifact: result
  reportProfiles:
    - {id: simple, label: Simple report, view: simple, format: markdown, default: true}
    - {id: detailed, label: Detailed report, view: detailed, format: markdown}
    - {id: evidence, label: Evidence, view: evidence, format: json}
  # Existing priority, concurrency and steps remain required.
  # Exactly one step output must declare the reportArtifact name.
```

Any action may emit its normal structured result artifact. The report layer reads it through the existing hash-verifying artifact store and the run's declared artifact association. Missing/deleted/corrupt artifacts fail closed. It does not read paths from the manifest. Without a report artifact, core Jobs still offer their retained Inspector/history evidence and explicitly disclose that no structured conclusion exists.

Versioned parameterized definitions extend their existing output model:

```json
{"outputs":{"schema":"repository-review-v1","profiles":[
  {"id":"executive","label":"Executive","view":"simple","format":"markdown","default":true},
  {"id":"technical","label":"Technical","view":"detailed","format":"markdown"},
  {"id":"evidence","label":"Evidence","view":"evidence","format":"json"}
]}}
```

Profile IDs/labels can vary; the deterministic renderer uses `view`. Profiles are frozen in existing run definition snapshots. At most one explicit default is allowed. Omitted declarations retain the three compatible defaults; no migration or historical run rewrite is needed. A parcel in a parameterized job resolves to the same parent run output identity.

Simple reuses recorded conclusions and findings, preserving status, validation and scope limitations. It does not infer difficulty from severity. Structured `requirements` may contain explicit difficulty/reason fields; document-review findings may record `category: difficulty:SIMPLE`, `difficulty:MODERATE`, `difficulty:SIGNIFICANT` or `difficulty:UNASSESSED`. Other jobs are not assigned guessed difficulty. Short projections disclose omitted items; Detailed retains the complete structured result, calls and evidence references. Evidence includes the authorised history projection and its hash. Raw source artefacts remain canonical and unmodified; exported bytes are redacted projections.

## Transcript acceptance case

`transcript-request-review` is a small definition using the existing frozen-repository review executor, structured result schema and source-line validator. It analyses supplied transcript documents and capability references once. It does not transcribe audio, execute spoken requests or create another orchestration graph. Recognition and subsequent analysis are distinct recorded operations.

Preserve original recordings with hashes, raw recognised text, a separate normalised transcript, source/segment timing and recognition provenance. Unknown confidence stays unknown. Use `[unclear]` or `[probable: "..."]` for uncertain terms; never silently replace the raw text. A supplied transcript is acceptable when automatic recognition is unavailable, with its source labelled. Interpretation confidence is not recognition confidence.

The detailed result records each request, literal source evidence, interpretation, existing capability/gap, difficulty, dependencies, risks and proposed next action. The same canonical result supplies the short operator report.

## Release scope

This is a post-v4.7.1 usability enhancement suitable for a 4.7.x patch, subject to its qualification. It reuses existing manifests, result/evidence stores, auth/redaction, Inspector and native downloads; it does not create a new report truth store or document-rendering subsystem. Implementation/PR qualification does not publish or deploy a release.

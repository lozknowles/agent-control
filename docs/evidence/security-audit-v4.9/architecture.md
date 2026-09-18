# Security audit architecture

- Audit: audit-1d773fa5-5046-4f5a-b297-f2decf3a383a
- Revision: 8c68b05d2181da3d6a482354ebfb408f9d8d2f86
- Scope: src, scripts, assets, android
- Provenance: AGENT_CONTROL_NATIVE, STATIC_ONLY, EXECUTION_BLOCKED_BY_SANDBOX
- Sandbox: FAIL
- Execution: blocked; static analysis only

## Trust and execution model

Agent Control owns phase dispatch, records, verification identities, evidence and reporting. Repository files are untrusted evidence and cannot override the audit policy. The target repository remains read-only. Controller API access remains authenticated; Job placement uses the registered security-audit capability; reports derive from validated records.

## Coverage surfaces

- authentication-authorization: partial (18 files; deterministic-source-inventory, bounded-static-pattern-review)
- web-http-protocol: partial (13 files; deterministic-source-inventory, bounded-static-pattern-review)
- agent-llm-tool-boundaries: partial (88 files; deterministic-source-inventory, bounded-static-pattern-review)
- supply-chain-ci-release: partial (17 files; deterministic-source-inventory, bounded-static-pattern-review)
- cloud-container-deployment: partial (53 files; deterministic-source-inventory, bounded-static-pattern-review)
- rpc-messaging-serialization: partial (4 files; deterministic-source-inventory, bounded-static-pattern-review)
- resource-exhaustion-availability: partial (19 files; deterministic-source-inventory, bounded-static-pattern-review)
- data-isolation-cache-restoration: partial (28 files; deterministic-source-inventory, bounded-static-pattern-review)
- desktop-mobile-local-ipc: partial (41 files; deterministic-source-inventory, bounded-static-pattern-review)
- client-browser-security: partial (94 files; deterministic-source-inventory, bounded-static-pattern-review)
- native-binary-execution: partial (49 files; deterministic-source-inventory, bounded-static-pattern-review)
- obvious-security-failures: partial (665 files; deterministic-source-inventory, bounded-static-pattern-review)

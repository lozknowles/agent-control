# Agent templates

Agent Control can load portable Agent Control Lab templates and bind one exact template version and digest to an existing registered Job. A template supplies role instructions and declares requirements; it does not grant access, credentials, approvals, budget or target authority.

Set `AGENT_CONTROL_TEMPLATE_DIR` to the Lab `agent-templates` directory before starting Agent Control. The directory is read at startup. A missing directory leaves the template catalogue empty and does not affect existing Jobs or CLI behaviour.

Authenticated API surfaces:

- `GET /api/agent-templates` lists templates.
- `GET /api/agent-templates/:id?version=1.0.0` inspects one template.
- `POST /api/agent-templates/:id/readiness` checks a registered Job, eligible worker capabilities and explicitly supplied scoped permissions.
- `POST /api/agent-templates/:id/use` rechecks readiness and submits a digest-bound stage through the existing Work Parcel and Job Runtime path.

The `use` body includes `version`, `digest`, native Job reference, Job parameters, scoped permission receipt, prompt and a 64-character hexadecimal request key. It cannot submit an unregistered Job, an incompatible template, a changed digest, an unavailable provider adaptation or a stage without an eligible worker. Runtime policy remains authoritative after readiness.

The native run retains the effective Job, Job digest, parameter/input digest, portable instructions, template version and digest, model route, worker selection, attempts, evidence and usage. Optional provider adaptations are loaded only from the template manifest, verified against their own version and digest, appended after the portable instructions, and retained in run provenance. Imported instructions are untrusted content below Agent Control governance.

Agent Control does not translate Lab Job manifests into native Jobs automatically. Operators must register a native Job/action adapter whose ID and capabilities satisfy the template contract. This preserves the existing execution abstraction and avoids creating a second orchestration engine.

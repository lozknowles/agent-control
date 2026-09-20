# Task-gated tools

`LeanExecutionState` is created per dispatch, behind an explicit optional policy. The model receives only the intersection of recipe tools, current ToolPolicy authorization and current stage. Every actual invocation rechecks live authority and ToolPolicy. Previously exposed schema text does not confer authority.

Inspection permits inspection and safely blocked finish. Mutation requires successful inspection. Verification requires a successful mutation. Successful verification hides mutation/verification in this conservative prototype. A terminal allowance exposes only terminal actions. Hidden/future/unknown/spoofed tools fail closed. Existing handler path controls remain authoritative; lean mode additionally validates JSON input against the exposed schema with no coercion or field removal.

The generic core names no model, provider, OS or runtime. The repository-mutation adapter declares its own tool effects and required changed paths. Other adapters must supply and qualify their own result contracts; success fields must not be guessed.

Policy, lane ownership, generation fences, cancellation and independent verification stay outside model control. Default execution without the experimental policy is unchanged. Lifecycle filtering can remove a legitimate repair option after public tests pass; general workflows and multi-file repairs therefore remain NEEDS_MORE_QUALIFICATION.

Motivation: COMBINATION of PI_FINDING and EXISTING_AC_TECHNIQUE. Disposition: NEEDS_MORE_QUALIFICATION; no native full-suite efficiency result yet.

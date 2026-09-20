# Model-call analysis

Phase 3 recorded 44 Agent Control model calls and 44 tool calls. Recorded operation roles: `{'TOOL_SELECTION': 26, 'VERIFICATION_REASONING': 11, 'LIFECYCLE_BOOKKEEPING': 7}`. These mechanically derived roles are not claims about private model reasoning. We cannot retrospectively label unknown reasoning as redundant or unnecessary.

Pi recorded 22 completed model responses and 24 tool calls. Timeout-interrupted usage was incompletely reported; 1 task passed cleanly, 1 had a passing verifier but a timed-out CLI, and 8 failed. These numbers do not establish a superior runtime. The Phase 3 Pi wrapper also allowed 30 seconds beyond each task deadline; its wall times are not an equal-deadline control.

One deterministic fast path was qualified with harmless native-core fixtures: after normal THIN budget exhaustion, recorded mutation obligations and successful verification, with no unresolved operation failure, a sole terminal action accepting empty input can run without another model response. The action still crosses ToolPolicy, authority checks and the raw registered handler; independent verification remains required. One potential model call was avoided in that controlled test. No physical aggregate call reduction is claimed.

Extra work, planning, mutation, network access and tool choice are not made deterministic. Disposition: NEEDS_MORE_QUALIFICATION. Motivation: EXISTING_AC_TECHNIQUE extended under the recorded Phase 3 terminal finding.

# THIN completion allowance qualification

The default three-turn THIN control remains unchanged. An opt-in dispatcher may grant one additional terminal turn only after its own records establish: exhausted ordinary budget, successful inspection/mutation, all required changed paths, successful non-cancelled verification with exit code zero, no unresolved operation failure, and active live authority.

Failures are tracked by operation plus input. A successful unrelated verifier cannot erase a failed mutation/read. The allowance is single-use; only terminal schemas appear. Extra observations must correspond to the terminal tool actually completed through the gateway. Read, edit, test, shell, network, planning and spoofed finish attempts are denied.

A separate optional deterministic terminal path is permitted only when exactly one exposed terminal action accepts empty input. Its result still does not constitute verifier acceptance.

The native JobRuntime integration test executes read -> mutate -> public verifier -> fourth terminal turn -> independent hidden verification -> identity-checked cleanup, retaining durable journals. It passed. Focused: 117 passed, 0 failed, 0 skipped. Full suite: 1944 passed, 0 failed, 0 skipped.

Native Qwen job `run-44c9e55e-a0bd-4bbe-8b47-f882f8bbb540`: **SUCCEEDED**; workspace cleanup: **confirmed**. Recorded usage: `{'inputTokens': 4189, 'freshInputTokens': 2923, 'cachedInputTokens': 1266, 'outputTokens': 150, 'totalProcessedTokens': 4339}`.

The retained four-call sequence and terminal-only fourth schema were independently checked in `native-qwen/verified-receipt.json`. A separate native THIN control on the immutable released source failed at `structured_chat_loop_turn_limit:3` after read -> replace -> public test. Native Lean completed read -> replace -> public test -> restricted finish -> independent verifier. Both cleaned up successfully. Control: 4,409 input (3,719 cached, 690 fresh), 135 output, 4,544 total, 3 calls. Lean: 4,189 input (1,266 cached, 2,923 fresh), 150 output, 4,339 total, 4 calls. This one pair used an existing warm cache, lean first; fresh input increased. It is not a controlled throughput/cache result or the ten-task A/B. See `native-pair-comparison.json`.

Production default budgets and routing are unchanged. Motivation: COMBINATION. Disposition: ADOPT_CANDIDATE within this bounded repository-mutation THIN contract; broader workflows need qualification.

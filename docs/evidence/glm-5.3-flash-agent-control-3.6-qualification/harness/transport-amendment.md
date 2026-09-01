# Pre-lane transport amendment

The original isolated Codex custom-provider preflight started thread `01a05f04-7114-7430-9cef-090c75ebce54` but produced no model message, tool call, repository read, or write. Its streaming Responses transport disconnected, attempted exactly one reconnect, and failed. The raw JSONL and stderr are retained.

Because no Lane A model output or performance was observed, the comparable-lane limits are unchanged and the benchmark has not started. Before Lane A, both lanes are re-frozen on the repository's non-streaming OpenRouter Responses pattern with typed repository tools:

- exactly 12 provider HTTP attempts per lane, including transport retries;
- at most 6 attempts for assessment/reproduction and 6 for bounded implementation;
- one retry for a retryable transport failure, still counted against 12;
- 16,384 requested output tokens per provider attempt;
- 180-second provider timeout and the existing 2,700-second total lane limit;
- identical read/search/diff/test tools, with write/replace enabled only for implementation;
- no arbitrary shell, network, credential, Git-remote, sibling-worktree or host-home tool;
- the runner validates the response model as `z-ai/glm-5.3-flash` on every response and fails on substitution.

This amendment changes transport framing only. The frozen debt brief, commit, scoring rubric, filesystem scope, test budget, changed-file/line limits, model, provider, parameters, retry limit and no-subagent rule remain unchanged.

The first typed-runner pilot made three exact-model requests and only listed files/diff before requesting lines 1–160 of a shorter tracked file. The runner aborted because it required the caller to know the file length before reading it. No model assessment, write, diff or test resulted. Before the scored lane, read semantics were corrected to clamp a requested end line at EOF and the 300-line tool bound. This model-independent correction, pilot responses and both runner hashes are retained; no prompt, budget, scoring rule or repository content changed.

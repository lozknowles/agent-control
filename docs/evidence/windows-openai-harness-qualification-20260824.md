# Windows OpenAI harness qualification

Date: 2026-08-24 (Europe/London)

Verdict: **SUPPORTED+UNQUALIFIED**

## Source verified

- Official OpenAI documentation defines `POST /v1/responses`, structured JSON output and custom function calls.
- `ResponsesProviderFactory` accepts an HTTPS Responses endpoint or an explicitly configured loopback-only `browser-bridge`, requires qualification evidence, and keeps authentication outside recipe state.
- The provider exposes only generated function names mapped to recipe-granted Agent Control tool IDs. Raw handlers remain in `ToolHandlerRegistry` behind `ToolInvocationGateway` and `ToolPolicy`.
- `HarnessJobAgentAction` returns `verification-pending`; `JobRuntime` separately records declared verification and a typed, checksummed artifact.

## Experimentally verified

- Windows contract tests exercise: authenticated Responses request construction; `store: false`; required single function call; malformed/multiple-call rejection; gateway mediation; loopback-only bridge allowance; remote cleartext rejection; and typed artifact persistence with SHA-256.
- A real Windows-hosted Run followed `Job -> HarnessJobAgentAction -> HarnessDispatcher -> AdaptiveHarness -> ExecutionRecipe` and reached the official OpenAI Responses endpoint.
- The final live attempt used model `gpt-4o-mini`, Run `run-d04c28b7-19d5-48ad-abf1-6c2ad4251f0b`, and received HTTP 429 because the selected OpenAI project had no available quota. No function call, tool invocation or artifact was accepted.
- Final live evidence SHA-256: `7b71ec5393f20a12f09709a597198a6552ae96c3a4ac7ad50ff2b24ab89ce8ec`.
- An earlier pre-dispatch failure was preserved without inventing a cause: `windows-openai-harness-live-20260824-attempt1-pre-dispatch-unclassified.json`, SHA-256 `a9d8e87e52000f4ba0d194ede1412874b56ae97d23bf366b4b3ed2597c68bc32`.
- A second failure exposed and fixed an invalid qualification intent: `windows-openai-harness-live-20260824-attempt2-invalid-intent.json`, SHA-256 `b7fd7b24f664aff4b991c7171fb6731c8cf57e9ce2f005826186d736916fceac`.

## Inferred

- An authorised OpenAI project with quota should be able to complete the already-exercised Responses function-call path. This remains an inference until the live command returns a function call, ToolPolicy permits it, and the resulting artifact verifies.
- A separately implemented loopback bridge speaking the documented Responses-shaped contract can fit the same capability envelope. The bridge itself is not part of Agent Control and has not been qualified.

## Not tested

- ChatGPT desktop-window automation. No documented desktop automation API or approved local bridge was present. No scraping, accessibility harvesting, cookies, session tokens or undocumented endpoints were used.
- Successful live OpenAI model output, live tool invocation and live artifact creation, because provider quota prevented model execution.

## Authority result

The failed live provider call produced no ToolPolicy audit event and no artifact. It did not mutate a lease, ownership generation, scheduler state, PTY, baton or human-takeover fence. The Run failed closed and retained the error as evidence.

## Minimum missing item

Provide the existing authorised OpenAI project with usable API quota, then rerun `npm run qualify:openai-windows` on Windows. Qualification requires the exact verdict `WINDOWS_OPENAI_RETURN_DATA_QUALIFIED`; HTTP reachability or documentation alone is insufficient.

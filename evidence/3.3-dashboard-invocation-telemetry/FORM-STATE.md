# Form-state behaviour

Dashboard parameter drafts are keyed by Job. Only fields that emit `input` or `change` are marked dirty and retained across the five-second dashboard re-render. Untouched controls are recreated from current server/default values. Successful submission and the explicit **Reset parameters** control clear the draft.

The refresh loop remains active, so run, queue, worker, resource and invocation data continue updating while fields are dirty.

Regression: `dirty fields survive repeated refresh while untouched defaults remain server-owned`.

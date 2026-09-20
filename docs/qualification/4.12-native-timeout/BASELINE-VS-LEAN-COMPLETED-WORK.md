# Baseline versus Lean completed work

## Eligibility rule

Efficiency is compared only when the same frozen task reaches a natural terminal state in both lanes with matching outcome semantics. A completed task is not equivalent to a timeout or model/transport failure.

## Result

**MATCHED SUCCESSFUL WORK AVAILABLE: NO**

Baseline SIMPLE passed, while Lean SIMPLE encountered a model-transport failure during a later active request. Medium and complex did not complete successfully in either lane. Consequently:

- Lean total-token benefit on completed work: **UNAVAILABLE**
- Lean fresh-token benefit on completed work: **UNAVAILABLE**
- Lean wall-time benefit on completed work: **UNAVAILABLE**
- Lean efficiency: **NOT PROVEN**

The original aggregate token/cache observations remain valid measurements of partial work, but they cannot establish completed-work efficiency.

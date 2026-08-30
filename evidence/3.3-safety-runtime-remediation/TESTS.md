# Safety and Runtime Remediation Tests

Final implementation/test commit under test: `4c93080a9709ff7c9f1476842617a0616a7a08c6`

| Command | Result |
|---|---|
| Focused SR-1 through SR-4 command | 51/51 passed in 8437.148056 ms |
| Scheduler measurement command | 6/6 passed; independent overlap 119 ms; no-overlap 0 ms |
| `npm run typecheck` | PASS |
| `npm run check:bootstrap` | PASS |
| `npm run check:dashboard` | PASS |
| `npm run check:status` | PASS |
| `npm test` | 442/443 passed in 32479.551042 ms |
| `npm run check` | Expected scoped failure at unchanged infrastructure-neutrality gate |

Focused command:

```text
node --import tsx --test --test-concurrency=1 src/control/job-runtime.test.ts src/control/job-scheduler-concurrency.test.ts src/control/managed-node.test.ts src/control/managed-node-actions.test.ts src/control/android-recovery.test.ts src/control/android-resource.test.ts
```

The only full-suite failure is identical to baseline: `scripts/infrastructure-neutrality.test.mjs` reports the same three private-topology strings in one document and one script. It is a known later parcel and was not weakened or skipped. Raw command logs and statuses are retained under `raw/`.

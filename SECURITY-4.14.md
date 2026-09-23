# Security review of v4.14 RC1

The release candidate remains EXPERIMENTAL. Existing v4.13 PARTIAL coverage and its small AI-reviewed 47-case evaluation remain unchanged in scope.

Every original unresolved scanner candidate has a source-linked review: **92 FALSE_POSITIVE, 4 TRUE_POSITIVE_FIXED, 2 NOT_APPLICABLE**. Four findings identify two renderer mechanisms: crew activity class attributes and cache-state class attributes were not encoded. Red regressions and real browser hostile-input reproductions demonstrate HTML insertion before the fixes and no insertion afterward. Remote reachability/exploitability was not established.

False-positive dispositions trace encoders, fixed class choices, numeric/array-count producers, RegExp.exec parsing, fixed SQLite DDL and a console message that contains no password value. Test-only fixture matches are identified separately. The native audit records were not rewritten: 98 native needs-validation entries map to the manual report. Counting fewer findings is not the clearance method.

The fresh native continuation processed 112 candidates using separate finder/verifier invocation identities and passed **13/13 containment controls**: external network, loopback, environment, credentials, scratch writes, read-only source, descendants, timeout, memory, CPU, process count, symlink traversal and cleanup. All **12/12 source coverage units remain PARTIAL**. Sandbox assurance is bounded to the exercised adapter and controls.

New boundary evidence includes duplicate argument rejection before repair and semantic batch dispatch; permission/scope refusal; before-write numbered-content rejection; digest-only no-progress records; bounded optional executable failures; doctor output checks; authenticated CPU-only installation and controlled cancellation/owned-child kill. The forensic vault remains a synthetic-only experiment. Qualification raw requests use synthetic fixtures; they are private evidence, not a production capture permission.

The final source and curated evidence undergo credential/private-endpoint scans with retained matches/dispositions. Pattern scans cannot guarantee absence of every secret. Do not publish the raw private qualification bundle: it contains internal host/process paths and operational evidence even when no credential material is detected.

RC1 source scan: 1,102 inherited host/path matches, three synthetic credential-shaped fixtures and four synthetic private-IP test occurrences; zero new matches against the v4.13 baseline. No credential material detected by these patterns. Publication metadata review remains BLOCKED; the archive is private review material.

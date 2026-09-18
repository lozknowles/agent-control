# Findings detail

## finding-c1ba645fe9448da5: output-encoding candidate in assets/dashboard/dashboard-adaptive-orchestration.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-adaptive-orchestration.js:9
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-adaptive-orchestration.js:9, source-window-sha256:6756d203a120024b7d37ba342227d35b6895c5461e4089e7ac33f989f1270b35

## finding-46785a807e7916d6: output-encoding candidate in assets/dashboard/dashboard-adaptive-orchestration.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-adaptive-orchestration.js:10
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-adaptive-orchestration.js:10, source-window-sha256:f1f0091a3cf95e9e3d39a694c893bc0f2739f50ee1d70ddc9e12d69fb60b5f0e

## finding-bcaa7c5cdee9567d: output-encoding candidate in assets/dashboard/dashboard-adaptive-orchestration.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-adaptive-orchestration.js:11
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-adaptive-orchestration.js:11, source-window-sha256:996bf4f1ec34bf1d579c6a00cfe66434d5ad18ddfa0ca492ad179f29f9b43ac2

## finding-9d32337a4062d6ba: output-encoding candidate in assets/dashboard/dashboard-adaptive-orchestration.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-adaptive-orchestration.js:13
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-9d32337a4062d6ba
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-adaptive-orchestration.js:13, bounded-candidate:candidate-9d32337a4062d6ba, finder-reasoning:not-transferred, source-line-sha256:47fa529a819c244cbb47d036d52aa11fd44ae8a102a4401d1c942d5282bf9960, source-window-sha256:52ec110b7b9bb0745bc26e20a5a7468ee0b11e2e4385cf6f2f31df689ac3cea3, source-reconstructed:fresh

## finding-f9607f2a14192406: output-encoding candidate in assets/dashboard/dashboard-bots.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-bots.js:202
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-f9607f2a14192406
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-bots.js:202, bounded-candidate:candidate-f9607f2a14192406, finder-reasoning:not-transferred, source-line-sha256:dc3cab9271cabaaf108b254ec56f6fc8badd501b9cc5187a1d59fcf26a1391c2, source-window-sha256:b43761f411b685118f40e40c01007a67011172908424109c2dd42a4875da52db, source-reconstructed:fresh

## finding-a4f675f79de5403f: output-encoding candidate in assets/dashboard/dashboard-bots.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-bots.js:241
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-a4f675f79de5403f
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-bots.js:241, bounded-candidate:candidate-a4f675f79de5403f, finder-reasoning:not-transferred, source-line-sha256:0b409fb51f4a0cbe15d47b583f0d91c8c47b7eeffdd343d7eed9c2faaa92f993, source-window-sha256:45b54d8c52e0c59452b8363b4b7782fc794c6c900714aca623942f8f373e313b, source-reconstructed:fresh

## finding-23f0c1f33b7f7af3: output-encoding candidate in assets/dashboard/dashboard-bots.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-bots.js:245
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-23f0c1f33b7f7af3
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-bots.js:245, bounded-candidate:candidate-23f0c1f33b7f7af3, finder-reasoning:not-transferred, source-line-sha256:e615e57617512bc12c6fde556db9c75ab5722881897736ab9311f14acab420e1, source-window-sha256:28f6200f1d6168d92aa40d312f279910e91f0c8536aafd2eecfd35bb9242cd1e, source-reconstructed:fresh

## finding-a5ef41c2f1ed43d2: output-encoding candidate in assets/dashboard/dashboard-bots.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-bots.js:277
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-a5ef41c2f1ed43d2
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-bots.js:277, bounded-candidate:candidate-a5ef41c2f1ed43d2, finder-reasoning:not-transferred, source-line-sha256:d21cbd8c37113ef06a6576214adc87c2b82ededcb55817d4100a1a5913347130, source-window-sha256:d4c48bc0abe0b5374039fd182856a8837035a6edcd7ae0df9d4acfea9d1c01b8, source-reconstructed:fresh

## finding-c2886c79955422cd: output-encoding candidate in assets/dashboard/dashboard-bots.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-bots.js:281
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-c2886c79955422cd
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-bots.js:281, bounded-candidate:candidate-c2886c79955422cd, finder-reasoning:not-transferred, source-line-sha256:308258c99dd724b3cbae45be52f93f70fc88eb71e21f4f938aeee89792d8bd48, source-window-sha256:bc035c87704d98ad6edb3eb535377a5eec8aa99cee78bdfe7619522adca5fb87, source-reconstructed:fresh

## finding-a6a2a8c0c7c89d0d: output-encoding candidate in assets/dashboard/dashboard-bots.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-bots.js:282
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-a6a2a8c0c7c89d0d
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-bots.js:282, bounded-candidate:candidate-a6a2a8c0c7c89d0d, finder-reasoning:not-transferred, source-line-sha256:3d7009a3b29e9701e5f127ed4bc6ba2cf3037e084d52bdc24350268bb6199055, source-window-sha256:4b0f41b346f554ccd866fff85328e519b97b269a0b29a51847fce06f4eec2e0b, source-reconstructed:fresh

## finding-95b975b798ff0842: output-encoding candidate in assets/dashboard/dashboard-bots.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-bots.js:290
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-bots.js:290, source-window-sha256:f2ed8fc672064dc88e48aea186e5dc62be23f0f46fb7d0614ed12fe7e751acbf

## finding-e06debdf7c17cc22: output-encoding candidate in assets/dashboard/dashboard-bots.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-bots.js:291
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-bots.js:291, source-window-sha256:afd312b51a6295b83fb4fec43374779d5c64ff88f6bb8f628a9f25bca4b4016b

## finding-46c8abbe6dac83d1: output-encoding candidate in assets/dashboard/dashboard-bots.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-bots.js:292
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-bots.js:292, source-window-sha256:4d22cd36665139fd13939157f52e9dfd198019b93b801ee7a3d59c4ae6a1e860

## finding-fe9216ca5702951e: output-encoding candidate in assets/dashboard/dashboard-bots.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-bots.js:293
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-fe9216ca5702951e
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-bots.js:293, bounded-candidate:candidate-fe9216ca5702951e, finder-reasoning:not-transferred, source-line-sha256:c20ea1f0d9d1e6a7f56c6eff9fd0143eb15a2d11e591ed131a191cfd71a586c9, source-window-sha256:503334e887b720af0a456b8fba3dd5258fc3347d6a940277ee6c616b3044d2f0, source-reconstructed:fresh

## finding-9f309b162a3cefb9: output-encoding candidate in assets/dashboard/dashboard-bots.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-bots.js:309
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-bots.js:309, source-window-sha256:91f1756b9dcff1578906e0873ed8cd3bdb84c54d3b4cd1504aa83c2d8d4b4c90

## finding-e89a261f8dbb870f: output-encoding candidate in assets/dashboard/dashboard-cache-experts.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-cache-experts.js:35
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-e89a261f8dbb870f
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-cache-experts.js:35, bounded-candidate:candidate-e89a261f8dbb870f, finder-reasoning:not-transferred, source-line-sha256:276bdf6eced58dadb5147fd58fcb53ee05912b715dcc1f325c9582c8b5f89a32, source-window-sha256:733e98d9d0f722acb2eea34286e8dd669a8dc12e0905ab8101f233c7cce0bb6d, source-reconstructed:fresh

## finding-f3cfa5cd1a658fa1: output-encoding candidate in assets/dashboard/dashboard-cache-experts.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-cache-experts.js:43
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-cache-experts.js:43, source-window-sha256:a627e46fc46daa0d175206042aa34be3b797db1edf76ab8d41b3efee385842ce

## finding-ebba17b983562fcc: output-encoding candidate in assets/dashboard/dashboard-cache-experts.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-cache-experts.js:75
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-ebba17b983562fcc
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-cache-experts.js:75, bounded-candidate:candidate-ebba17b983562fcc, finder-reasoning:not-transferred, source-line-sha256:7693429dcd43ce51812959ce98ababf13821f32a8c5a8c1e125c6d107943c477, source-window-sha256:4f48b0fd0858219ebb8a2f3b4e44f76c2bb937add1d8952d2f76d68a67316b97, source-reconstructed:fresh

## finding-48356114ab631df1: output-encoding candidate in assets/dashboard/dashboard-cache-experts.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-cache-experts.js:79
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-48356114ab631df1
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-cache-experts.js:79, bounded-candidate:candidate-48356114ab631df1, finder-reasoning:not-transferred, source-line-sha256:e9499102f417d9cfc9b408f24db211674cb82ae4702e8157274591a93b195664, source-window-sha256:20a3d93a6393259cbd7e38dbe3f2cc25fc13157aa6e383a7f23b76907c041edb, source-reconstructed:fresh

## finding-90839eef09c59ddd: output-encoding candidate in assets/dashboard/dashboard-cache-experts.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-cache-experts.js:80
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-90839eef09c59ddd
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-cache-experts.js:80, bounded-candidate:candidate-90839eef09c59ddd, finder-reasoning:not-transferred, source-line-sha256:2f7dc34923e7191a035abc89c1e05b834914b6284b2b0fdaf1e19b5a1858fbe0, source-window-sha256:be3681258e7bd0fc8e403f8269b302db9b8aaa0ca366b40d7aadf584912dca67, source-reconstructed:fresh

## finding-e60d932e7c106da7: output-encoding candidate in assets/dashboard/dashboard-cache-experts.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-cache-experts.js:84
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-e60d932e7c106da7
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-cache-experts.js:84, bounded-candidate:candidate-e60d932e7c106da7, finder-reasoning:not-transferred, source-line-sha256:cf040e061ef95e3fe47a305a88d57dd3d094618219deff3d1a9ed00ccffdfc0e, source-window-sha256:5409fc3c2cbb817107dad2a327ca7ad5ec372b626a933515e9a9e94a1b8e7361, source-reconstructed:fresh

## finding-e4d114b4eb494230: output-encoding candidate in assets/dashboard/dashboard-cache-experts.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-cache-experts.js:86
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-e4d114b4eb494230
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-cache-experts.js:86, bounded-candidate:candidate-e4d114b4eb494230, finder-reasoning:not-transferred, source-line-sha256:8c85630b63068eaa917c14770d1b027c5b521899cf20ae0e3c64ede60aba65bd, source-window-sha256:4d68cb6f84756cbcfc0167cf7e4c43f17834594c0acf18c9a0a8430f2838f213, source-reconstructed:fresh

## finding-f29d190ba8c31395: output-encoding candidate in assets/dashboard/dashboard-cache-experts.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-cache-experts.js:91
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-cache-experts.js:91, source-window-sha256:df769e5b6e73a98199d9772be8b404f0edc070c1bcabc5ea6a9f66b8a30806b1

## finding-2bd976c71a844db9: output-encoding candidate in assets/dashboard/dashboard-cache-experts.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-cache-experts.js:96
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-2bd976c71a844db9
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-cache-experts.js:96, bounded-candidate:candidate-2bd976c71a844db9, finder-reasoning:not-transferred, source-line-sha256:77a0ffa3c53acc5c528a9f934eefa4690d3fa45e181559e16ddb60ce371a4db1, source-window-sha256:4c41bb18186d5ba83b409ee09be38734356432d52ac0d670a268097a214fe3a4, source-reconstructed:fresh

## finding-e0cc77aa04061d6f: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:36
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-e0cc77aa04061d6f
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:36, bounded-candidate:candidate-e0cc77aa04061d6f, finder-reasoning:not-transferred, source-line-sha256:afabbb115ed1b44a6fbcffbb20d81456c5e40ad89b91d909d58fa6d2df6a49f0, source-window-sha256:b65e18641ea0a6cfa25f8305bd304dcc5ced9e5c30a31591ace30b47314cab36, source-reconstructed:fresh

## finding-f1a1db620b7eefa0: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:44
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-f1a1db620b7eefa0
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:44, bounded-candidate:candidate-f1a1db620b7eefa0, finder-reasoning:not-transferred, source-line-sha256:a09ee2f18b8d51f6002d377a7f170e55ed024887e144df39e730a7196a511e61, source-window-sha256:75994d93613b51470431f64e1f8c4173fd58494f0bc7f5880114541bfcaf8014, source-reconstructed:fresh

## finding-3ed6e44b3a8e7134: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:46
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-3ed6e44b3a8e7134
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:46, bounded-candidate:candidate-3ed6e44b3a8e7134, finder-reasoning:not-transferred, source-line-sha256:71533e795b77bf97f9cb18844005f3c60a1d966ec7d085e8803ceeda75443fb0, source-window-sha256:99c32a13eb5479d0649432d3d2b45317c9a9e9daadf4b5ee5aaa3690e71a9e0c, source-reconstructed:fresh

## finding-f5490578873c0982: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:56
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-f5490578873c0982
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:56, bounded-candidate:candidate-f5490578873c0982, finder-reasoning:not-transferred, source-line-sha256:4375cb018908b99b4d2997ae76d985bee1c497c5e1e4e21ce2995a9a00accc59, source-window-sha256:2062e79e6cd26c44cc96ed6c75343cd3bf768bd6ca092dc57183a313a5c9b70d, source-reconstructed:fresh

## finding-71f22937ecb20fa5: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:57
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-71f22937ecb20fa5
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:57, bounded-candidate:candidate-71f22937ecb20fa5, finder-reasoning:not-transferred, source-line-sha256:ce5b2ae63d72542b8e2027d1faf0326b2a320b4657488c080948fbedfcd537b6, source-window-sha256:00f238494df6680f3ea396c24b80bee58a7cfa7d63f1e373c0078ecb471c096d, source-reconstructed:fresh

## finding-a68fe21b609af61d: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:159
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:159, source-window-sha256:b076a44fba1f1566d475d421c4fde760438b61b3a437399bece9aa4f9ad2e214

## finding-04f1723297df7bcc: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:174
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:174, source-window-sha256:c8fd25f9e50b9ac1bf95da64136d57170a147a7c1160ba29be3695a6af490904

## finding-bdb08cdac3d80d84: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:217
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-bdb08cdac3d80d84
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:217, bounded-candidate:candidate-bdb08cdac3d80d84, finder-reasoning:not-transferred, source-line-sha256:fdb068ba00a10b92076b692c9b197e6aa8d87fe2f7f0b8976687bd3ecddaf888, source-window-sha256:cd69cf021a9f47f47efc93628985e78adc471ec65f5c6efce50e206d62f33c2c, source-reconstructed:fresh

## finding-7c3dfe742f894157: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:235
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-7c3dfe742f894157
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:235, bounded-candidate:candidate-7c3dfe742f894157, finder-reasoning:not-transferred, source-line-sha256:34531fa7cd5a082ed2860c4788ac2549ff22298b512a62d129ceb0ca165c4d4e, source-window-sha256:efe5163ac3693fcdee342cc2c7ca70951fff66a6bd695007d9ab732b1b93a12a, source-reconstructed:fresh

## finding-aa1a14bb4a7921a5: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:322
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-aa1a14bb4a7921a5
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:322, bounded-candidate:candidate-aa1a14bb4a7921a5, finder-reasoning:not-transferred, source-line-sha256:81ab762ba672d12c1e6489315b18586a86ed2df8ab410f5cec132567ef38986e, source-window-sha256:bc4261e19ee8170491e35e881c0dfe83ed848c0a47957d036cc5ba324ac87b09, source-reconstructed:fresh

## finding-91a02c1916f5ca89: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:330
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:330, source-window-sha256:a18f7f95469644ebd45e216bec3e362dfb852ee295a1c436291cced0541a5066

## finding-e814c5d251b0de32: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:340
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-e814c5d251b0de32
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:340, bounded-candidate:candidate-e814c5d251b0de32, finder-reasoning:not-transferred, source-line-sha256:cc38b52bf2157f5123971878687864fc320c8d4686bcda8505fdfe43b2cfd4dd, source-window-sha256:55d8843177a62cf35417faa8c868b517fc7a37e7e32117b2e90a1d536c983aa6, source-reconstructed:fresh

## finding-3ad472cbcc18df6b: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:345
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-3ad472cbcc18df6b
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:345, bounded-candidate:candidate-3ad472cbcc18df6b, finder-reasoning:not-transferred, source-line-sha256:e95cdcd8d0d9ffdb2eea470a1f6a1f5bd4d0048d0caa2be8908c4e11b9da64a3, source-window-sha256:7c64c03dc9bb279dc9c3787420820ee1f7a331a882cf4728d0171346bbd1a46d, source-reconstructed:fresh

## finding-1b95f201f1ab8352: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:346
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-1b95f201f1ab8352
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:346, bounded-candidate:candidate-1b95f201f1ab8352, finder-reasoning:not-transferred, source-line-sha256:88f6762b80acfcfd97cbf48e63916b905468b09f61cd1cfb5121af483bdabaf1, source-window-sha256:95b5c1461da4a11bf0a3f172fa71021a888788ca0a1b0e3d5e5bcbed457bf42f, source-reconstructed:fresh

## finding-e285a3a1019e7057: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:352
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-e285a3a1019e7057
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:352, bounded-candidate:candidate-e285a3a1019e7057, finder-reasoning:not-transferred, source-line-sha256:e237f60eb3d1c679fc9eab000c465081e8b5ac47e4453b01cac0384e01b4d473, source-window-sha256:a7fec12e825782b853c6ad89d6d95a0db11187e8ad368a63526cf2fed315c4e2, source-reconstructed:fresh

## finding-dfc0475995568063: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:354
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-dfc0475995568063
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:354, bounded-candidate:candidate-dfc0475995568063, finder-reasoning:not-transferred, source-line-sha256:81fc51acd3678bf338c5596269f8950bf5a6322b16b01cc49a81424053f6d21c, source-window-sha256:4c730b55a8d597a85272b61f6e0033cec788e94e916f47f9857a05a6c2b0afdb, source-reconstructed:fresh

## finding-b62edc3940d48bc0: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:401
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-b62edc3940d48bc0
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:401, bounded-candidate:candidate-b62edc3940d48bc0, finder-reasoning:not-transferred, source-line-sha256:652df7a34cc16d77c470a252109b68afcb1bfa589b555c3885750f30acdd57c2, source-window-sha256:39ed4fc6e6cdf87af7d8f993501a82d1e3d5ed665df1ddfb0888cf9a680294fe, source-reconstructed:fresh

## finding-b38a72965d1ba135: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:404
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-b38a72965d1ba135
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:404, bounded-candidate:candidate-b38a72965d1ba135, finder-reasoning:not-transferred, source-line-sha256:72b2eb6153156b1edd6d873405097f1a141cce9742469a655fedca188b51e612, source-window-sha256:68c0b55d96b758ba0ebb2fb8777c0f7855c533ebd19a4d9c479c28185f6680bc, source-reconstructed:fresh

## finding-7eeb581a2736e0dd: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:419
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:419, source-window-sha256:802d563d2aed3793041546537b405bde6f395f0ea4d145fe5416b96b64c96e73

## finding-8f9f6eec7a5760b5: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:423
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-8f9f6eec7a5760b5
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:423, bounded-candidate:candidate-8f9f6eec7a5760b5, finder-reasoning:not-transferred, source-line-sha256:b87dfe027f994ea44592ef210845bea8fd940a3930f2ab74eca02e2624a6145a, source-window-sha256:a2c1f77d8b07b105e6d0ee75966f08ee39e1190eabe23b2e711a150dc0c4d8a0, source-reconstructed:fresh

## finding-e443121389f5de8e: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:478
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:478, source-window-sha256:c91fcbcbcdc78e0afbba8ac9e1a1bde5162072f66e7748a7cdd60d28289ae380

## finding-143b7f970adbd392: output-encoding candidate in assets/dashboard/dashboard-enhancements.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-enhancements.js:479
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-enhancements.js:479, source-window-sha256:6e20cdb4e575e8437ff49163737b52fd7f1136fea26aadf05783092d2aa4a8fe

## finding-223ce6d701cc32ac: output-encoding candidate in assets/dashboard/dashboard-environment-discovery.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-environment-discovery.js:52
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-223ce6d701cc32ac
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-environment-discovery.js:52, bounded-candidate:candidate-223ce6d701cc32ac, finder-reasoning:not-transferred, source-line-sha256:188eac121eb93e5c5c77af1f9f75fc70cc01b9dff91aac9b6d44655535891c73, source-window-sha256:6ec156f6c107c24f6ad72f3b80c678bb2bf503b1b94a6b5c7ae91c3de685f86b, source-reconstructed:fresh

## finding-5f7f4998958008f7: output-encoding candidate in assets/dashboard/dashboard-environment-discovery.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-environment-discovery.js:84
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-5f7f4998958008f7
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-environment-discovery.js:84, bounded-candidate:candidate-5f7f4998958008f7, finder-reasoning:not-transferred, source-line-sha256:7a770053457bb620c8813b8e995c3478fe86efb5d22bb3621a5f5d0babe98391, source-window-sha256:5379e92716785730a5a4c50af3754f0731e5869538b8b7d54494f7747c043695, source-reconstructed:fresh

## finding-2be54c05fae49fe5: output-encoding candidate in assets/dashboard/dashboard-environment-discovery.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-environment-discovery.js:103
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-environment-discovery.js:103, source-window-sha256:4b67f2f757f88d4ca6e869264c6f184ab4a23c67fbc3f8a897805a24f414571f

## finding-39cf3011fca9ed51: output-encoding candidate in assets/dashboard/dashboard-environment-discovery.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-environment-discovery.js:126
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-39cf3011fca9ed51
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-environment-discovery.js:126, bounded-candidate:candidate-39cf3011fca9ed51, finder-reasoning:not-transferred, source-line-sha256:0e1e5689b5eacee9d8ff815e460873ed400b3b6ad7cbbd9d164a81b93ae396b4, source-window-sha256:6173b306f7269a2c7bc5641e0c6c84e686e5984a0f69d22c0be061fbf36e356f, source-reconstructed:fresh

## finding-b7ead8c18372a453: output-encoding candidate in assets/dashboard/dashboard-environment-discovery.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-environment-discovery.js:142
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-b7ead8c18372a453
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-environment-discovery.js:142, bounded-candidate:candidate-b7ead8c18372a453, finder-reasoning:not-transferred, source-line-sha256:abb9791bc7490a64b7f00043da238d83b149ae878f49949a49fbd4b9d2fdb7a7, source-window-sha256:e63fbb4a26c7193662ef3af868f39552e2f5594e5b80fad21c8d65492422a503, source-reconstructed:fresh

## finding-426bd04aae4e0750: output-encoding candidate in assets/dashboard/dashboard-environment-discovery.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-environment-discovery.js:157
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-426bd04aae4e0750
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-environment-discovery.js:157, bounded-candidate:candidate-426bd04aae4e0750, finder-reasoning:not-transferred, source-line-sha256:bafa8887e47b6a40218e565c06d999c3faf0ccf3acea279e3936c9d92ac87355, source-window-sha256:c3bf0b48e0c4e66b3c48f8a8a5763b674b6fabc09c9756bad26ad12872190b1b, source-reconstructed:fresh

## finding-382905d7b91a96e8: output-encoding candidate in assets/dashboard/dashboard-environment-discovery.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-environment-discovery.js:175
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-382905d7b91a96e8
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-environment-discovery.js:175, bounded-candidate:candidate-382905d7b91a96e8, finder-reasoning:not-transferred, source-line-sha256:ee8db7a7cd786f476196dabc0fc718dae13fbb46bb7ef5b046589959ac1d0f53, source-window-sha256:9328ad6be6d0dc83b9b0a1c2352eafcf606f6b48030e31e2e7d508fd4afbd631, source-reconstructed:fresh

## finding-af7c26636571f8c8: output-encoding candidate in assets/dashboard/dashboard-environment-discovery.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-environment-discovery.js:215
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-af7c26636571f8c8
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-environment-discovery.js:215, bounded-candidate:candidate-af7c26636571f8c8, finder-reasoning:not-transferred, source-line-sha256:7e837d7da8d3f5640b14d6affb5f0d443ebd39b4f8124762a46a14c290a0105b, source-window-sha256:398660d14f2adcdc59aca0fea3eb22a6ce26100650856c78f92a494e569fbac5, source-reconstructed:fresh

## finding-1c5b2d4bdf09db29: output-encoding candidate in assets/dashboard/dashboard-environment-discovery.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-environment-discovery.js:240
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-1c5b2d4bdf09db29
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-environment-discovery.js:240, bounded-candidate:candidate-1c5b2d4bdf09db29, finder-reasoning:not-transferred, source-line-sha256:684e9136a018bbe16a8b082e2ac339ac5e4ae2121f25c251c2047de4406bbb4a, source-window-sha256:09a56bff94f7d4eccb66ff547be70bbb57891069ddbac877ccfd2cd05b4d13ed, source-reconstructed:fresh

## finding-21ac5e5bd012f90a: output-encoding candidate in assets/dashboard/dashboard-environment-discovery.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-environment-discovery.js:275
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-21ac5e5bd012f90a
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-environment-discovery.js:275, bounded-candidate:candidate-21ac5e5bd012f90a, finder-reasoning:not-transferred, source-line-sha256:2ebb4416a55aedb75d2f40a61481a4218630c68d3045850739711d415b2a99a0, source-window-sha256:f36114b65bda7b2d44f43d41fb2b5dc70555e228202c50cf99d66752c0dd913c, source-reconstructed:fresh

## finding-906ee48109cc99f8: output-encoding candidate in assets/dashboard/dashboard-installation.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-installation.js:36
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-installation.js:36, source-window-sha256:cae5379d7085eeaf0d2f5e5fd0300d36cd7718db0c83caac20a7182433efd0a2

## finding-1b87d32a73b68a73: output-encoding candidate in assets/dashboard/dashboard-learned-specialists.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-learned-specialists.js:4
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-learned-specialists.js:4, source-window-sha256:b829013f2b9bbad03a10f31fa9903c71bd4c3da654455acdec26cc7afcf3a977

## finding-ce7832d343868d43: output-encoding candidate in assets/dashboard/dashboard-learned-specialists.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-learned-specialists.js:5
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-learned-specialists.js:5, source-window-sha256:4ac506737f45056e0d6eb3f907fa15baadedde2d6ef6e4c33ec5bb5bbbea270e

## finding-cef815c1ab7a1eb5: output-encoding candidate in assets/dashboard/dashboard-live-shell.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-live-shell.js:48
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-live-shell.js:48, source-window-sha256:823ae37df70e7f743188f78982d3450851c39f4fc6ad02cefb465440d7196e59

## finding-8c4548c35ef168b4: output-encoding candidate in assets/dashboard/dashboard-live-shell.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-live-shell.js:49
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-live-shell.js:49, source-window-sha256:53733ca351336c0e4998ec8e2d09a9fc2ea01de5ee20d79fce26848be97b9966

## finding-79ffaed2edb82bd5: output-encoding candidate in assets/dashboard/dashboard-live-shell.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-live-shell.js:54
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-79ffaed2edb82bd5
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-live-shell.js:54, bounded-candidate:candidate-79ffaed2edb82bd5, finder-reasoning:not-transferred, source-line-sha256:3e21617a12f5e41e0b978dea5f71686f13e0341c557b6f19e6f9c583d64c3a51, source-window-sha256:22a8f32dca97942f0cb5bbcf2d420e96d7614bbd85e08ff27105cd08a1772ef1, source-reconstructed:fresh

## finding-db45966e661386bd: output-encoding candidate in assets/dashboard/dashboard-live-shell.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-live-shell.js:98
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-live-shell.js:98, source-window-sha256:fb6554bd092c873bba3c015245969b939a56096b972064bbdf117e6ea539e117

## finding-6425679ed1190d7f: output-encoding candidate in assets/dashboard/dashboard-live-shell.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-live-shell.js:115
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-live-shell.js:115, source-window-sha256:a6586cc841f9755f786ce6b40f8aa18f644804bc6158655b713f13deb1d66179

## finding-d849ca1cbdede498: output-encoding candidate in assets/dashboard/dashboard-models.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-models.js:5
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-models.js:5, source-window-sha256:02c090307a6bc06064e5379a8d24ca6fc9c7be02ff160265c4b253e634792250

## finding-8e5bebc9dbaf7b28: output-encoding candidate in assets/dashboard/dashboard-models.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-models.js:10
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-8e5bebc9dbaf7b28
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-models.js:10, bounded-candidate:candidate-8e5bebc9dbaf7b28, finder-reasoning:not-transferred, source-line-sha256:c193a219d682082f40bb3674ffe107a56b4861f69a4ebbf3438c1a9e379ef6cf, source-window-sha256:0477b38f6a12f927b461b43622978270379af2d4d1fc004972ff0eb1a037b931, source-reconstructed:fresh

## finding-b5937ed911de1052: output-encoding candidate in assets/dashboard/dashboard-models.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-models.js:16
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-b5937ed911de1052
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-models.js:16, bounded-candidate:candidate-b5937ed911de1052, finder-reasoning:not-transferred, source-line-sha256:5a4fa8df2e899906292a3992e6ba10a97530ff815c409c7beb023c54a15e2172, source-window-sha256:49c542b81687c2d4bce5ad20f35be9e151bb61a5c801c5178a96ac2a2c5e90f0, source-reconstructed:fresh

## finding-e13b148d20819083: output-encoding candidate in assets/dashboard/dashboard-models.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-models.js:21
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-e13b148d20819083
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-models.js:21, bounded-candidate:candidate-e13b148d20819083, finder-reasoning:not-transferred, source-line-sha256:579da55dd7627646c17fb1e2c7ffed56d0b83bf35242fb00f356beee3e70135d, source-window-sha256:c70e96c433d7bcd669842fa8983dadbf03d006a8567e206d82f85a6952bc860b, source-reconstructed:fresh

## finding-5556dd56b1b54323: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:12
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:12, source-window-sha256:d033af6619603509ddce864d39c5bd5a7b625645760688ac3a60901d60d92b99

## finding-ebab5ddb291b5c85: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:33
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-ebab5ddb291b5c85
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:33, bounded-candidate:candidate-ebab5ddb291b5c85, finder-reasoning:not-transferred, source-line-sha256:a37bcd486656e4cfadd1f794b4cb0652206985fe06ce7e577ef8fa4052d8cf21, source-window-sha256:fbc9c77884972162f77643b6cce41453c2941433c09894d06ddede7bb4a4d48c, source-reconstructed:fresh

## finding-b19c172e98152e37: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:64
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-b19c172e98152e37
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:64, bounded-candidate:candidate-b19c172e98152e37, finder-reasoning:not-transferred, source-line-sha256:0e21c62db6a8cbafe969f4df8cbebeaa8ad1e713b7f968b6a7480e64070b1df2, source-window-sha256:e931753c6f3b2962fbf91fd34bdd68a50585e641062910abcda3575788ccda38, source-reconstructed:fresh

## finding-aea5928fe016524e: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:81
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:81, source-window-sha256:08dd0eb64bdf014ab3e143923522fb17559c0c5eda7dba1797e6fd1c03eda622

## finding-585bdb520933ac4e: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:91
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-585bdb520933ac4e
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:91, bounded-candidate:candidate-585bdb520933ac4e, finder-reasoning:not-transferred, source-line-sha256:da68275016d0c18b54b9903dc51c6d5d1f7c6b7975f97ca975a3c90f174dffa5, source-window-sha256:a14e091196cd2c1d94939a6246f512372e6bfcd40627abad4a8dd63f32236c09, source-reconstructed:fresh

## finding-298f47ae03a931b0: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:96
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-298f47ae03a931b0
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:96, bounded-candidate:candidate-298f47ae03a931b0, finder-reasoning:not-transferred, source-line-sha256:9ee03bbdf33ba61ece6c5c53d04b79872acd5b79f299204a5d5515baafd68721, source-window-sha256:e4c1cc65a62a5ba8d0c2ddde4ba47ed5c1f219b6835d73b4dd8c4be274d2b8c7, source-reconstructed:fresh

## finding-794291cdde1deaac: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:98
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-794291cdde1deaac
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:98, bounded-candidate:candidate-794291cdde1deaac, finder-reasoning:not-transferred, source-line-sha256:ec4be19401594c3f6277e0f8dcb773f0dbae74e233958433c473d1db5d8e1a61, source-window-sha256:371ddfb4bd2c7497f03fa16fbf6ad752b55dcc470e7acaa3ff05755d3eba4100, source-reconstructed:fresh

## finding-52776f98228060ed: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:99
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-52776f98228060ed
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:99, bounded-candidate:candidate-52776f98228060ed, finder-reasoning:not-transferred, source-line-sha256:5948cff17cd03ba8ab650c722e73c1553ce4f48daa190f7394dc6c03e17f1691, source-window-sha256:50932a2f17a3b44ee5c49cc0ad18f1bf09df646740a334f9817c33584e6b4b7f, source-reconstructed:fresh

## finding-cd6d4fd658ed4c35: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:100
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:100, source-window-sha256:efc502c7724aea96a01c276244898bc262e02c80aa7f65e68589f71624c9315c

## finding-2f336b2a5a0e8abe: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:106
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:106, source-window-sha256:13536fb24fb9b028eb5e92ee09e94a359f0ffa3c6144f6b0417a2c0b64aaf093

## finding-41fd2e6f61fb779d: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:110
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-41fd2e6f61fb779d
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:110, bounded-candidate:candidate-41fd2e6f61fb779d, finder-reasoning:not-transferred, source-line-sha256:f10d1e843094921190cf46d77f338a52056b97882f1326a93e0f8cb07760c72a, source-window-sha256:30db777bb3759bc8439ddde0edf1f287f472bf739143b23fb5775426b7173dfb, source-reconstructed:fresh

## finding-c8c3bc8690b731fd: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:115
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-c8c3bc8690b731fd
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:115, bounded-candidate:candidate-c8c3bc8690b731fd, finder-reasoning:not-transferred, source-line-sha256:95c946c041f79fbb7902269100d2eb11adf42ca5243731ebb6048c28d5b396ab, source-window-sha256:4d9d8a45536b610b8dfbcbd1f923a054e23d4e588dc8046df7d37146b4e4a334, source-reconstructed:fresh

## finding-dab8ec2ab451ea58: output-encoding candidate in assets/dashboard/dashboard-observability.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-observability.js:117
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-dab8ec2ab451ea58
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-observability.js:117, bounded-candidate:candidate-dab8ec2ab451ea58, finder-reasoning:not-transferred, source-line-sha256:faba00e802eff0f8613898c02e63e889f0d3c0ee86632a1d6dee8b368d5be902, source-window-sha256:cb18bc69d6b4a09244a61b6defcaa9740ba523f351bf4daf1e50c89f430256d0, source-reconstructed:fresh

## finding-4f7e8a16be8de8d8: output-encoding candidate in assets/dashboard/dashboard-parameterized-jobs.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-parameterized-jobs.js:10
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-4f7e8a16be8de8d8
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-parameterized-jobs.js:10, bounded-candidate:candidate-4f7e8a16be8de8d8, finder-reasoning:not-transferred, source-line-sha256:37ba274589c88aae6f094344fbe1ac334c100ca54aa22b3f8b99ca3de91191c1, source-window-sha256:35ab0fada80eea1792dc183b0df2d91c8fe353375a572d0d9a5ce22e994ccb77, source-reconstructed:fresh

## finding-f265c7d3839c4b7a: output-encoding candidate in assets/dashboard/dashboard-parameterized-jobs.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-parameterized-jobs.js:42
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-f265c7d3839c4b7a
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-parameterized-jobs.js:42, bounded-candidate:candidate-f265c7d3839c4b7a, finder-reasoning:not-transferred, source-line-sha256:b645d58d308a2d95987f34a1541cfe9b36f67bc3cfd236936974d30507410310, source-window-sha256:1bab45e0c90becd77cefe41e791acf4ef6892bc61f60019db4f9ce6eba0c2a36, source-reconstructed:fresh

## finding-10ba404a7c8bcedd: output-encoding candidate in assets/dashboard/dashboard-parameterized-jobs.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-parameterized-jobs.js:69
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-10ba404a7c8bcedd
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-parameterized-jobs.js:69, bounded-candidate:candidate-10ba404a7c8bcedd, finder-reasoning:not-transferred, source-line-sha256:738be382f9d7981ccadc1c4fd5d203abb48e63c4e6a3f3d0cc12219267a71eba, source-window-sha256:3f2d944029b2d73fdb31e50053c0c1cf70cade5379092bdd5afe063a747aea73, source-reconstructed:fresh

## finding-07876ef88ce784ef: output-encoding candidate in assets/dashboard/dashboard-parameterized-jobs.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-parameterized-jobs.js:77
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-07876ef88ce784ef
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-parameterized-jobs.js:77, bounded-candidate:candidate-07876ef88ce784ef, finder-reasoning:not-transferred, source-line-sha256:e8d4ab608f07fd56e3ba7dcdca0bfec7165fea13de61d412add9e9cd71cc1eac, source-window-sha256:56f640072411770304deda3e027d3bbf0e34334054feb30d4ae9fb2c65f303e6, source-reconstructed:fresh

## finding-8019ccc77dbb5bb7: output-encoding candidate in assets/dashboard/dashboard-parameterized-jobs.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-parameterized-jobs.js:86
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-8019ccc77dbb5bb7
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-parameterized-jobs.js:86, bounded-candidate:candidate-8019ccc77dbb5bb7, finder-reasoning:not-transferred, source-line-sha256:a816efb5cbf3c68bd51756ea2d03f324375d28aaa9d34f3c4401d82c20ad4758, source-window-sha256:7b74b8165e4a5c0444d68c73025bfeb834c89f8683614a950d2bb5bb2aeb8b94, source-reconstructed:fresh

## finding-93b4de9b6b343474: output-encoding candidate in assets/dashboard/dashboard-poe.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-poe.js:53
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-poe.js:53, source-window-sha256:4014f544c7156268c90c4decea2c6b0ed37f71ead989bc6bcedbe66bc36cd706

## finding-a58885ff5c93af4a: output-encoding candidate in assets/dashboard/dashboard-poe.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-poe.js:61
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-poe.js:61, source-window-sha256:1644e37aa66584a7d6f160026c0eac4ae22aee27573bd559d0d27f9bcfa66d4f

## finding-538661ca4f7eb1c5: output-encoding candidate in assets/dashboard/dashboard-poe.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-poe.js:63
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-poe.js:63, source-window-sha256:238ae75cb9783894fbd7d0b5faa4740b416a49eb3445c3ee7647f3983ab7f602

## finding-ba452b716fc28bcf: output-encoding candidate in assets/dashboard/dashboard-poe.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-poe.js:69
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-poe.js:69, source-window-sha256:76dfe9386d47f90d0061a33646bff5de29fac3f5ce9a2b91d8ba77752854f7ac

## finding-bca3209ba86c7d76: output-encoding candidate in assets/dashboard/dashboard-poe.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-poe.js:70
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-poe.js:70, source-window-sha256:d7874655afe09be0fa6dde5375d710551b33cfeaaf51892b0bdd79320ea6494e

## finding-e37f802fc81ce994: output-encoding candidate in assets/dashboard/dashboard-poe.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-poe.js:73
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-poe.js:73, source-window-sha256:b53ad994c2a3eb2ef0e1143c881028486b66ca953e7b03d2d79562837f6b7748

## finding-f547aaf47afb38e3: output-encoding candidate in assets/dashboard/dashboard-poe.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-poe.js:76
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-f547aaf47afb38e3
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-poe.js:76, bounded-candidate:candidate-f547aaf47afb38e3, finder-reasoning:not-transferred, source-line-sha256:e678d18a45eedee0ab14ce127869e267623e6c844d75a6e9dc70d4817ba128ef, source-window-sha256:1d480a71ef5d92df879a41a8fe093ad999e6e8c05f48f7106665d6d4b0fa3384, source-reconstructed:fresh

## finding-7432e546a9c3e4b4: output-encoding candidate in assets/dashboard/dashboard-poe.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-poe.js:173
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-7432e546a9c3e4b4
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-poe.js:173, bounded-candidate:candidate-7432e546a9c3e4b4, finder-reasoning:not-transferred, source-line-sha256:9d8057b8633655bd0a99631a8b275e0841c076b797836f8a9d7bb00e61bc252f, source-window-sha256:7c14225fb3f9ed79941865dc956a3d24880ec03740fc207519023bc8a19fbc4f, source-reconstructed:fresh

## finding-a8ae7633ba33c864: output-encoding candidate in assets/dashboard/dashboard-poe.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-poe.js:174
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-a8ae7633ba33c864
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-poe.js:174, bounded-candidate:candidate-a8ae7633ba33c864, finder-reasoning:not-transferred, source-line-sha256:d546868726594c62ddd14b80db74bb708ad9feffde20b9950ad90fdca4684c1d, source-window-sha256:ef49b85a144d8f0a07779eefae6d43085844d22830b6ac546d806c05ec084061, source-reconstructed:fresh

## finding-aba57a9ae024a7fd: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:93
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-aba57a9ae024a7fd
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:93, bounded-candidate:candidate-aba57a9ae024a7fd, finder-reasoning:not-transferred, source-line-sha256:def6f62c3617a6dcf19441aa6bf22df74cc9f4c69db47a2d1adf8cd877d91e4a, source-window-sha256:ccf2600233e2db2f4541bad567e73759f78eb2d95b9cc65cb958b610216e13b0, source-reconstructed:fresh

## finding-b0f1b1658d054ede: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:110
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-b0f1b1658d054ede
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:110, bounded-candidate:candidate-b0f1b1658d054ede, finder-reasoning:not-transferred, source-line-sha256:a096518e31f9a01793e0edba13aa354ec00045d46c51021a44a097f256d29143, source-window-sha256:215e0f128c1861af6524c92faa5358a26485473b10ba9fae933453b9c91069b9, source-reconstructed:fresh

## finding-4ae5f14558746380: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:111
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-4ae5f14558746380
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:111, bounded-candidate:candidate-4ae5f14558746380, finder-reasoning:not-transferred, source-line-sha256:bcdc921c0b7c68d00dca40f8e4e5aa91936ce3fe0a6d2b5d85bc3816add7d981, source-window-sha256:ff3d22c7b2acfc550d4423975a9a8c57ff0dfb32f2fab8a84944724f1e86b46a, source-reconstructed:fresh

## finding-986931c99b4d6fd0: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:220
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:220, source-window-sha256:cb6daf774d8ea2ea0d21e1de7028213dda8c2b2455cc424b139f1df4bbbf14e3

## finding-17f7e61161275b09: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:292
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-17f7e61161275b09
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:292, bounded-candidate:candidate-17f7e61161275b09, finder-reasoning:not-transferred, source-line-sha256:4fd1d37dc5362e80b6a6dd75ffffdc017fa78de793d77f6381e8fda3dbe84c57, source-window-sha256:d3524ab55196d1b287d07ca7adf172c9a0e73e253ad0409b02474daa16572575, source-reconstructed:fresh

## finding-3478765c9be9eb9a: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:296
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:296, source-window-sha256:2834e1019c5f0bed787302f5ccbf65a413914076aa25eac0733e0c61fed59061

## finding-454d8369b4800380: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:326
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-454d8369b4800380
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:326, bounded-candidate:candidate-454d8369b4800380, finder-reasoning:not-transferred, source-line-sha256:9ad7a8b0237b6bd1c972505385ac9b4d1bed606cd02748160c1f56aa07f888df, source-window-sha256:a9838afc7e353ee8de4fb6c37f380ae97f72dd4a50705edf18ae716ff001c33e, source-reconstructed:fresh

## finding-3737f195afa82468: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:333
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-3737f195afa82468
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:333, bounded-candidate:candidate-3737f195afa82468, finder-reasoning:not-transferred, source-line-sha256:a81c90567f3ba0f19a779634608d79481b8d2161e4b619dcda250f3c5fe7134f, source-window-sha256:7282c8252b98358abd075368606b6d5277d9f9ef22f74ceb7e553260212cc74c, source-reconstructed:fresh

## finding-25370b09a5a5d520: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:342
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-25370b09a5a5d520
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:342, bounded-candidate:candidate-25370b09a5a5d520, finder-reasoning:not-transferred, source-line-sha256:8ee8c01906cfc630cc1ecba2283b1cb84f7147d503ecfcd4ad2bd59e012984a0, source-window-sha256:ae368cfd3318b88cb9b18a2087cd3a8a9b3f496cbcb97ece3a06f748d79f1628, source-reconstructed:fresh

## finding-5757176697f00f70: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:368
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:368, source-window-sha256:96d5f83076a8db7152b8f9065d89286bf44eb1973267917a0324880d0fc33071

## finding-c17d73681c33db4b: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:389
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-c17d73681c33db4b
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:389, bounded-candidate:candidate-c17d73681c33db4b, finder-reasoning:not-transferred, source-line-sha256:b030fddf47d84d9407d17b7a9b0002f5e240a592e3515654e74414b010a35207, source-window-sha256:6cb3d797ad1e991cf0f1544541466157c0f9ffc3aba11849ebc150655b7cad8a, source-reconstructed:fresh

## finding-017de4ef81bd928a: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:423
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-017de4ef81bd928a
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:423, bounded-candidate:candidate-017de4ef81bd928a, finder-reasoning:not-transferred, source-line-sha256:9c01172718eda05f7d4a13d1beafcb7dacfcf2ac7f64a0ecea09737febd6c4b9, source-window-sha256:867550792ad69e21e43ef4e7d45b55e20b7523bc221852e96312adb0cd41f43b, source-reconstructed:fresh

## finding-1271295b54d5e57f: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:485
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-1271295b54d5e57f
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:485, bounded-candidate:candidate-1271295b54d5e57f, finder-reasoning:not-transferred, source-line-sha256:c77bb5b6625b2238f9a95a717352f8230d56e6065f580637729184310b04ebce, source-window-sha256:fa6133c548e5f3a7427a466ab0eebd4940e67fb8d1d1b86950add7e6f7220f50, source-reconstructed:fresh

## finding-e1e5600af704ce6a: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:542
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-e1e5600af704ce6a
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:542, bounded-candidate:candidate-e1e5600af704ce6a, finder-reasoning:not-transferred, source-line-sha256:2afff12ff6a93b3257a873a37765ad2b1009180545fcde41e7e2ffa23e915ee9, source-window-sha256:9e2030abf605dcd36d72d53cb9c62a5aadb1fc4957121694bd39ff0a55d8994a, source-reconstructed:fresh

## finding-128e72ba89e5e679: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:561
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-128e72ba89e5e679
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:561, bounded-candidate:candidate-128e72ba89e5e679, finder-reasoning:not-transferred, source-line-sha256:247fa10d9a22a95ab4ad55ee8415bda3768d1f2adc1a407b5e1448d17bdcefea, source-window-sha256:9b2add19700af1ad5f3895a8d2c9a3b72ae39c0aabff5c5b1b05237755dba65c, source-reconstructed:fresh

## finding-b2ae5354099b2318: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:615
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:615, source-window-sha256:fb99246557dd41fd9b0dd942a41e4ad0d61f948f7db4218172c4734bd49fd0cc

## finding-8950c26d3599ae0a: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:631
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-8950c26d3599ae0a
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:631, bounded-candidate:candidate-8950c26d3599ae0a, finder-reasoning:not-transferred, source-line-sha256:ed4bbc3ad893295627a0e708c8167c7ed8235e31b4ac0753b706e091b02954c4, source-window-sha256:d12284a0a3654c1f2754b0f9cab275586351bd59ba32505735bb738739880f7d, source-reconstructed:fresh

## finding-c8f21ba83b4a8c78: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:634
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:634, source-window-sha256:3e6e265f82e6e756106a5d7fe702ee56d893f03c3eb6060a30d21f2d301ea8af

## finding-3750b2a8e556b4d3: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:790
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-3750b2a8e556b4d3
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:790, bounded-candidate:candidate-3750b2a8e556b4d3, finder-reasoning:not-transferred, source-line-sha256:c46bc0edce6e997359423b315a0997229a49f430963e92c69f9b3688e2cd1578, source-window-sha256:3fae8c4208fc6e883d0ca1aefd40f3d9937968d38b6bf4d19e6616a308d364e5, source-reconstructed:fresh

## finding-aff21693f6582edb: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:800
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-aff21693f6582edb
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:800, bounded-candidate:candidate-aff21693f6582edb, finder-reasoning:not-transferred, source-line-sha256:ed4bbc3ad893295627a0e708c8167c7ed8235e31b4ac0753b706e091b02954c4, source-window-sha256:37ccab10bc528918cc873e82d0c109b9e4365e09dd766556d47b0a2904f46992, source-reconstructed:fresh

## finding-0abe479c4a772b3f: output-encoding candidate in assets/dashboard/dashboard-runtime-map.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-runtime-map.js:810
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-0abe479c4a772b3f
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-runtime-map.js:810, bounded-candidate:candidate-0abe479c4a772b3f, finder-reasoning:not-transferred, source-line-sha256:369604ea98df5ce800cc0fdd99d86a729ee0eeb67b7638f0e4a590910542d6ab, source-window-sha256:a7e411086b1eca0d24a0a7cafde4c5d33e08a0e6475783be490cce36da13a04b, source-reconstructed:fresh

## finding-09a6ad75e7392aaa: output-encoding candidate in assets/dashboard/dashboard-security-audits.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-security-audits.js:5
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-security-audits.js:5, source-window-sha256:24429d72c1729d8be5ed550d70e0a51a5342692f4dc2701c5dbb8524fda947cc

## finding-dac5c0e37371a346: output-encoding candidate in assets/dashboard/dashboard-security-audits.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-security-audits.js:7
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-security-audits.js:7, source-window-sha256:81ba9cddfe022b037578e65b4a2865c0ff32f478b2e503188b52635f19af6e70

## finding-48ebeb7e9308d911: output-encoding candidate in assets/dashboard/dashboard-security-audits.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-security-audits.js:8
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-security-audits.js:8, source-window-sha256:f65bd6565d03e41b86608f2511319f2b547d04315fe960fd15ef7fa19bd153fb

## finding-3f486b09e7a494cd: output-encoding candidate in assets/dashboard/dashboard-session-vault.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-session-vault.js:52
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-session-vault.js:52, source-window-sha256:6b6bf8e4b8b560ef46d31ed914153f1f21f1be12323f8c42f6c24574c0941b72

## finding-86fc6021575387f9: output-encoding candidate in assets/dashboard/dashboard-session-vault.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-session-vault.js:89
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-86fc6021575387f9
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-session-vault.js:89, bounded-candidate:candidate-86fc6021575387f9, finder-reasoning:not-transferred, source-line-sha256:f86382a1442603054e34bcf9bc84608ae36a429184cc1ef87ebe5121c838a605, source-window-sha256:fc3511664582c6e63a5864044493b183e1c1d90688fb961584b613d22ae8788d, source-reconstructed:fresh

## finding-f8d82bd2ac4c0382: output-encoding candidate in assets/dashboard/dashboard-session-vault.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-session-vault.js:134
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-f8d82bd2ac4c0382
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-session-vault.js:134, bounded-candidate:candidate-f8d82bd2ac4c0382, finder-reasoning:not-transferred, source-line-sha256:16dfe7538608b4bdf5234fd844de2c3016ee9524071bd41c9fb8407fab85ada5, source-window-sha256:17cb0bfde32476e29cdc00bb7b18edf560c248c7ef5193b941dd7b05a9e3556b, source-reconstructed:fresh

## finding-e1ce234c3a581832: output-encoding candidate in assets/dashboard/dashboard-session-vault.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-session-vault.js:147
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-e1ce234c3a581832
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-session-vault.js:147, bounded-candidate:candidate-e1ce234c3a581832, finder-reasoning:not-transferred, source-line-sha256:123754f11698e475995eab2397691b7aa0aef9d7a828060ead8d89eaf4bcd33e, source-window-sha256:456109fc488c2d4a6957d52c7a4f368d09575d7a9894a67c1383a2b581e097d9, source-reconstructed:fresh

## finding-c09a7452be8db08f: output-encoding candidate in assets/dashboard/dashboard-session-vault.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-session-vault.js:151
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-c09a7452be8db08f
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-session-vault.js:151, bounded-candidate:candidate-c09a7452be8db08f, finder-reasoning:not-transferred, source-line-sha256:45cd5210348fa22608798190245e96e183273ee3407048a8101fc499eeccf2f4, source-window-sha256:b2069fe0d65c754299bcdd19f3c76187867e148d89a1120190f5dd9b0c98a921, source-reconstructed:fresh

## finding-923ed2315cac6ccd: output-encoding candidate in assets/dashboard/dashboard-session-vault.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-session-vault.js:158
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-923ed2315cac6ccd
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-session-vault.js:158, bounded-candidate:candidate-923ed2315cac6ccd, finder-reasoning:not-transferred, source-line-sha256:ed666cade6ef89655f9bab7b560c62b4a79acb82b11ebb9ca46bcc246c9c595b, source-window-sha256:bb430ae55abfe203b7d95f4671e6fe45c6ef976178129dc408a9d7d48f4df686, source-reconstructed:fresh

## finding-9c2f2e50fd7f89b3: output-encoding candidate in assets/dashboard/dashboard-session-vault.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-session-vault.js:163
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-9c2f2e50fd7f89b3
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-session-vault.js:163, bounded-candidate:candidate-9c2f2e50fd7f89b3, finder-reasoning:not-transferred, source-line-sha256:e6e8b26ddf0bca1afcb576de9baeb3678d7a204778d49879da6fecb9e72d6f15, source-window-sha256:b3f81d5a9b797d00add672ba9521bdb241c7f2a2ba5fd7057444f165bc0bbaba, source-reconstructed:fresh

## finding-715e92e83db4fbd4: output-encoding candidate in assets/dashboard/dashboard-session-vault.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-session-vault.js:167
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-715e92e83db4fbd4
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-session-vault.js:167, bounded-candidate:candidate-715e92e83db4fbd4, finder-reasoning:not-transferred, source-line-sha256:b0c5ade35a019fd1710ac7c43ef3187661ef0efb52f611a4abed427099d4a7c3, source-window-sha256:5d47557458f6bf1f121844d06742f4fa6382a3812efca64c7d8fb158b2f347c0, source-reconstructed:fresh

## finding-2cc0e5fcdbef2345: output-encoding candidate in assets/dashboard/dashboard-sessions.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-sessions.js:23
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-sessions.js:23, source-window-sha256:57ea88e86898da15399e47e13d7faa95642e2bf217f9a7713edbd3907376bd8a

## finding-142e46aa7d1eb486: output-encoding candidate in assets/dashboard/dashboard-sessions.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-sessions.js:39
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-142e46aa7d1eb486
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-sessions.js:39, bounded-candidate:candidate-142e46aa7d1eb486, finder-reasoning:not-transferred, source-line-sha256:9734dc2c1d223723da63bd3864bc29fdeb8662c9bd282f22a433fde24a6034af, source-window-sha256:4686f3e6f1ebe17a6519ad2fa69c454f7031854f47197c547dc3aadf176fb1e7, source-reconstructed:fresh

## finding-31b3ccc08360d04f: output-encoding candidate in assets/dashboard/dashboard-wopr.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-wopr.js:42
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-31b3ccc08360d04f
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-wopr.js:42, bounded-candidate:candidate-31b3ccc08360d04f, finder-reasoning:not-transferred, source-line-sha256:0710e04fdf7e7c28af68899c774abc4a7943100d3491949ad1c3dadc2f12ea1d, source-window-sha256:82ebc4da9023bcf993d74546927782f04173171c9aedf1d638cec11f5fe98c3f, source-reconstructed:fresh

## finding-a855cfca41771ab4: output-encoding candidate in assets/dashboard/dashboard-wopr.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-wopr.js:43
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-a855cfca41771ab4
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-wopr.js:43, bounded-candidate:candidate-a855cfca41771ab4, finder-reasoning:not-transferred, source-line-sha256:8a601510818c54884545a8f0e04d224e8dfafc3b582c70ac3bd732b842c0d509, source-window-sha256:5fd21ab4ff0fa227d21618e10849d62a0abea9b84144f84bc40e44885c1daa87, source-reconstructed:fresh

## finding-d4c10917dbf12b2f: output-encoding candidate in assets/dashboard/dashboard-wopr.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-wopr.js:47
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-d4c10917dbf12b2f
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-wopr.js:47, bounded-candidate:candidate-d4c10917dbf12b2f, finder-reasoning:not-transferred, source-line-sha256:98f1fa4872998d35d0a4022f37ec959c9f5446806bde4e929f59ca3988a65219, source-window-sha256:83b0d51ed61a29afc3657f8ad8bd03723b30cd5d97036eef069cb15eb749699e, source-reconstructed:fresh

## finding-0b3091690afb852b: output-encoding candidate in assets/dashboard/dashboard-wopr.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-wopr.js:57
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-0b3091690afb852b
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-wopr.js:57, bounded-candidate:candidate-0b3091690afb852b, finder-reasoning:not-transferred, source-line-sha256:add27e2c6084bb060fa21c2e68ae00b23be96062f30bba1cf0a3fae050768c45, source-window-sha256:7e8e20908d1e7e67ae41a1bde930fe5e70d8d526f9febecb6b9b27459686552b, source-reconstructed:fresh

## finding-d3f598dd958fe298: output-encoding candidate in assets/dashboard/dashboard-wopr.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-wopr.js:68
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-d3f598dd958fe298
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-wopr.js:68, bounded-candidate:candidate-d3f598dd958fe298, finder-reasoning:not-transferred, source-line-sha256:cd9a59976cafc5b776e4abe9b9b2320fe828264937dcd6be47d82ad808f3026f, source-window-sha256:e03a2d097e76afdaa9bda514198df2037b84ad2d9eda49637425e52385431b73, source-reconstructed:fresh

## finding-e8c91fd2e55fc4be: output-encoding candidate in assets/dashboard/dashboard-wopr.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-wopr.js:69
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-e8c91fd2e55fc4be
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-wopr.js:69, bounded-candidate:candidate-e8c91fd2e55fc4be, finder-reasoning:not-transferred, source-line-sha256:c9109c01edc3fb32f6c4cd017afc645cc18f767be00cdd035cbf4e7e0bb6e506, source-window-sha256:0c6e2e3350fa70674c0f425612b3b0b5d07b3f9d33b1f2711ea2b3dfc095d0d5, source-reconstructed:fresh

## finding-9bdf688a4283b450: output-encoding candidate in assets/dashboard/dashboard-wopr.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-wopr.js:74
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-9bdf688a4283b450
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-wopr.js:74, bounded-candidate:candidate-9bdf688a4283b450, finder-reasoning:not-transferred, source-line-sha256:b09179522ece8496dddf94eba069f52e34422f20352d392d95f98de87e2b38f5, source-window-sha256:a9ad321e49e59d57164c5338b2ac1234d22b5c9823dd419e000ae01a1fcc7070, source-reconstructed:fresh

## finding-8b56211e0d92ceee: output-encoding candidate in assets/dashboard/dashboard-wopr.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-wopr.js:75
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-8b56211e0d92ceee
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-wopr.js:75, bounded-candidate:candidate-8b56211e0d92ceee, finder-reasoning:not-transferred, source-line-sha256:653245212a883938ef1d1ebd984a8f2d6bed1aebf0b8f25cdacd2310570d261d, source-window-sha256:2c9f9fa23e56ea1df49a8d69fe2c228b357cca056c03a5fdd724e5d92aa811d4, source-reconstructed:fresh

## finding-b285b40449a77732: output-encoding candidate in assets/dashboard/dashboard-workspaces.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard-workspaces.js:7
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard-workspaces.js:7, source-window-sha256:b9dfad8275f9ebbb22c444a2aeca8d57133d8459a4955fb3014efc18e0ff21d5

## finding-ab5a2f161fe7f1bd: output-encoding candidate in assets/dashboard/dashboard-workspaces.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-workspaces.js:23
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-ab5a2f161fe7f1bd
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-workspaces.js:23, bounded-candidate:candidate-ab5a2f161fe7f1bd, finder-reasoning:not-transferred, source-line-sha256:85ce25872658623116f11ac5102f245efa7e85285a9186b16e3eab78c39383f0, source-window-sha256:381c2454894a0114b687b09699fff2cd03defcf0332ee64d7868407899d0ccab, source-reconstructed:fresh

## finding-63209eecfc57805b: output-encoding candidate in assets/dashboard/dashboard-workspaces.js

- Verdict: needs_validation
- Category: output-encoding
- Source: assets/dashboard/dashboard-workspaces.js:26
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-63209eecfc57805b
- Independence: FULL
- Evidence: static-match:raw-html, assets/dashboard/dashboard-workspaces.js:26, bounded-candidate:candidate-63209eecfc57805b, finder-reasoning:not-transferred, source-line-sha256:8aba30e92fc661fe3ba379da99d43e1d460275d91e424f4a4f7ba0433f3a0a65, source-window-sha256:d13d0112f05f6774aae96ae8cc0676f3da2d4f301b4cda66b7bc7201046abdb4, source-reconstructed:fresh

## finding-142aff4fe7c77615: output-encoding candidate in assets/dashboard/dashboard.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard.js:17
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard.js:17, source-window-sha256:a5d71f1a0f3bfc966dd369037cf859dd1378f7a52626f04fef69701d55cded8d

## finding-92d53059249350ec: output-encoding candidate in assets/dashboard/dashboard.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard.js:18
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard.js:18, source-window-sha256:71ab7cf070b47438e867d5e29691afa9086bec1cf2909b2f67e7358fd423e242

## finding-e00b3db46c38432d: output-encoding candidate in assets/dashboard/dashboard.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard.js:19
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard.js:19, source-window-sha256:93ae4f5191d1e6921628b98573e7bf1303928f439fc1baa2c237acefd884c64a

## finding-e0a94892762bf69a: output-encoding candidate in assets/dashboard/dashboard.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard.js:20
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard.js:20, source-window-sha256:70acb925525a642079457b39d9100c3dd41841831fbb5bcc7234ae942c877c3f

## finding-9ee945d756389d47: output-encoding candidate in assets/dashboard/dashboard.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard.js:21
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard.js:21, source-window-sha256:a17acf1a63228d44b794483500b036b6ca2ae6564fa80d9bc800a9c851a3537a

## finding-4fe87572a217ed62: output-encoding candidate in assets/dashboard/dashboard.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard.js:39
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard.js:39, source-window-sha256:e9494032c592815d7502d60842e3f2c650faa078ee0aa18801fef47cb9c0b6c5

## finding-a9ca07ee7264d09c: output-encoding candidate in assets/dashboard/dashboard.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/dashboard/dashboard.js:41
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/dashboard/dashboard.js:41, source-window-sha256:88006dce24605608da21846afc02a056124bc78ac473674329afb9d4985fb3fa

## finding-763fc724c1d3391f: output-encoding candidate in assets/session-player/session-player.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/session-player/session-player.js:4
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/session-player/session-player.js:4, source-window-sha256:e73b06c07e61faae5dda9d710aa8fb2cb987ec89ca22f219e52adc6148038a3e

## finding-4dc6dd7bd6cb44bf: output-encoding candidate in assets/session-player/session-player.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/session-player/session-player.js:5
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/session-player/session-player.js:5, source-window-sha256:9db95327b863fb10946ffb139c525c4c6b1ef22b3adeb5a098da5c022987c9d4

## finding-5b92dd65077f7079: output-encoding candidate in assets/session-player/session-player.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/session-player/session-player.js:6
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/session-player/session-player.js:6, source-window-sha256:9d05566e6bd0f903478b3288e5d8d61240f5e24f9efa231df87cd16a2a2c1deb

## finding-702e76ebdef74537: output-encoding candidate in assets/session-player/session-player.js

- Verdict: rejected
- Category: output-encoding
- Source: assets/session-player/session-player.js:10
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, assets/session-player/session-player.js:10, source-window-sha256:ad4a0cba34ae70c87bc2e3bd4e415a2dda788a83458760275ab25152db626d18

## finding-5fc595c1884fac7e: secret-handling candidate in scripts/android-standalone.mjs

- Verdict: rejected
- Category: secret-handling
- Source: scripts/android-standalone.mjs:51
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:credential-log, scripts/android-standalone.mjs:51, source-window-sha256:38743b0f1d7d73045b665d029dc99fb8d000b6e133d44b1d31272542cce467f4

## finding-9cb278a592043444: command-injection candidate in scripts/build-memory-route-qualifications-4.5.ts

- Verdict: needs_validation
- Category: command-injection
- Source: scripts/build-memory-route-qualifications-4.5.ts:36
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-9cb278a592043444
- Independence: FULL
- Evidence: static-match:shell-construction, scripts/build-memory-route-qualifications-4.5.ts:36, bounded-candidate:candidate-9cb278a592043444, finder-reasoning:not-transferred, source-line-sha256:10134f361717222cc5def30deaa643f189cf95ad310feb6eb5232c470224f0b5, source-window-sha256:900e2ec56ce078dc099db0595b01807091e3ae127857ed9c575dd1d0e8ca3340, source-reconstructed:fresh

## finding-5e8b94cd553a2ba3: secret-handling candidate in scripts/provision-android.mjs

- Verdict: needs_validation
- Category: secret-handling
- Source: scripts/provision-android.mjs:32
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-5e8b94cd553a2ba3
- Independence: FULL
- Evidence: static-match:credential-log, scripts/provision-android.mjs:32, bounded-candidate:candidate-5e8b94cd553a2ba3, finder-reasoning:not-transferred, source-line-sha256:49952430acf175165d099495ba09a385c59225f9a7d477f61fd609ed650900c9, source-window-sha256:e5932a24d6a0ded3635410d58092640e52fcaf1359f983a8ffa71e7546f7ab32, source-reconstructed:fresh

## finding-4dabb4263bbc4fb0: filesystem-boundary candidate in scripts/qualify-showcase-intelligence.ts

- Verdict: rejected
- Category: filesystem-boundary
- Source: scripts/qualify-showcase-intelligence.ts:33
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:path-write, scripts/qualify-showcase-intelligence.ts:33, source-window-sha256:2e09c232b2d1971e6f4e71546ffe98123ab21377db3e6cfabf3efe118512c78d

## finding-7bc490c9109809ef: code-execution candidate in scripts/qualify-usage-closure.ts

- Verdict: rejected
- Category: code-execution
- Source: scripts/qualify-usage-closure.ts:64
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:dynamic-code, scripts/qualify-usage-closure.ts:64, source-window-sha256:8a18376fff90bd392092479d48cc1f085084fc7b1a7f2ada753b10b039753b17

## finding-578666b56631717a: code-execution candidate in scripts/qualify-usage-intelligence.ts

- Verdict: rejected
- Category: code-execution
- Source: scripts/qualify-usage-intelligence.ts:48
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:dynamic-code, scripts/qualify-usage-intelligence.ts:48, source-window-sha256:2a8d4dfd0def5a9253b646f14838e8efa8776f2d1e13a2da18ba1c408842bafa

## finding-d2bdbe837caaadec: output-encoding candidate in scripts/record-live-memory-qualification-4.5.mjs

- Verdict: rejected
- Category: output-encoding
- Source: scripts/record-live-memory-qualification-4.5.mjs:33
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, scripts/record-live-memory-qualification-4.5.mjs:33, source-window-sha256:73cacce93185f469d8a2a514b371e91b8361dfa56fd19dd88199f4681bbb358e

## finding-1dd41983fa460e45: secret-handling candidate in src/control/fast-execution.test.ts

- Verdict: rejected
- Category: secret-handling
- Source: src/control/fast-execution.test.ts:111
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-1dd41983fa460e45
- Independence: FULL
- Evidence: static-match:credential-log, src/control/fast-execution.test.ts:111, bounded-candidate:candidate-1dd41983fa460e45, finder-reasoning:not-transferred, source-line-sha256:7f785ac9f011140f4f1c51a63691389cf26d1ee066237bf95875f30c874d9e60, source-window-sha256:4015cdc336d07b32fff609e93d5f139d97dbf51e76a8ee0a608982bd917ec445, source-reconstructed:fresh

## finding-7c0d48456cca2bec: secret-handling candidate in src/control/fast-execution.test.ts

- Verdict: rejected
- Category: secret-handling
- Source: src/control/fast-execution.test.ts:124
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-7c0d48456cca2bec
- Independence: FULL
- Evidence: static-match:credential-log, src/control/fast-execution.test.ts:124, bounded-candidate:candidate-7c0d48456cca2bec, finder-reasoning:not-transferred, source-line-sha256:f9b0777f50cb8af2d9ade941adeb32b32895d0e19ba2d2af4744bd9f281d41c1, source-window-sha256:45ec3e243874d71af683b1c6fdd7f7042aa4c1fbdf96d96c5305b7b129234279, source-reconstructed:fresh

## finding-d8f3e6116d3bccb7: command-injection candidate in src/control/openwa.ts

- Verdict: needs_validation
- Category: command-injection
- Source: src/control/openwa.ts:48
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-d8f3e6116d3bccb7
- Independence: FULL
- Evidence: static-match:shell-construction, src/control/openwa.ts:48, bounded-candidate:candidate-d8f3e6116d3bccb7, finder-reasoning:not-transferred, source-line-sha256:f0434a8554a0a3aafe68dec46e3d0a1728c565806991434064ead35832a72e31, source-window-sha256:1dc9412820c850e7446a642b09422941e4243d50cfd9b6889916cbe3db08662b, source-reconstructed:fresh

## finding-5db3f48e840bd047: output-encoding candidate in src/control/security-audit-job.ts

- Verdict: needs_validation
- Category: output-encoding
- Source: src/control/security-audit-job.ts:21
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-5db3f48e840bd047
- Independence: FULL
- Evidence: static-match:raw-html, src/control/security-audit-job.ts:21, bounded-candidate:candidate-5db3f48e840bd047, finder-reasoning:not-transferred, source-line-sha256:51a5eb83490793c5441099594efc7ded3447ceab6f8fb9a85e15f28ad5e7ff86, source-window-sha256:36b0f927743fb73de7b9abc3c960b11cf1328178ee6ada7074d4d207ef52dff5, source-reconstructed:fresh

## finding-1e675e5fb0c88ba4: code-execution candidate in src/control/security-audit.test.ts

- Verdict: rejected
- Category: code-execution
- Source: src/control/security-audit.test.ts:11
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-1e675e5fb0c88ba4
- Independence: FULL
- Evidence: static-match:dynamic-code, src/control/security-audit.test.ts:11, bounded-candidate:candidate-1e675e5fb0c88ba4, finder-reasoning:not-transferred, source-line-sha256:d532f05ada9f21ffa9cbf3d114717d3b8dddd345c60f419408f631a0e733609d, source-window-sha256:c2675b7c717fe7696c13a8e7ecf05d610c5d6abb670aab4527f225c925b1bbe5, source-reconstructed:fresh

## finding-7ff9843ac668c30e: code-execution candidate in src/control/security-audit.test.ts

- Verdict: rejected
- Category: code-execution
- Source: src/control/security-audit.test.ts:36
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:dynamic-code, src/control/security-audit.test.ts:36, source-window-sha256:404c4e5d3aba3add6a615132206d4a83c0c8547c6bff5c93fdef7ad6c57ff1a5

## finding-4859919b33b56746: output-encoding candidate in src/control/security-audit.test.ts

- Verdict: rejected
- Category: output-encoding
- Source: src/control/security-audit.test.ts:36
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:candidate-validation:1
- Independence: CONTEXT_INDEPENDENT
- Evidence: static-match:raw-html, src/control/security-audit.test.ts:36, source-window-sha256:404c4e5d3aba3add6a615132206d4a83c0c8547c6bff5c93fdef7ad6c57ff1a5

## finding-d0bcb09b17c5167c: command-injection candidate in src/control/social-voice.ts

- Verdict: needs_validation
- Category: command-injection
- Source: src/control/social-voice.ts:43
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-d0bcb09b17c5167c
- Independence: FULL
- Evidence: static-match:shell-construction, src/control/social-voice.ts:43, bounded-candidate:candidate-d0bcb09b17c5167c, finder-reasoning:not-transferred, source-line-sha256:f0434a8554a0a3aafe68dec46e3d0a1728c565806991434064ead35832a72e31, source-window-sha256:23a51c6b455171d9c4bc1ea6ce308d3176dbbdaa771335857224ca565b34bcb9, source-reconstructed:fresh

## finding-378f27ea0a0078be: code-execution candidate in src/control/structured-chat-loop-provider.test.ts

- Verdict: rejected
- Category: code-execution
- Source: src/control/structured-chat-loop-provider.test.ts:104
- Trust boundary: Untrusted input to privileged Agent Control process
- Preconditions: Relevant code path is reachable with attacker-influenced input.
- Reproduction: not applicable
- Finder: agent-control:security-auditor / run-59d69855-06b7-4c3e-8940-5997021ffed0:coverage-hunting:1
- Verifier: agent-control:security-verifier / run-54e2b0cf-a6e2-4564-9f1c-9af72eca3e71:independent-validation:1:candidate-378f27ea0a0078be
- Independence: FULL
- Evidence: static-match:dynamic-code, src/control/structured-chat-loop-provider.test.ts:104, bounded-candidate:candidate-378f27ea0a0078be, finder-reasoning:not-transferred, source-line-sha256:f2ac1821c8b6f42284f51729dec8b87c79d7dc163771cd6bdd25c1561566bbe3, source-window-sha256:570b76b22e36607b2de49acb1348e64b5bebc8facd656546683774e62232ca99, source-reconstructed:fresh

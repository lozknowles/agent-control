# Ten-task native timelines

Source: `/fast/qualification/agent-control-v4.12-native-20260920/ab`

| Lane | Task | Profile | Budget | Calls done | Pending at deadline | Last progress before deadline | Observed boundary | Classification |
|---|---|---:|---:|---:|---|---:|---:|---|
| baseline | MUT-001 | STANDARD | 120s | 1 | yes | 29.428s | 120.002s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| baseline | MUT-002 | STANDARD | 120s | 1 | yes | 26.567s | 120.001s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| baseline | MUT-003 | STANDARD | 150s | 1 | yes | 52.039s | 149.999s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| baseline | MUT-004 | STANDARD | 120s | 1 | yes | 25.687s | 120.002s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| baseline | MUT-005 | STANDARD | 180s | 2 | yes | 14.236s | 179.998s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| baseline | MUT-007 | STANDARD | 180s | 1 | yes | 80.504s | 180.001s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| baseline | MUT-009 | DEEP | 240s | 2 | yes | 89.773s | 239.997s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| baseline | MUT-010 | DEEP | 240s | 3 | yes | 7.420s | 239.998s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| baseline | MUT-011 | DEEP | 240s | 1 | yes | 143.370s | 240.000s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| baseline | MUT-012 | DEEP | 300s | 2 | yes | 112.043s | 299.998s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| lean | MUT-001 | STANDARD | 120s | 1 | yes | 38.759s | 119.991s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| lean | MUT-002 | STANDARD | 120s | 1 | yes | 27.147s | 119.990s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| lean | MUT-003 | STANDARD | 150s | 1 | yes | 8.527s | 149.994s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| lean | MUT-004 | STANDARD | 120s | 1 | yes | 21.635s | 119.993s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| lean | MUT-005 | STANDARD | 180s | 2 | yes | 0.504s | 179.992s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| lean | MUT-007 | STANDARD | 180s | 1 | yes | 88.077s | 179.992s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| lean | MUT-009 | DEEP | 240s | 1 | yes | 135.565s | 239.990s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| lean | MUT-010 | DEEP | 240s | 2 | yes | 31.196s | 239.991s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| lean | MUT-011 | DEEP | 240s | 1 | yes | 148.189s | 239.993s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |
| lean | MUT-012 | DEEP | 300s | 2 | yes | 102.976s | 299.989s | BLOCKED_MODEL_IN_FLIGHT_ACTIVITY_UNOBSERVABLE |

## Event timelines

### baseline / MUT-001

Configured absolute wall deadline: 120s. Observed provider failure: 120.002s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.052s | runtime-health | 200 |
| -0.039s | model-discovery | 200 |
| -0.032s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 90.514s | provider-response | 200 |
| 90.544s | tool-policy-audit | mutation.repository.read |
| 90.552s | tool-request |  |
| 90.574s | tool-result |  |
| 90.586s | provider-request |  |
| 120.002s | provider-failure | The operation was aborted due to timeout |
| 120.035s | attempt-before-cleanup | structured_chat_loop_timeout |
| 120.042s | attempt-process-cleanup | execution-failed |
| 120.056s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-71caa4ba-51a0-45ce-85da-535dcd8bc36c |
| 0.013s | ADMITTED | native-benchmark-worker |
| 0.220s | PROFILE_RESOLVED | STANDARD |
| 0.220s | MODEL_CALL_START | turn=1 |
| 90.755s | MODEL_CALL_END | turn=1 prompt_ms=16845.385 generation_ms=73256.538 input=2197 cached=393 output=32 tool=mutation.repository.read |
| 90.777s | TOOL_START | mutation.repository.read |
| 90.799s | TOOL_END | mutation.repository.read duration_ms=22 result=tool-result |
| 120.227s | TIMEOUT | The operation was aborted due to timeout |
| 120.281s | CLEANUP | confirmed |
| 120.301s | COMPLETION | structured_chat_loop_timeout |
| 120.302s | VERIFICATION_END | upstream_failed |

### baseline / MUT-002

Configured absolute wall deadline: 120s. Observed provider failure: 120.001s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.066s | runtime-health | 200 |
| -0.049s | model-discovery | 200 |
| -0.039s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 93.398s | provider-response | 200 |
| 93.418s | tool-policy-audit | mutation.repository.read |
| 93.423s | tool-request |  |
| 93.434s | tool-result |  |
| 93.440s | provider-request |  |
| 120.001s | provider-failure | The operation was aborted due to timeout |
| 120.036s | attempt-before-cleanup | structured_chat_loop_timeout |
| 120.047s | attempt-process-cleanup | execution-failed |
| 120.061s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-f1ad743c-7b85-451a-9988-32dada6fa01c |
| 0.014s | ADMITTED | native-benchmark-worker |
| 0.257s | PROFILE_RESOLVED | STANDARD |
| 0.257s | MODEL_CALL_START | turn=1 |
| 93.673s | MODEL_CALL_END | turn=1 prompt_ms=18618.779 generation_ms=73513.282 input=2220 cached=544 output=34 tool=mutation.repository.read |
| 93.686s | TOOL_START | mutation.repository.read |
| 93.697s | TOOL_END | mutation.repository.read duration_ms=11 result=tool-result |
| 120.264s | TIMEOUT | The operation was aborted due to timeout |
| 120.324s | CLEANUP | confirmed |
| 120.350s | VERIFICATION_END | upstream_failed |
| 120.350s | COMPLETION | structured_chat_loop_timeout |

### baseline / MUT-003

Configured absolute wall deadline: 150s. Observed provider failure: 149.999s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.063s | runtime-health | 200 |
| -0.040s | model-discovery | 200 |
| -0.032s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 97.928s | provider-response | 200 |
| 97.948s | tool-policy-audit | mutation.repository.read |
| 97.954s | tool-request |  |
| 97.960s | tool-failure | mutation_workspace_path_missing |
| 97.967s | provider-request |  |
| 149.999s | provider-failure | The operation was aborted due to timeout |
| 150.025s | attempt-before-cleanup | structured_chat_loop_timeout |
| 150.032s | attempt-process-cleanup | execution-failed |
| 150.043s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-efce5deb-530a-4caa-a094-d9bf8eb646ef |
| 0.012s | ADMITTED | native-benchmark-worker |
| 0.236s | PROFILE_RESOLVED | STANDARD |
| 0.236s | MODEL_CALL_START | turn=1 |
| 98.182s | MODEL_CALL_END | turn=1 prompt_ms=16570.76 generation_ms=79596.06 input=2150 cached=544 output=37 tool=mutation.repository.read |
| 98.196s | TOOL_START | mutation.repository.read |
| 98.202s | TOOL_END | mutation.repository.read duration_ms=6 result=tool-failure |
| 150.241s | TIMEOUT | The operation was aborted due to timeout |
| 150.285s | CLEANUP | confirmed |
| 150.302s | COMPLETION | structured_chat_loop_timeout |
| 150.303s | VERIFICATION_END | upstream_failed |

### baseline / MUT-004

Configured absolute wall deadline: 120s. Observed provider failure: 120.002s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.055s | runtime-health | 200 |
| -0.038s | model-discovery | 200 |
| -0.028s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 94.274s | provider-response | 200 |
| 94.297s | tool-policy-audit | mutation.repository.read |
| 94.302s | tool-request |  |
| 94.315s | tool-result |  |
| 94.323s | provider-request |  |
| 120.002s | provider-failure | The operation was aborted due to timeout |
| 120.024s | attempt-before-cleanup | structured_chat_loop_timeout |
| 120.039s | attempt-process-cleanup | execution-failed |
| 120.053s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-124af48a-f2e0-495b-b5e2-762d00a44a57 |
| 0.014s | ADMITTED | native-benchmark-worker |
| 0.221s | PROFILE_RESOLVED | STANDARD |
| 0.221s | MODEL_CALL_START | turn=1 |
| 94.512s | MODEL_CALL_END | turn=1 prompt_ms=16954.514 generation_ms=76385.627 input=2342 cached=544 output=34 tool=mutation.repository.read |
| 94.527s | TOOL_START | mutation.repository.read |
| 94.540s | TOOL_END | mutation.repository.read duration_ms=13 result=tool-result |
| 120.227s | TIMEOUT | The operation was aborted due to timeout |
| 120.278s | CLEANUP | confirmed |
| 120.295s | COMPLETION | structured_chat_loop_timeout |
| 120.296s | VERIFICATION_END | upstream_failed |

### baseline / MUT-005

Configured absolute wall deadline: 180s. Observed provider failure: 179.998s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.038s | runtime-health | 200 |
| -0.026s | model-discovery | 200 |
| -0.022s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 88.178s | provider-response | 200 |
| 88.208s | tool-policy-audit | mutation.repository.read |
| 88.215s | tool-request |  |
| 88.233s | tool-result |  |
| 88.242s | provider-request |  |
| 165.723s | provider-response | 200 |
| 165.741s | tool-policy-audit | mutation.repository.read |
| 165.748s | tool-request |  |
| 165.762s | tool-result |  |
| 165.770s | provider-request |  |
| 179.998s | provider-failure | The operation was aborted due to timeout |
| 180.022s | attempt-before-cleanup | structured_chat_loop_timeout |
| 180.029s | attempt-process-cleanup | execution-failed |
| 180.046s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-4d11805a-4c58-4c6c-bd3c-125c9072aa84 |
| 0.012s | ADMITTED | native-benchmark-worker |
| 0.168s | PROFILE_RESOLVED | STANDARD |
| 0.168s | MODEL_CALL_START | turn=1 |
| 88.367s | MODEL_CALL_END | turn=1 prompt_ms=17716.601 generation_ms=70074.73 input=2460 cached=544 output=32 tool=mutation.repository.read |
| 88.389s | TOOL_START | mutation.repository.read |
| 88.407s | TOOL_END | mutation.repository.read duration_ms=18 result=tool-result |
| 88.415s | MODEL_CALL_START | turn=2 |
| 165.913s | MODEL_CALL_END | turn=2 prompt_ms=3995.681 generation_ms=73449.917 input=2710 cached=2491 output=34 tool=mutation.repository.read |
| 165.922s | TOOL_START | mutation.repository.read |
| 165.936s | TOOL_END | mutation.repository.read duration_ms=14 result=tool-result |
| 180.172s | TIMEOUT | The operation was aborted due to timeout |
| 180.220s | CLEANUP | confirmed |
| 180.240s | COMPLETION | structured_chat_loop_timeout |
| 180.241s | VERIFICATION_END | upstream_failed |

### baseline / MUT-007

Configured absolute wall deadline: 180s. Observed provider failure: 180.001s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.056s | runtime-health | 200 |
| -0.042s | model-discovery | 200 |
| -0.035s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 99.458s | provider-response | 200 |
| 99.478s | tool-policy-audit | mutation.repository.read |
| 99.483s | tool-request |  |
| 99.497s | tool-result |  |
| 99.503s | provider-request |  |
| 180.001s | provider-failure | The operation was aborted due to timeout |
| 180.026s | attempt-before-cleanup | structured_chat_loop_timeout |
| 180.035s | attempt-process-cleanup | execution-failed |
| 180.053s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-798c903b-5b4f-4048-8e2e-c0aa7cc4a09e |
| 0.013s | ADMITTED | native-benchmark-worker |
| 0.215s | PROFILE_RESOLVED | STANDARD |
| 0.215s | MODEL_CALL_START | turn=1 |
| 99.690s | MODEL_CALL_END | turn=1 prompt_ms=17591.098 generation_ms=79743.923 input=2201 cached=544 output=33 tool=mutation.repository.read |
| 99.703s | TOOL_START | mutation.repository.read |
| 99.717s | TOOL_END | mutation.repository.read duration_ms=14 result=tool-result |
| 180.221s | TIMEOUT | The operation was aborted due to timeout |
| 180.273s | CLEANUP | confirmed |
| 180.291s | COMPLETION | structured_chat_loop_timeout |
| 180.292s | VERIFICATION_END | upstream_failed |

### baseline / MUT-009

Configured absolute wall deadline: 240s. Observed provider failure: 239.997s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.061s | runtime-health | 200 |
| -0.048s | model-discovery | 200 |
| -0.035s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 98.371s | provider-response | 200 |
| 98.394s | tool-policy-audit | mutation.repository.read |
| 98.401s | tool-request |  |
| 98.413s | tool-result |  |
| 98.419s | provider-request |  |
| 149.980s | provider-response | 200 |
| 149.999s | tool-policy-audit | mutation.repository.test |
| 150.007s | tool-request |  |
| 150.224s | tool-result |  |
| 150.231s | provider-request |  |
| 239.997s | provider-failure | The operation was aborted due to timeout |
| 240.026s | attempt-before-cleanup | structured_chat_loop_timeout |
| 240.037s | attempt-process-cleanup | execution-failed |
| 240.054s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-54642462-c700-445d-860e-3f11ebd2b3d6 |
| 0.011s | ADMITTED | native-benchmark-worker |
| 0.227s | PROFILE_RESOLVED | DEEP |
| 0.227s | MODEL_CALL_START | turn=1 |
| 98.618s | MODEL_CALL_END | turn=1 prompt_ms=22495.704 generation_ms=74742.08 input=2891 cached=544 output=34 tool=mutation.repository.read |
| 98.637s | TOOL_START | mutation.repository.read |
| 98.649s | TOOL_END | mutation.repository.read duration_ms=12 result=tool-result |
| 98.654s | MODEL_CALL_START | turn=2 |
| 150.232s | MODEL_CALL_END | turn=2 prompt_ms=4595.335 generation_ms=46938.094 input=3339 cached=2924 output=21 tool=mutation.repository.test |
| 150.243s | TOOL_START | mutation.repository.test |
| 150.460s | TOOL_END | mutation.repository.test duration_ms=217 result=tool-result |
| 240.233s | TIMEOUT | The operation was aborted due to timeout |
| 240.290s | CLEANUP | confirmed |
| 240.313s | COMPLETION | structured_chat_loop_timeout |
| 240.314s | VERIFICATION_END | upstream_failed |

### baseline / MUT-010

Configured absolute wall deadline: 240s. Observed provider failure: 239.998s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.063s | runtime-health | 200 |
| -0.049s | model-discovery | 200 |
| -0.038s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 97.561s | provider-response | 200 |
| 97.581s | tool-policy-audit | mutation.repository.read |
| 97.587s | tool-request |  |
| 97.598s | tool-result |  |
| 97.605s | provider-request |  |
| 178.911s | provider-response | 200 |
| 178.925s | tool-policy-audit | mutation.repository.read |
| 178.931s | tool-request |  |
| 178.942s | tool-result |  |
| 178.949s | provider-request |  |
| 232.304s | provider-response | 200 |
| 232.323s | tool-policy-audit | mutation.repository.test |
| 232.331s | tool-request |  |
| 232.578s | tool-result |  |
| 232.587s | provider-request |  |
| 239.998s | provider-failure | The operation was aborted due to timeout |
| 240.026s | attempt-before-cleanup | structured_chat_loop_timeout |
| 240.036s | attempt-process-cleanup | execution-failed |
| 240.050s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-c16490d6-1bd2-468c-9e84-267948243342 |
| 0.012s | ADMITTED | native-benchmark-worker |
| 0.243s | PROFILE_RESOLVED | DEEP |
| 0.243s | MODEL_CALL_START | turn=1 |
| 97.822s | MODEL_CALL_END | turn=1 prompt_ms=22234.782 generation_ms=74449.601 input=2863 cached=543 output=34 tool=mutation.repository.read |
| 97.837s | TOOL_START | mutation.repository.read |
| 97.848s | TOOL_END | mutation.repository.read duration_ms=11 result=tool-result |
| 97.853s | MODEL_CALL_START | turn=2 |
| 179.172s | MODEL_CALL_END | turn=2 prompt_ms=4287.013 generation_ms=76989.336 input=3129 cached=2896 output=34 tool=mutation.repository.read |
| 179.181s | TOOL_START | mutation.repository.read |
| 179.192s | TOOL_END | mutation.repository.read duration_ms=11 result=tool-result |
| 179.198s | MODEL_CALL_START | turn=3 |
| 232.572s | MODEL_CALL_END | turn=3 prompt_ms=3900.059 generation_ms=49425.673 input=3345 cached=3162 output=21 tool=mutation.repository.test |
| 232.581s | TOOL_START | mutation.repository.test |
| 232.828s | TOOL_END | mutation.repository.test duration_ms=247 result=tool-result |
| 240.248s | TIMEOUT | The operation was aborted due to timeout |
| 240.300s | CLEANUP | confirmed |
| 240.321s | VERIFICATION_END | upstream_failed |
| 240.321s | COMPLETION | structured_chat_loop_timeout |

### baseline / MUT-011

Configured absolute wall deadline: 240s. Observed provider failure: 240.000s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.063s | runtime-health | 200 |
| -0.041s | model-discovery | 200 |
| -0.035s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 96.579s | provider-response | 200 |
| 96.607s | tool-policy-audit | mutation.repository.read |
| 96.613s | tool-request |  |
| 96.630s | tool-result |  |
| 96.636s | provider-request |  |
| 240.000s | provider-failure | The operation was aborted due to timeout |
| 240.030s | attempt-before-cleanup | structured_chat_loop_timeout |
| 240.043s | attempt-process-cleanup | execution-failed |
| 240.058s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-dfb2186b-08b8-4890-a09a-12d3f7ba11e8 |
| 0.013s | ADMITTED | native-benchmark-worker |
| 0.230s | PROFILE_RESOLVED | DEEP |
| 0.230s | MODEL_CALL_START | turn=1 |
| 96.829s | MODEL_CALL_END | turn=1 prompt_ms=22076.737 generation_ms=72891.484 input=2831 cached=544 output=33 tool=mutation.repository.read |
| 96.849s | TOOL_START | mutation.repository.read |
| 96.866s | TOOL_END | mutation.repository.read duration_ms=17 result=tool-result |
| 240.236s | TIMEOUT | The operation was aborted due to timeout |
| 240.294s | CLEANUP | confirmed |
| 240.316s | COMPLETION | structured_chat_loop_timeout |
| 240.317s | VERIFICATION_END | upstream_failed |

### baseline / MUT-012

Configured absolute wall deadline: 300s. Observed provider failure: 299.998s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.064s | runtime-health | 200 |
| -0.049s | model-discovery | 200 |
| -0.036s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 99.690s | provider-response | 200 |
| 99.715s | tool-policy-audit | mutation.repository.read |
| 99.723s | tool-request |  |
| 99.736s | tool-result |  |
| 99.746s | provider-request |  |
| 187.918s | provider-response | 200 |
| 187.935s | tool-policy-audit | mutation.repository.read |
| 187.943s | tool-request |  |
| 187.955s | tool-result |  |
| 187.964s | provider-request |  |
| 299.998s | provider-failure | The operation was aborted due to timeout |
| 300.032s | attempt-before-cleanup | structured_chat_loop_timeout |
| 300.045s | attempt-process-cleanup | execution-failed |
| 300.062s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-6012a032-2fa3-46ae-8261-158157a5cc6e |
| 0.013s | ADMITTED | native-benchmark-worker |
| 0.241s | PROFILE_RESOLVED | DEEP |
| 0.241s | MODEL_CALL_START | turn=1 |
| 99.954s | MODEL_CALL_END | turn=1 prompt_ms=24322.722 generation_ms=72330.276 input=3055 cached=544 output=32 tool=mutation.repository.read |
| 99.974s | TOOL_START | mutation.repository.read |
| 99.987s | TOOL_END | mutation.repository.read duration_ms=13 result=tool-result |
| 99.996s | MODEL_CALL_START | turn=2 |
| 188.184s | MODEL_CALL_END | turn=2 prompt_ms=4574.984 generation_ms=83563.237 input=3524 cached=3086 output=34 tool=mutation.repository.read |
| 188.194s | TOOL_START | mutation.repository.read |
| 188.206s | TOOL_END | mutation.repository.read duration_ms=12 result=tool-result |
| 300.249s | TIMEOUT | The operation was aborted due to timeout |
| 300.313s | CLEANUP | confirmed |
| 300.334s | VERIFICATION_END | upstream_failed |
| 300.334s | COMPLETION | structured_chat_loop_timeout |

### lean / MUT-001

Configured absolute wall deadline: 120s. Observed provider failure: 119.991s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.127s | runtime-health | 200 |
| -0.098s | model-discovery | 200 |
| -0.088s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 81.179s | provider-response | 200 |
| 81.210s | tool-policy-audit | mutation.repository.read |
| 81.218s | tool-request |  |
| 81.232s | tool-result |  |
| 81.248s | provider-request |  |
| 119.991s | provider-failure | The operation was aborted due to timeout |
| 120.018s | attempt-before-cleanup | structured_chat_loop_timeout |
| 120.034s | attempt-process-cleanup | execution-failed |
| 120.053s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-5bbc7764-5f6c-4b8f-9cbb-afbf8ac3b204 |
| 0.015s | ADMITTED | native-benchmark-worker |
| 0.335s | PROFILE_RESOLVED | STANDARD |
| 0.335s | MODEL_CALL_START | turn=1 |
| 81.541s | MODEL_CALL_END | turn=1 prompt_ms=3471.181 generation_ms=76779.832 input=1560 cached=1559 output=32 tool=mutation.repository.read |
| 81.568s | TOOL_START | mutation.repository.read |
| 81.582s | TOOL_END | mutation.repository.read duration_ms=14 result=tool-result |
| 120.341s | TIMEOUT | The operation was aborted due to timeout |
| 120.403s | CLEANUP | confirmed |
| 120.423s | COMPLETION | structured_chat_loop_timeout |
| 120.424s | VERIFICATION_END | upstream_failed |

### lean / MUT-002

Configured absolute wall deadline: 120s. Observed provider failure: 119.990s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.092s | runtime-health | 200 |
| -0.075s | model-discovery | 200 |
| -0.067s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 92.800s | provider-response | 200 |
| 92.825s | tool-policy-audit | mutation.repository.read |
| 92.832s | tool-request |  |
| 92.843s | tool-result |  |
| 92.855s | provider-request |  |
| 119.990s | provider-failure | The operation was aborted due to timeout |
| 120.015s | attempt-before-cleanup | structured_chat_loop_timeout |
| 120.023s | attempt-process-cleanup | execution-failed |
| 120.036s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-eaf2400e-f0a4-43a0-8f9c-30abd128de54 |
| 0.014s | ADMITTED | native-benchmark-worker |
| 0.235s | PROFILE_RESOLVED | STANDARD |
| 0.235s | MODEL_CALL_START | turn=1 |
| 93.062s | MODEL_CALL_END | turn=1 prompt_ms=12723.12 generation_ms=78652.635 input=1583 cached=231 output=34 tool=mutation.repository.read |
| 93.083s | TOOL_START | mutation.repository.read |
| 93.094s | TOOL_END | mutation.repository.read duration_ms=11 result=tool-result |
| 120.241s | TIMEOUT | The operation was aborted due to timeout |
| 120.287s | CLEANUP | confirmed |
| 120.304s | VERIFICATION_END | upstream_failed |
| 120.304s | COMPLETION | structured_chat_loop_timeout |

### lean / MUT-003

Configured absolute wall deadline: 150s. Observed provider failure: 149.994s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.068s | runtime-health | 200 |
| -0.059s | model-discovery | 200 |
| -0.055s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 141.425s | provider-response | 200 |
| 141.454s | tool-policy-audit | mutation.repository.read |
| 141.460s | tool-request |  |
| 141.467s | tool-failure | mutation_workspace_path_missing |
| 141.480s | provider-request |  |
| 149.994s | provider-failure | The operation was aborted due to timeout |
| 150.015s | attempt-before-cleanup | structured_chat_loop_timeout |
| 150.027s | attempt-process-cleanup | execution-failed |
| 150.041s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-df9e10be-e06d-4efa-88e0-0b0c24e0e4ed |
| 0.008s | ADMITTED | native-benchmark-worker |
| 0.176s | PROFILE_RESOLVED | STANDARD |
| 0.176s | MODEL_CALL_START | turn=1 |
| 141.624s | MODEL_CALL_END | turn=1 prompt_ms=12896.436 generation_ms=124574.694 input=1513 cached=231 output=55 tool=mutation.repository.read |
| 141.646s | TOOL_START | mutation.repository.read |
| 141.653s | TOOL_END | mutation.repository.read duration_ms=7 result=tool-failure |
| 150.180s | TIMEOUT | The operation was aborted due to timeout |
| 150.227s | CLEANUP | confirmed |
| 150.252s | VERIFICATION_END | upstream_failed |
| 150.252s | COMPLETION | structured_chat_loop_timeout |

### lean / MUT-004

Configured absolute wall deadline: 120s. Observed provider failure: 119.993s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.083s | runtime-health | 200 |
| -0.071s | model-discovery | 200 |
| -0.064s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 98.307s | provider-response | 200 |
| 98.339s | tool-policy-audit | mutation.repository.read |
| 98.345s | tool-request |  |
| 98.358s | tool-result |  |
| 98.375s | provider-request |  |
| 119.993s | provider-failure | The operation was aborted due to timeout |
| 120.018s | attempt-before-cleanup | structured_chat_loop_timeout |
| 120.029s | attempt-process-cleanup | execution-failed |
| 120.041s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-873a2d5c-b54a-4b19-a013-9305185ea44f |
| 0.009s | ADMITTED | native-benchmark-worker |
| 0.215s | PROFILE_RESOLVED | STANDARD |
| 0.215s | MODEL_CALL_START | turn=1 |
| 98.546s | MODEL_CALL_END | turn=1 prompt_ms=13967.531 generation_ms=82486.204 input=1705 cached=342 output=34 tool=mutation.repository.read |
| 98.572s | TOOL_START | mutation.repository.read |
| 98.585s | TOOL_END | mutation.repository.read duration_ms=13 result=tool-result |
| 120.220s | TIMEOUT | The operation was aborted due to timeout |
| 120.268s | CLEANUP | confirmed |
| 120.289s | COMPLETION | structured_chat_loop_timeout |
| 120.290s | VERIFICATION_END | upstream_failed |

### lean / MUT-005

Configured absolute wall deadline: 180s. Observed provider failure: 179.992s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.093s | runtime-health | 200 |
| -0.079s | model-discovery | 200 |
| -0.071s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 87.170s | provider-response | 200 |
| 87.203s | tool-policy-audit | mutation.repository.read |
| 87.211s | tool-request |  |
| 87.225s | tool-result |  |
| 87.241s | provider-request |  |
| 179.455s | provider-response | 200 |
| 179.472s | tool-policy-audit | mutation.repository.read |
| 179.477s | tool-request |  |
| 179.488s | tool-result |  |
| 179.500s | provider-request |  |
| 179.992s | provider-failure | The operation was aborted due to timeout |
| 180.011s | attempt-before-cleanup | structured_chat_loop_timeout |
| 180.017s | attempt-process-cleanup | execution-failed |
| 180.029s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-8dafa59b-dc97-4dfa-9e6f-9c956461800c |
| 0.009s | ADMITTED | native-benchmark-worker |
| 0.233s | PROFILE_RESOLVED | STANDARD |
| 0.233s | MODEL_CALL_START | turn=1 |
| 87.430s | MODEL_CALL_END | turn=1 prompt_ms=17048.796 generation_ms=68166.837 input=1823 cached=231 output=32 tool=mutation.repository.read |
| 87.457s | TOOL_START | mutation.repository.read |
| 87.471s | TOOL_END | mutation.repository.read duration_ms=14 result=tool-result |
| 87.486s | MODEL_CALL_START | turn=2 |
| 179.711s | MODEL_CALL_END | turn=2 prompt_ms=16651.569 generation_ms=75181.449 input=2235 cached=504 output=34 tool=mutation.repository.read |
| 179.723s | TOOL_START | mutation.repository.read |
| 179.734s | TOOL_END | mutation.repository.read duration_ms=11 result=tool-result |
| 180.238s | TIMEOUT | The operation was aborted due to timeout |
| 180.275s | CLEANUP | confirmed |
| 180.289s | VERIFICATION_END | upstream_failed |
| 180.289s | COMPLETION | structured_chat_loop_timeout |

### lean / MUT-007

Configured absolute wall deadline: 180s. Observed provider failure: 179.992s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.119s | runtime-health | 200 |
| -0.102s | model-discovery | 200 |
| -0.095s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 91.857s | provider-response | 200 |
| 91.893s | tool-policy-audit | mutation.repository.read |
| 91.901s | tool-request |  |
| 91.915s | tool-result |  |
| 91.935s | provider-request |  |
| 179.992s | provider-failure | The operation was aborted due to timeout |
| 180.023s | attempt-before-cleanup | structured_chat_loop_timeout |
| 180.032s | attempt-process-cleanup | execution-failed |
| 180.049s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-01fa4a4c-0c10-44d2-bdd1-6913a1a66591 |
| 0.011s | ADMITTED | native-benchmark-worker |
| 0.267s | PROFILE_RESOLVED | STANDARD |
| 0.267s | MODEL_CALL_START | turn=1 |
| 92.151s | MODEL_CALL_END | turn=1 prompt_ms=13269.373 generation_ms=76226.847 input=1564 cached=231 output=33 tool=mutation.repository.read |
| 92.181s | TOOL_START | mutation.repository.read |
| 92.195s | TOOL_END | mutation.repository.read duration_ms=14 result=tool-result |
| 180.272s | TIMEOUT | The operation was aborted due to timeout |
| 180.329s | CLEANUP | confirmed |
| 180.356s | VERIFICATION_END | upstream_failed |
| 180.356s | COMPLETION | structured_chat_loop_timeout |

### lean / MUT-009

Configured absolute wall deadline: 240s. Observed provider failure: 239.990s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.107s | runtime-health | 200 |
| -0.091s | model-discovery | 200 |
| -0.081s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 104.335s | provider-response | 200 |
| 104.393s | tool-policy-audit | mutation.repository.read |
| 104.403s | tool-request |  |
| 104.425s | tool-result |  |
| 104.450s | provider-request |  |
| 239.990s | provider-failure | The operation was aborted due to timeout |
| 240.024s | attempt-before-cleanup | structured_chat_loop_timeout |
| 240.041s | attempt-process-cleanup | execution-failed |
| 240.057s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-6f9c9fb3-6a1b-467c-9b44-1353872945fd |
| 0.016s | ADMITTED | native-benchmark-worker |
| 0.286s | PROFILE_RESOLVED | DEEP |
| 0.286s | MODEL_CALL_START | turn=1 |
| 104.664s | MODEL_CALL_END | turn=1 prompt_ms=19302.944 generation_ms=84430.299 input=2253 cached=231 output=34 tool=mutation.repository.read |
| 104.706s | TOOL_START | mutation.repository.read |
| 104.728s | TOOL_END | mutation.repository.read duration_ms=22 result=tool-result |
| 240.293s | TIMEOUT | The operation was aborted due to timeout |
| 240.360s | CLEANUP | confirmed |
| 240.382s | COMPLETION | structured_chat_loop_timeout |
| 240.384s | VERIFICATION_END | upstream_failed |

### lean / MUT-010

Configured absolute wall deadline: 240s. Observed provider failure: 239.991s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.126s | runtime-health | 200 |
| -0.107s | model-discovery | 200 |
| -0.093s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 103.284s | provider-response | 200 |
| 103.324s | tool-policy-audit | mutation.repository.read |
| 103.335s | tool-request |  |
| 103.353s | tool-result |  |
| 103.372s | provider-request |  |
| 208.756s | provider-response | 200 |
| 208.777s | tool-policy-audit | mutation.repository.read |
| 208.782s | tool-request |  |
| 208.795s | tool-result |  |
| 208.810s | provider-request |  |
| 239.991s | provider-failure | The operation was aborted due to timeout |
| 240.017s | attempt-before-cleanup | structured_chat_loop_timeout |
| 240.030s | attempt-process-cleanup | execution-failed |
| 240.045s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-4a3b9506-7129-4f16-86d4-4b223174501a |
| 0.021s | ADMITTED | native-benchmark-worker |
| 0.328s | PROFILE_RESOLVED | DEEP |
| 0.328s | MODEL_CALL_START | turn=1 |
| 103.643s | MODEL_CALL_END | turn=1 prompt_ms=19605.831 generation_ms=81206.778 input=2225 cached=231 output=34 tool=mutation.repository.read |
| 103.678s | TOOL_START | mutation.repository.read |
| 103.696s | TOOL_END | mutation.repository.read duration_ms=18 result=tool-result |
| 103.713s | MODEL_CALL_START | turn=2 |
| 209.111s | MODEL_CALL_END | turn=2 prompt_ms=21177.666 generation_ms=83726.519 input=2653 cached=231 output=34 tool=mutation.repository.read |
| 209.125s | TOOL_START | mutation.repository.read |
| 209.138s | TOOL_END | mutation.repository.read duration_ms=13 result=tool-result |
| 240.334s | TIMEOUT | The operation was aborted due to timeout |
| 240.388s | CLEANUP | confirmed |
| 240.408s | COMPLETION | structured_chat_loop_timeout |
| 240.409s | VERIFICATION_END | upstream_failed |

### lean / MUT-011

Configured absolute wall deadline: 240s. Observed provider failure: 239.993s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.094s | runtime-health | 200 |
| -0.080s | model-discovery | 200 |
| -0.071s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 91.747s | provider-response | 200 |
| 91.783s | tool-policy-audit | mutation.repository.read |
| 91.791s | tool-request |  |
| 91.804s | tool-result |  |
| 91.817s | provider-request |  |
| 239.993s | provider-failure | The operation was aborted due to timeout |
| 240.023s | attempt-before-cleanup | structured_chat_loop_timeout |
| 240.033s | attempt-process-cleanup | execution-failed |
| 240.047s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-24b2274f-e117-4d10-8b1e-62b7e41826b0 |
| 0.012s | ADMITTED | native-benchmark-worker |
| 0.262s | PROFILE_RESOLVED | DEEP |
| 0.262s | MODEL_CALL_START | turn=1 |
| 92.036s | MODEL_CALL_END | turn=1 prompt_ms=17884.771 generation_ms=71774.902 input=2193 cached=231 output=33 tool=mutation.repository.read |
| 92.065s | TOOL_START | mutation.repository.read |
| 92.078s | TOOL_END | mutation.repository.read duration_ms=13 result=tool-result |
| 240.267s | TIMEOUT | The operation was aborted due to timeout |
| 240.321s | CLEANUP | confirmed |
| 240.355s | COMPLETION | structured_chat_loop_timeout |
| 240.356s | VERIFICATION_END | upstream_failed |

### lean / MUT-012

Configured absolute wall deadline: 300s. Observed provider failure: 299.989s after the first provider request.

| Offset | Event | Detail |
|---:|---|---|
| -0.119s | runtime-health | 200 |
| -0.102s | model-discovery | 200 |
| -0.094s | workspace-prepared |  |
| 0.000s | provider-request |  |
| 92.751s | provider-response | 200 |
| 92.785s | tool-policy-audit | mutation.repository.read |
| 92.792s | tool-request |  |
| 92.806s | tool-result |  |
| 92.823s | provider-request |  |
| 196.976s | provider-response | 200 |
| 196.996s | tool-policy-audit | mutation.repository.read |
| 197.002s | tool-request |  |
| 197.013s | tool-result |  |
| 197.027s | provider-request |  |
| 299.989s | provider-failure | The operation was aborted due to timeout |
| 300.026s | attempt-before-cleanup | structured_chat_loop_timeout |
| 300.041s | attempt-process-cleanup | execution-failed |
| 300.056s | attempt-workspace-cleanup |  |

**Normalized lifecycle**

| Offset from submission | Lifecycle event | Detail |
|---:|---|---|
| 0.000s | SUBMITTED | run-fe3d33e8-66d3-4f61-824a-b385c876614d |
| 0.014s | ADMITTED | native-benchmark-worker |
| 0.298s | PROFILE_RESOLVED | DEEP |
| 0.298s | MODEL_CALL_START | turn=1 |
| 93.079s | MODEL_CALL_END | turn=1 prompt_ms=21039.309 generation_ms=70768.394 input=2417 cached=231 output=32 tool=mutation.repository.read |
| 93.107s | TOOL_START | mutation.repository.read |
| 93.121s | TOOL_END | mutation.repository.read duration_ms=14 result=tool-result |
| 93.136s | MODEL_CALL_START | turn=2 |
| 197.303s | MODEL_CALL_END | turn=2 prompt_ms=26347.986 generation_ms=77405.746 input=3048 cached=231 output=34 tool=mutation.repository.read |
| 197.317s | TOOL_START | mutation.repository.read |
| 197.328s | TOOL_END | mutation.repository.read duration_ms=11 result=tool-result |
| 300.304s | TIMEOUT | The operation was aborted due to timeout |
| 300.371s | CLEANUP | confirmed |
| 300.402s | COMPLETION | structured_chat_loop_timeout |
| 300.403s | VERIFICATION_END | upstream_failed |

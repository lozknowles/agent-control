#!/usr/bin/env bash
set -euo pipefail

mode="${1:-}"
if [[ "$mode" != "cold" && "$mode" != "warm" && "$mode" != "warm-inference" ]]; then
  echo "usage: $0 cold|warm|warm-inference" >&2
  exit 2
fi

root="$(git rev-parse --show-toplevel)"
commit="$(git rev-parse HEAD)"
output="/fast/work/agent-control-4.17-qualification-output/image-${mode}"
state="/fast/work/agent-control-4.17-qualification-state/image-${mode}"
workflow="/fast/work/qwen-image21-p5000-20260925/workflow-768-api.json"
seed=20260929
if [[ "$mode" == "warm-inference" ]]; then seed=20260930; fi
mkdir -p "$output" "$state"

queue="$(curl -fsS http://127.0.0.1:18188/queue)"
python3 -c 'import json,sys; q=json.loads(sys.argv[1]); assert not q["queue_running"] and not q["queue_pending"], "comfy_queue_not_empty"' "$queue"
if [[ "$mode" == "cold" ]]; then
  curl -fsS -X POST -H 'Content-Type: application/json' -d '{"unload_models":true,"free_memory":true}' http://127.0.0.1:18188/free >/dev/null
  sleep 5
fi

comfy_pid="$(pgrep -f '/fast/work/qwen-image21-p5000-20260925/venv/bin/python -u main.py.*18188' | head -n1)"
nvidia-smi --query-gpu=timestamp,utilization.gpu,memory.used,power.draw --format=csv,noheader,nounits -l 1 -f "$output/gpu-telemetry.csv" &
gpu_monitor=$!
(
  echo 'timestamp,cpu_percent,memory_percent,rss_kib,system_available_kib'
  while kill -0 "$comfy_pid" 2>/dev/null; do
    stamp="$(date -Iseconds)"
    process="$(ps -p "$comfy_pid" -o %cpu=,%mem=,rss= | xargs | tr ' ' ',')"
    available="$(awk '/MemAvailable:/{print $2}' /proc/meminfo)"
    echo "$stamp,$process,$available"
    sleep 1
  done
) >"$output/process-telemetry.csv" &
process_monitor=$!
cleanup(){ kill "$gpu_monitor" "$process_monitor" 2>/dev/null || true; wait "$gpu_monitor" "$process_monitor" 2>/dev/null || true; }
trap cleanup EXIT

cd "$root"
AGENT_CONTROL_SOURCE_COMMIT="$commit" node --import tsx scripts/qualify-image-4.16.ts \
  --endpoint http://127.0.0.1:18188 \
  --workflow "$workflow" \
  --output "$output" \
  --state "$state" \
  --model Qwen-Image-2.1 \
  --model-revision sha256:ec114630a3dbecc925ce764a245232dc450124e7e3e7ec72000f196f25947228 \
  --provider qwen-image21-comfy-local \
  --host hpubuntu \
  --accelerator NVIDIA-Quadro-P5000-16GB \
  --runtime ComfyUI-0.37.0 \
  --prompt-node 452 \
  --latent-node 456 \
  --sampler-node 458 \
  --output-node 461 \
  --width 768 \
  --height 768 \
  --seed "$seed" \
  --instruction 'A deterministic qualification still life: a cobalt blue ceramic cube on a pale oak table beside a brass ruler, soft window light, realistic product photograph, no text, no watermark.' \
  --qualification-id "4.17-${mode}" | tee "$output/qualification.stdout.json"

cleanup
trap - EXIT
curl -fsS http://127.0.0.1:18188/queue >"$output/final-queue.json"

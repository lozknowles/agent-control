#!/data/data/com.termux/files/usr/bin/bash
set -u

LOG="$HOME/.agent-control-boot.log"
REPO="$HOME/agent-control-2"
TOKEN_FILE="$HOME/.config/agent-control/pixel-node-token"

mkdir -p "$HOME/.config/agent-control"
exec >>"$LOG" 2>&1
printf '\n[%s] Agent Control Pixel boot hook\n' "$(date -Iseconds 2>/dev/null || date)"

if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock || true
fi

if command -v sshd >/dev/null 2>&1; then
  if pgrep -f "$PREFIX/bin/sshd" >/dev/null 2>&1; then
    echo "sshd already running"
  else
    sshd && echo "sshd started" || echo "sshd start failed"
  fi
else
  echo "sshd unavailable; install openssh"
fi

if [ -d "$REPO" ] && [ -r "$TOKEN_FILE" ]; then
  if curl -fsS --max-time 2 http://127.0.0.1:8788/health >/dev/null 2>&1; then
    echo "Pixel node already healthy"
  else
    export AGENT_CONTROL_NODE_TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"
    cd "$REPO" || exit 0
    setsid ./android/start-node.sh > "$HOME/.agent-control-pixel-node.log" 2>&1 < /dev/null &
    echo "Pixel node start sent"
  fi
else
  echo "Pixel node boot start skipped; repo/token not available"
fi

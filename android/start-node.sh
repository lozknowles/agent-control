#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${AGENT_CONTROL_NODE_TOKEN:?Set AGENT_CONTROL_NODE_TOKEN to a long random secret}"
export AGENT_CONTROL_NODE_STATE_DIR="${AGENT_CONTROL_NODE_STATE_DIR:-$HOME/.config/agent-control/android-node}"
export AGENT_CONTROL_NODE_DISABLE_FILE="${AGENT_CONTROL_NODE_DISABLE_FILE:-$AGENT_CONTROL_NODE_STATE_DIR/disabled}"
if [ -e "$AGENT_CONTROL_NODE_DISABLE_FILE" ]; then
  echo "Android node is locally disabled: $AGENT_CONTROL_NODE_DISABLE_FILE" >&2
  exit 78
fi
export AGENT_CONTROL_NODE_HOST="${AGENT_CONTROL_NODE_HOST:-127.0.0.1}"
export AGENT_CONTROL_NODE_PORT="${AGENT_CONTROL_NODE_PORT:-8788}"
exec node android/node-server.mjs

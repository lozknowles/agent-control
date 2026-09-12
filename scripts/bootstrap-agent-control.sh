#!/usr/bin/env bash
set -euo pipefail

mode="check"
role="control"
target="${PWD}"
repository=""
while (($#)); do
  case "$1" in
    --check) mode="check" ;;
    --install) mode="install" ;;
    --role) shift; role="${1:-}" ;;
    --target) shift; target="${1:-}" ;;
    --repository) shift; repository="${1:-}" ;;
    *) echo "unsupported_argument" >&2; exit 2 ;;
  esac
  shift
done
[[ "$role" == "control" || "$role" == "worker" ]] || { echo "invalid_role" >&2; exit 2; }
for required in git node npm; do command -v "$required" >/dev/null || { echo "required_prerequisite_missing:$required" >&2; exit 1; }; done
if [[ ! -d "$target" ]]; then
  [[ "$mode" == "install" && -n "$repository" ]] || { echo "target_missing_no_changes_made" >&2; exit 1; }
  git clone -- "$repository" "$target"
fi
[[ -d "$target/.git" ]] || { echo "repository_not_git" >&2; exit 1; }
dirty="$(git -C "$target" status --porcelain)"
[[ -z "$dirty" ]] || { echo "repository_dirty_no_changes_made" >&2; exit 1; }
git -C "$target" rev-parse --verify HEAD >/dev/null
[[ -f "$target/package-lock.json" ]] || { echo "lockfile_missing" >&2; exit 1; }
if [[ "$mode" == "install" ]]; then
  npm --prefix "$target" ci
  npm --prefix "$target" run build
fi
printf '{"schema":"agent-control.bootstrap/v1","mode":"%s","role":"%s","repository":"verified","dashboard":"%s"}\n' "$mode" "$role" "$([[ -f "$target/assets/dashboard/index.html" ]] && echo available || echo missing)"

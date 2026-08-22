#!/data/data/com.termux/files/usr/bin/bash
set -u
VERSION=2.0.0-pixel-alpha.1
json_escape(){ printf '%s' "$1"|sed 's/\\/\\\\/g;s/"/\\"/g'; }
has(){ command -v "$1" >/dev/null 2>&1; }
prop(){ getprop "$1" 2>/dev/null|tr -d '\r\n'; }
cap(){ printf '    {"id":"%s","kind":"%s"}' "$1" "$2"; }
MODEL=$(prop ro.product.model); SDK=$(prop ro.build.version.sdk); ANDROID=$(prop ro.build.version.release); HOST=$(hostname 2>/dev/null||printf pixel)
ADB=false; has adb&&ADB=true
LOGCAT=false; has logcat&&LOGCAT=true
TERMUX=false; [ -n "${PREFIX:-}" ]&&TERMUX=true
CODEX=false; has codex&&CODEX=true
TAILSCALE=false; has tailscale&&TAILSCALE=true
SHIZUKU=false
if has rish;then SHIZUKU=true;elif [ -d /sdcard/Android/data/moe.shizuku.privileged.api ] 2>/dev/null;then SHIZUKU=true;fi
printf '{\n'
printf '  "schema":"agent-control.resource/v2",\n'
printf '  "agentVersion":"%s",\n' "$VERSION"
printf '  "resource":{"id":"pixel","type":"host","health":"healthy","identity":{"logicalName":"pixel","hostname":"%s"},\n' "$(json_escape "$HOST")"
printf '  "platform":{"os":"android","model":"%s","android":"%s","sdk":"%s"},\n' "$(json_escape "$MODEL")" "$(json_escape "$ANDROID")" "$(json_escape "$SDK")"
printf '  "observed":{"termux":%s,"codex":%s,"adb":%s,"logcat":%s,"tailscale":%s,"shizuku":%s},\n' "$TERMUX" "$CODEX" "$ADB" "$LOGCAT" "$TAILSCALE" "$SHIZUKU"
printf '  "capabilities":[\n'
cap platform.android platform; printf ',\n'; cap device.physical platform
$TERMUX&&{ printf ',\n';cap harness.termux harness; }
$CODEX&&{ printf ',\n';cap harness.codex harness; }
$ADB&&{ printf ',\n';cap transport.adb transport; }
$TAILSCALE&&{ printf ',\n';cap transport.tailscale transport; }
$LOGCAT&&{ printf ',\n';cap observe.android.logcat tool; }
$SHIZUKU&&{ printf ',\n';cap privilege.shizuku tool; }
printf '\n  ]}}\n'

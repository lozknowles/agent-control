#!/data/data/com.termux/files/usr/bin/bash
set -u
VERSION=3.0.1
json_escape(){ printf '%s' "$1"|sed 's/\\/\\\\/g;s/"/\\"/g'; }
has(){ command -v "$1" >/dev/null 2>&1; }
prop(){ getprop "$1" 2>/dev/null|tr -d '\r\n'; }
cap(){ printf '    {"id":"%s","kind":"%s"}' "$1" "$2"; }
MODEL=$(prop ro.product.model); SDK=$(prop ro.build.version.sdk); ANDROID=$(prop ro.build.version.release); HOST=$(hostname 2>/dev/null||printf android); RESOURCE_ID=${AGENT_CONTROL_RESOURCE_ID:-android-resource}
ADB=false; has adb&&ADB=true
LOGCAT=false; has logcat&&LOGCAT=true
TERMUX=false; [ -n "${PREFIX:-}" ]&&TERMUX=true
CODEX=false; has codex&&CODEX=true
SHIZUKU=false
if has rish;then SHIZUKU=true;elif [ -d /sdcard/Android/data/moe.shizuku.privileged.api ] 2>/dev/null;then SHIZUKU=true;fi
printf '{\n'
printf '  "schema":"agent-control.resource/v2",\n'
printf '  "agentVersion":"%s",\n' "$VERSION"
printf '  "resource":{"id":"%s","type":"host","health":"healthy","identity":{"logicalName":"%s","hostname":"%s"},\n' "$(json_escape "$RESOURCE_ID")" "$(json_escape "$RESOURCE_ID")" "$(json_escape "$HOST")"
printf '  "platform":{"os":"android","model":"%s","android":"%s","sdk":"%s"},\n' "$(json_escape "$MODEL")" "$(json_escape "$ANDROID")" "$(json_escape "$SDK")"
printf '  "observed":{"termux":%s,"codex":%s,"adb":%s,"logcat":%s,"shizuku":%s},\n' "$TERMUX" "$CODEX" "$ADB" "$LOGCAT" "$SHIZUKU"
printf '  "capabilities":[\n'
cap platform.android platform; printf ',\n'; cap device.physical platform
if $TERMUX; then printf ',\n'; cap harness.termux harness; fi
if $CODEX; then printf ',\n'; cap harness.codex harness; fi
if $ADB; then printf ',\n'; cap transport.adb transport; fi
if $LOGCAT; then printf ',\n'; cap observe.android.logcat tool; fi
if $SHIZUKU; then printf ',\n'; cap privilege.shizuku tool; fi
printf '\n  ]}}\n'

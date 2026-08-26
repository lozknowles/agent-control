#!/bin/sh
set -u

# A fixed, read-only inventory protocol for agentless Linux nodes. Values are
# base64 encoded so host-provided text cannot alter the record framing.
emit() {
  key=$1
  value=${2-}
  encoded=$(printf '%s' "$value" | base64 | tr -d '\n')
  printf '%s\t%s\n' "$key" "$encoded"
}
tab=$(printf '\t')

first_value() {
  sed -n "s/^$1=//p" /etc/os-release 2>/dev/null | head -n 1 | sed 's/^"//;s/"$//'
}

emit protocol agent-control.managed-node-probe/v1
emit hostname "$(hostname 2>/dev/null || uname -n)"
emit os_id "$(first_value ID)"
emit os_name "$(first_value PRETTY_NAME)"
emit os_version "$(first_value VERSION_ID)"
emit kernel "$(uname -r 2>/dev/null || true)"
emit architecture "$(uname -m 2>/dev/null || true)"
emit cpu_model "$(sed -n 's/^model name[[:space:]]*:[[:space:]]*//p' /proc/cpuinfo 2>/dev/null | head -n 1)"
emit cpu_logical "$(getconf _NPROCESSORS_ONLN 2>/dev/null || printf 0)"
emit memory_total_bytes "$(awk '/^MemTotal:/ {print $2 * 1024}' /proc/meminfo 2>/dev/null)"
emit memory_available_bytes "$(awk '/^MemAvailable:/ {print $2 * 1024}' /proc/meminfo 2>/dev/null)"
emit uptime_seconds "$(cut -d. -f1 /proc/uptime 2>/dev/null || printf 0)"
set -- $(cat /proc/loadavg 2>/dev/null || printf '0 0 0')
emit load_1 "${1-0}"
emit load_5 "${2-0}"
emit load_15 "${3-0}"

if command -v df >/dev/null 2>&1; then
  df -P -B1 -x tmpfs -x devtmpfs 2>/dev/null | awk 'NR > 1 {mount=$6; for (i=7; i<=NF; i++) mount=mount " " $i; print $1 "\t" $2 "\t" $4 "\t" $5 "\t" mount}' |
  while IFS= read -r row; do emit storage "$row"; done
fi

optical_names=''
if command -v lsblk >/dev/null 2>&1; then
  optical_names=$(lsblk -dn -o KNAME,TYPE 2>/dev/null | awk '$2 == "rom" {print $1}')
  for name in $optical_names; do
    device="/dev/$name"
    model=$(lsblk -dn -o MODEL "$device" 2>/dev/null | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    transport=$(lsblk -dn -o TRAN "$device" 2>/dev/null | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    emit optical "${name}${tab}${model}${tab}${transport}"
    holders=''
    if command -v lsof >/dev/null 2>&1; then holders=$(lsof -t "$device" 2>/dev/null | sort -u); fi
    if [ -z "$holders" ] && command -v fuser >/dev/null 2>&1; then holders=$(fuser "$device" 2>/dev/null | tr ' ' '\n' | sed '/^$/d' | sort -u); fi
    for pid in $holders; do emit optical_holder "${name}${tab}${pid}"; done
  done
fi

if command -v ip >/dev/null 2>&1; then
  ip -brief address show 2>/dev/null | while IFS= read -r row; do emit network "$row"; done
fi

for zone in /sys/class/thermal/thermal_zone*; do
  [ -r "$zone/temp" ] || continue
  kind=$(cat "$zone/type" 2>/dev/null || basename "$zone")
  value=$(cat "$zone/temp" 2>/dev/null || true)
  emit temperature "${kind}${tab}${value}"
done

if command -v systemctl >/dev/null 2>&1; then
  emit service_manager systemd
  systemctl list-units --type=service --state=running --no-legend --no-pager 2>/dev/null | awk '{print $1}' |
  while IFS= read -r unit; do [ -n "$unit" ] && emit service "$unit"; done
fi

for tool in sh bash apt-get dpkg dnf yum rpm pacman zypper apk snap flatpak systemctl service journalctl git curl rsync makemkvcon HandBrakeCLI dvdbackup vobcopy cdparanoia abcde ffmpeg; do
  if command -v "$tool" >/dev/null 2>&1; then emit tool "$tool"; fi
done

for proc in /proc/[0-9]*; do
  [ -r "$proc/comm" ] || continue
  pid=${proc##*/}
  comm=$(cat "$proc/comm" 2>/dev/null || true)
  arg0=$(tr '\000' '\n' < "$proc/cmdline" 2>/dev/null | sed -n '1p')
  arg1=$(tr '\000' '\n' < "$proc/cmdline" 2>/dev/null | sed -n '2p')
  arg0=${arg0##*/}
  arg1=${arg1##*/}
  unit=$(awk -F: '{print $3}' "$proc/cgroup" 2>/dev/null | tr '/' '\n' | sed -n '/\.service$/p' | head -n 1)
  emit process "${pid}${tab}${comm}${tab}${arg0}${tab}${arg1}${tab}${unit}"
done

emit probe_complete true

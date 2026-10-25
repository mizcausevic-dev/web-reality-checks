#!/usr/bin/env bash
# Downloads a generated narration file to video/public/epNN/narration.mp3 and probes it.
# Usage: tools/fetch-audio.sh ep02 '<signed url>'
set -euo pipefail
ep="$1"; url="$2"
root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$root/video/public/$ep"
code=$(curl -sS -L -o "$root/video/public/$ep/narration.mp3" -w '%{http_code}' "$url")
[ "$code" = "200" ] || { echo "download failed: HTTP $code"; exit 1; }
size=$(stat -c %s "$root/video/public/$ep/narration.mp3")
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$root/video/public/$ep/narration.mp3")
echo "{\"ep\":\"$ep\",\"bytes\":$size,\"duration_s\":$dur}"

#!/usr/bin/env bash
# Renders episodes sequentially (2-core box). Usage: tools/render-queue.sh ep10 ep15 ep06
set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
for ep in "$@"; do
  echo "=== $ep start $(date -u +%H:%M:%S)"
  ( cd "$root" && node tools/render.mjs "$ep" --concurrency 2 ) > "$root/episodes/$ep/render.log" 2>&1
  echo "=== $ep exit=$? $(date -u +%H:%M:%S)"
  grep -E '"duration_s"|"bytes"' "$root/episodes/$ep/render.log" | head -2
done

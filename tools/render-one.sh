#!/usr/bin/env bash
# Renders one id with a Root limited to that id (so half-built neighbours cannot break the bundle).
# Usage: tools/render-one.sh ep24   (then restore the full Root with: node tools/gen-root.mjs)
set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
for ep in "$@"; do
  echo "=== $ep start $(date -u +%H:%M:%S)"
  node tools/gen-root.mjs "$ep" >/dev/null
  node tools/render.mjs "$ep" --concurrency 2 > "episodes/$ep/render.log" 2>&1
  echo "=== $ep exit=$? $(date -u +%H:%M:%S)"
  grep -E '"duration_s"|"bytes"' "episodes/$ep/render.log" | head -2
done
node tools/gen-root.mjs >/dev/null

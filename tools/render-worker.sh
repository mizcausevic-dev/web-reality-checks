#!/usr/bin/env bash
# Sequential render worker: renders ids listed as files in queue/ (touch queue/ep26). Stops when queue/STOP exists.
root="$(cd "$(dirname "$0")/.." && pwd)"; cd "$root"
while [ ! -e queue/STOP ]; do
  next=$(ls queue 2>/dev/null | grep -v STOP | sort | head -1)
  if [ -n "$next" ] && ! pgrep -f "remotion render" >/dev/null; then
    rm -f "queue/$next"
    tools/render-one.sh "$next" >> queue.log 2>&1
  else sleep 5; fi
done

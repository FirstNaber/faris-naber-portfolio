#!/usr/bin/env bash
# Bump the build number, push, wait until GitHub Pages is actually serving it, then open it.
# Opening the site before the ~30-40s Pages build finishes loads the OLD page, which the
# browser then caches for 10 minutes (Pages sends cache-control: max-age=600).
set -euo pipefail
cd "$(dirname "$0")/.."
URL="https://firstnaber.github.io/faris-naber-portfolio/"
old=$(grep -o 'name="build" content="[0-9]*"' index.html | grep -o '[0-9]*')
new=$((old + 1))
sed -i '' "s/name=\"build\" content=\"$old\"/name=\"build\" content=\"$new\"/; s/?v=$old\"/?v=$new\"/g" index.html
git add -A
git commit -qm "${1:-Update site}" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q
echo "pushed build $new, waiting for GitHub Pages..."
for i in $(seq 1 120); do
  if curl -s "$URL?nc=$RANDOM$i" | grep -q "name=\"build\" content=\"$new\""; then
    echo "live: build $new"
    [ "${NO_OPEN:-}" = "1" ] || open "$URL?b=$new${2:-}"
    exit 0
  fi
  sleep 5
done
echo "timed out waiting for build $new" >&2; exit 1

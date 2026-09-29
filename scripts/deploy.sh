#!/usr/bin/env bash
# The portfolio lives at naberstudio.com/faris/. This copies it into the studio site repo and publishes it
# (GitHub Pages rebuilds naberstudio.com about a minute after the push).
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="$HOME/Projects/NaberStudio/website/faris"
rsync -a --delete --exclude '.git' --exclude 'scripts' --exclude 'README.md' --exclude '*.docx' --exclude '.DS_Store' ./ "$DEST/"
cd "$DEST/.." && git add -A faris && git commit -qm "Update founder page" && git push -q && echo "published to naberstudio.com/faris/"

#!/usr/bin/env bash
# The portfolio now lives at https://naberstudio.com/faris/ — copy it into the studio site and publish.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="$HOME/Projects/NaberStudio/website/faris"
rsync -a --delete --exclude '.git' --exclude 'scripts' --exclude 'README.md' --exclude '*.docx' --exclude '.DS_Store' ./ "$DEST/"
cd "$DEST/.." && git add -A faris && git commit -qm "Update founder page" && git push -q && echo "published https://naberstudio.com/faris/"

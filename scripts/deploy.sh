#!/usr/bin/env bash
# The portfolio lives at naberstudio.com/faris/. While the site is under construction, edits go to the
# "edit" branch (~/Projects/NaberStudio/website-edit), not the live site. Point DEST back to website/ after launch.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="$HOME/Projects/NaberStudio/website-edit/faris"
rsync -a --delete --exclude '.git' --exclude 'scripts' --exclude 'README.md' --exclude '*.docx' --exclude '.DS_Store' ./ "$DEST/"
cd "$DEST/.." && git add -A faris && git commit -qm "Update founder page" && git push -q && echo "saved to the edit branch (not live while under construction)"

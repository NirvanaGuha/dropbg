#!/usr/bin/env sh
# Download the Pro waitlist as CSV. Token lives in worker/.export-token.local (gitignored).
cd "$(dirname "$0")/.." || exit 1
curl -sf -H "Authorization: Bearer $(cat worker/.export-token.local)" https://dropbg-api.guha2clash.workers.dev/waitlist/export

#!/usr/bin/env bash
# Apply one Supabase migration file to the remote project and record it in the
# CLI migration history, without touching any other migration.
#
#   ./scripts/db-migrate.sh src/supabase/migrations/20260811210000_foo.sql
#   pnpm db:migrate src/supabase/migrations/20260811210000_foo.sql
#
# Why not `supabase db push`: this repo's migration history diverged from the
# remote in Feb 2026 (local noon-timestamped files vs remote real-timestamped
# twins), so push would try to re-apply old migrations. This script applies
# exactly the file you name via the management API (uses the keychain token
# from `npx supabase login`; no DB password needed) and then marks that single
# version as applied.
set -euo pipefail

PROJECT_REF="mealmslwugsqqyoesrxd"
FILE="${1:?usage: $0 src/supabase/migrations/<version>_<name>.sql}"

if [ ! -f "$FILE" ]; then
  echo "error: no such file: $FILE" >&2
  exit 1
fi

VERSION=$(basename "$FILE" | cut -d_ -f1)
if ! [[ "$VERSION" =~ ^[0-9]{14}$ ]]; then
  echo "error: filename must start with a 14-digit version timestamp: $(basename "$FILE")" >&2
  exit 1
fi

# Token: env var (CI / non-macOS) first, then the macOS keychain entry
# created by `npx supabase login`.
TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  TOKEN=$(security find-generic-password -s 'Supabase CLI' -w 2>/dev/null) || {
    echo "error: no Supabase access token. Run: npx supabase login (or set SUPABASE_ACCESS_TOKEN)" >&2
    exit 1
  }
fi

# Refuse to re-apply a version that's already in the remote history (the
# Remote column of `migration list` is the 2nd pipe-separated field).
# The guard must fail CLOSED: if we can't read the remote history at all,
# abort rather than risk re-applying SQL to production.
LIST=$(npx supabase migration list --workdir src 2>&1) || {
  echo "error: could not read remote migration history; aborting." >&2
  echo "$LIST" >&2
  exit 1
}
if ! echo "$LIST" | grep -q "Remote"; then
  echo "error: unexpected 'migration list' output (no Remote column); aborting." >&2
  echo "$LIST" >&2
  exit 1
fi
if echo "$LIST" | awk -F'|' -v v="$VERSION" '$2 ~ v { found = 1 } END { exit !found }'; then
  echo "error: version $VERSION is already applied on the remote (see: npx supabase migration list --workdir src)" >&2
  exit 1
fi

echo "Applying $(basename "$FILE") to project $PROJECT_REF ..."
BODY=$(python3 -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1]).read()}))' "$FILE")
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
OUTPUT=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "error: migration failed (HTTP $HTTP_CODE):" >&2
  echo "$OUTPUT" >&2
  exit 1
fi

echo "SQL applied. Recording version $VERSION in migration history ..."
npx supabase migration repair --status applied "$VERSION" --workdir src

echo "Done: $(basename "$FILE")"

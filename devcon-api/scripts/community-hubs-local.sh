#!/usr/bin/env bash
# Run the Community Hubs live export on this machine instead of in GitHub
# Actions, leaving the result as an uncommitted diff to review and commit by
# hand. Same two halves as .github/workflows/fileverse-live-export.yml:
# a headless browser dumps each dSheet's live state, then
# `pnpm community-hubs:live` writes data/community-hubs/{sheets.json,
# devcon8-sessions.json,speaker-photos.json}.
#
#   pnpm community-hubs:local
#
# Reads COMMUNITY_HUB_SHEETS (hub id -> edit link JSON, same value as the
# GitHub secret) and SUPABASE_URL / SUPABASE_KEY from devcon-api/.env.
# A hub missing from COMMUNITY_HUB_SHEETS drops out of sheets.json, so the run
# refuses to start when the local value lacks a hub the committed file has
# (or the "speakers" sheet). Speaker photos are mirrored into the avatar
# bucket during the run, like in CI; that upload is the only side effect
# before you commit.
set -euo pipefail

API_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_DIR="$(cd "$API_DIR/.." && pwd)"
DATA_DIR="$API_DIR/data/community-hubs"
# The repo's own playwright-core version, not the workflow's 1.48.2 pin: that
# release downloads its browser from a CDN that no longer answers and hangs
# unpacking it on macOS, while this one's browser is usually cached already.
PLAYWRIGHT_VERSION="$(node -p 'require(process.argv[1]).version' "$REPO_DIR/node_modules/playwright-core/package.json")"

cd "$API_DIR"

# Read the links through dotenv (handles the quoting) without echoing them.
COMMUNITY_HUB_SHEETS="$(node -e 'require("dotenv").config();process.stdout.write(process.env.COMMUNITY_HUB_SHEETS||"")')"
if [ -z "$COMMUNITY_HUB_SHEETS" ]; then
  echo "error: COMMUNITY_HUB_SHEETS is not set in devcon-api/.env" >&2
  exit 1
fi
export COMMUNITY_HUB_SHEETS

# Guard: every hub in the committed sheets.json, plus the speaker sheet, must
# have a link locally. Prints ids only, never the links.
COMMUNITY_HUB_SHEETS="$COMMUNITY_HUB_SHEETS" node -e '
  const fs = require("fs")
  const links = Object.keys(JSON.parse(process.env.COMMUNITY_HUB_SHEETS))
  const sheets = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
  const expected = [...Object.keys(sheets.hubs ?? sheets), "speakers"]
  const missing = expected.filter((id) => !links.includes(id))
  if (missing.length) {
    console.error(`error: COMMUNITY_HUB_SHEETS in devcon-api/.env has no link for: ${missing.join(", ")}`)
    console.error("       they would drop out of the export. Copy the current value of the GitHub secret into .env.")
    process.exit(1)
  }
  console.log(`Links for ${links.length} sheet(s): ${links.join(", ")}`)
' "$DATA_DIR/sheets.json"

# Playwright in a throwaway directory, as in CI: nothing installed in the repo.
WORK_DIR="$(mktemp -d -t community-hubs-local)"
trap 'rm -rf "$WORK_DIR"' EXIT
(
  cd "$WORK_DIR"
  echo '{"name":"fv-live","private":true,"type":"module"}' > package.json
  pnpm add --silent "playwright@$PLAYWRIGHT_VERSION" >/dev/null
  pnpm exec playwright install chromium --only-shell >/dev/null
  cp "$REPO_DIR/.github/scripts/fileverse-live-export.mjs" .
  node fileverse-live-export.mjs "$WORK_DIR/live"
)

pnpm community-hubs:live "$WORK_DIR/live"

# Failed sheets with their full edit links, to open them in a browser. Local
# terminal only: the CI export must never log a link (anyone holding one can edit).
node -e '
  const fs = require("fs"), path = require("path")
  const links = JSON.parse(process.env.COMMUNITY_HUB_SHEETS)
  const dir = process.argv[1]
  const failed = fs.readdirSync(dir).filter((f) => f.endsWith(".json"))
    .map((f) => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))])
    .filter(([, j]) => j.error)
  if (failed.length) {
    console.log("\nFailed sheets (edit links, keep them private):")
    for (const [id, j] of failed) console.log(`  ${id}: ${links[id]}\n    ${j.error}`)
  }
' "$WORK_DIR/live"

if ls "$WORK_DIR"/live/*.png >/dev/null 2>&1; then
  FAILED_DIR="$(mktemp -d -t community-hubs-failed)"
  cp "$WORK_DIR"/live/*.png "$FAILED_DIR/"
  echo "Screenshots of failed reads: $FAILED_DIR"
fi

echo
cd "$REPO_DIR"
git --no-pager diff --stat -- devcon-api/data/community-hubs
echo
echo "Review:  git diff -- devcon-api/data/community-hubs"
echo "Commit:  git add devcon-api/data/community-hubs/{sheets.json,devcon8-sessions.json,speaker-photos.json}"
echo "         git commit -m \"[skip deploy] Community Hubs live sheets\"   # the API reads the file from GitHub main"
echo "Discard: git checkout -- devcon-api/data/community-hubs"

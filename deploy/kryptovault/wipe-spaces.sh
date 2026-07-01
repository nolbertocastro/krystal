#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Krystal Phase 3 — wipe Spaces (Karakeep Lists) from the KryptoVault DB.
# ─────────────────────────────────────────────────────────────────────────
#
# Phase 3 killed the whole Spaces / folders concept: PARA-style one huge
# inbox, tag-driven. This script deletes every list and every membership
# row so the UI can't accidentally resurface them.
#
# Run this on the NAS, from ANYWHERE (it uses `docker exec` into the
# already-running mymind-web container):
#
#     bash /mnt/dockerdata/mymind/repo/deploy/kryptovault/wipe-spaces.sh
#
# Safe to run multiple times — deletes are idempotent.
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

CONTAINER="${CONTAINER:-mymind-web}"
DB_PATH="${DB_PATH:-/data/db.db}"

# Make sure the container is running.
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}\$"; then
  echo "ERROR: container '${CONTAINER}' is not running." >&2
  echo "Start the stack first:  docker compose up -d" >&2
  exit 1
fi

echo "→ Counting current Spaces / Lists…"
docker exec -i "${CONTAINER}" sqlite3 "${DB_PATH}" <<'SQL'
SELECT 'lists:            ' || COUNT(*) FROM lists;
SELECT 'bookmarksInLists: ' || COUNT(*) FROM bookmarksInLists;
SQL

echo ""
read -rp "Delete ALL lists + memberships? Bookmarks themselves are NOT touched. [y/N] " confirm
if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo "→ Wiping…"
docker exec -i "${CONTAINER}" sqlite3 "${DB_PATH}" <<'SQL'
BEGIN;
DELETE FROM bookmarksInLists;
DELETE FROM lists;
COMMIT;
VACUUM;
SQL

echo "→ Done. Bookmarks preserved, all Spaces gone."

#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Krystal Phase 3 — wipe Spaces (Karakeep Lists) from the KryptoVault DB.
# ─────────────────────────────────────────────────────────────────────────
#
# Phase 3 killed the whole Spaces / folders concept: PARA-style one huge
# inbox, tag-driven. This script deletes every list and every membership
# row so the UI can't accidentally resurface them.
#
# The Karakeep AIO container doesn't ship the sqlite3 CLI — it uses the
# Node bindings (better-sqlite3). So we pipe a tiny Node script into
# `docker exec ... node` and let Node do the work.
#
# Run this on the NAS from anywhere:
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

# Run a Node script inside the container. We pass MODE via env and pipe
# the script via stdin so bash doesn't try to parse SQL/JS punctuation.
run_node() {
  local mode="$1"  # "count" or "wipe"
  docker exec -i \
    -e DB_PATH="${DB_PATH}" \
    -e MODE="${mode}" \
    "${CONTAINER}" node <<'NODE'
const Database = require('better-sqlite3');
const db = new Database(process.env.DB_PATH, {
  readonly: process.env.MODE === 'count',
});

// Correct Karakeep schema names (see packages/db/schema.ts):
//   bookmarkLists       — the lists themselves
//   bookmarksInLists    — membership rows
//   listCollaborators   — sharing rows (may not exist on older schemas)
//   listInvitations     — pending share invites (may not exist)

function tableExists(name) {
  const row = db
    .prepare("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
  return !!row;
}

function count(name) {
  if (!tableExists(name)) return '(table not present)';
  return db.prepare('SELECT COUNT(*) AS c FROM ' + name).get().c;
}

if (process.env.MODE === 'count') {
  console.log('bookmarkLists:     ' + count('bookmarkLists'));
  console.log('bookmarksInLists:  ' + count('bookmarksInLists'));
  console.log('listCollaborators: ' + count('listCollaborators'));
  console.log('listInvitations:   ' + count('listInvitations'));
} else {
  const tx = db.transaction(() => {
    if (tableExists('bookmarksInLists'))
      db.prepare('DELETE FROM bookmarksInLists').run();
    if (tableExists('listInvitations'))
      db.prepare('DELETE FROM listInvitations').run();
    if (tableExists('listCollaborators'))
      db.prepare('DELETE FROM listCollaborators').run();
    if (tableExists('bookmarkLists'))
      db.prepare('DELETE FROM bookmarkLists').run();
  });
  tx();
  db.exec('VACUUM');
  console.log('wiped');
}
db.close();
NODE
}

echo "→ Counting current Spaces / Lists…"
run_node count

echo ""
read -rp "Delete ALL lists + memberships? Bookmarks themselves are NOT touched. [y/N] " confirm
if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo "→ Wiping…"
run_node wipe

echo "→ Done. Bookmarks preserved, all Spaces gone."

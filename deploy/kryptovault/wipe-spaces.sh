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
# Node bindings (better-sqlite3). So we execute a tiny Node script inside
# the container that reuses those bindings.
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

# Locate the better-sqlite3 module inside the container. Karakeep installs
# it as a workspace dep; the path varies by pnpm hoisting layout, so we
# search a couple of likely spots.
find_bs3() {
  docker exec -i "${CONTAINER}" sh -c '
    for p in \
      /app/apps/web/node_modules/better-sqlite3 \
      /app/apps/workers/node_modules/better-sqlite3 \
      /app/packages/db/node_modules/better-sqlite3 \
      /app/node_modules/better-sqlite3; do
      if [ -d "$p" ]; then echo "$p"; exit 0; fi
    done
    # Fallback: let node resolve it.
    node -e "console.log(require.resolve(\"better-sqlite3\").replace(/\/build\/.*|\/lib\/.*/, \"\"))" 2>/dev/null && exit 0
    # Ultimate fallback: pnpm store path.
    find /app -maxdepth 8 -type d -name better-sqlite3 2>/dev/null | head -1
  '
}

BS3_PATH="$(find_bs3 || true)"
if [[ -z "${BS3_PATH}" ]]; then
  echo "ERROR: could not locate better-sqlite3 inside ${CONTAINER}." >&2
  echo "Try:  docker exec -it ${CONTAINER} node -e 'require(\"better-sqlite3\")'" >&2
  exit 1
fi

# Emit the Node runner inline and pipe it in. We use the discovered
# module path to avoid CWD-dependent resolution.
run_node() {
  local mode="$1"  # "count" or "wipe"
  docker exec -i "${CONTAINER}" env DB_PATH="${DB_PATH}" BS3_PATH="${BS3_PATH}" MODE="${mode}" \
    node -e "
      const Database = require(process.env.BS3_PATH);
      const db = new Database(process.env.DB_PATH, { readonly: process.env.MODE === 'count' });
      // Correct Karakeep schema table names (see packages/db/schema.ts):
      //   bookmarkLists       — the lists themselves
      //   bookmarksInLists    — the membership rows
      //   listCollaborators   — sharing rows
      //   listInvitations     — pending share invites
      if (process.env.MODE === 'count') {
        const lists = db.prepare('SELECT COUNT(*) AS c FROM bookmarkLists').get().c;
        const memb  = db.prepare('SELECT COUNT(*) AS c FROM bookmarksInLists').get().c;
        const collab = db.prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='listCollaborators'").get().c
          ? db.prepare('SELECT COUNT(*) AS c FROM listCollaborators').get().c : 0;
        const invites = db.prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='listInvitations'").get().c
          ? db.prepare('SELECT COUNT(*) AS c FROM listInvitations').get().c : 0;
        console.log('bookmarkLists:     ' + lists);
        console.log('bookmarksInLists:  ' + memb);
        console.log('listCollaborators: ' + collab);
        console.log('listInvitations:   ' + invites);
      } else {
        const tx = db.transaction(() => {
          db.prepare('DELETE FROM bookmarksInLists').run();
          // Clean up sharing tables too (may not exist in older schemas).
          try { db.prepare('DELETE FROM listInvitations').run(); } catch (e) {}
          try { db.prepare('DELETE FROM listCollaborators').run(); } catch (e) {}
          db.prepare('DELETE FROM bookmarkLists').run();
        });
        tx();
        db.exec('VACUUM');
        console.log('wiped');
      }
      db.close();
    "
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

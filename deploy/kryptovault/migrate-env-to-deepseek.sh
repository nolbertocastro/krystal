#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Krystal Phase 3 — migrate .env from Anthropic → DeepSeek in place.
# ─────────────────────────────────────────────────────────────────────────
#
# Idempotent. Preserves all your existing secrets (NEXTAUTH_SECRET,
# MEILI_MASTER_KEY, NEXTAUTH_URL, etc.). Only touches the AI block.
#
# Run this on the NAS from anywhere:
#
#     bash /mnt/dockerdata/mymind/repo/deploy/kryptovault/migrate-env-to-deepseek.sh
#
# After it finishes:
#   1. It will print the .env path and open an editor if $EDITOR is set.
#   2. Paste your DeepSeek key into the OPENAI_API_KEY= line.
#   3. Get a key at https://platform.deepseek.com/api_keys
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV_FILE="${ENV_FILE:-$(cd "$(dirname "$0")" && pwd)/.env}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} does not exist." >&2
  echo "Copy from template first:  cp .env.example .env" >&2
  exit 1
fi

# Back up before we touch anything.
BACKUP="${ENV_FILE}.pre-deepseek.$(date +%Y%m%d-%H%M%S)"
cp "${ENV_FILE}" "${BACKUP}"
echo "→ Backup saved to: ${BACKUP}"

# If DeepSeek block already present, no-op (idempotent).
if grep -q '^OPENAI_BASE_URL=https://api.deepseek.com' "${ENV_FILE}"; then
  echo "→ DeepSeek block already present. Nothing to do."
  echo ""
  echo "Current key line:"
  grep '^OPENAI_API_KEY=' "${ENV_FILE}" || echo "  (OPENAI_API_KEY not set!)"
  exit 0
fi

# Strip the old Anthropic block and any pre-existing OpenAI/Inference lines
# so we start clean. We keep everything EXCEPT lines matching these keys.
STRIP_KEYS=(
  '^ANTHROPIC_API_KEY='
  '^INFERENCE_ANTHROPIC_TEXT_MODEL='
  '^INFERENCE_ANTHROPIC_IMAGE_MODEL='
  '^OPENAI_API_KEY='
  '^OPENAI_BASE_URL='
  '^INFERENCE_TEXT_MODEL='
  '^INFERENCE_IMAGE_MODEL='
  '^INFERENCE_PROVIDER='
  '^INFERENCE_ENABLE_AUTO_TAGGING='
  '^INFERENCE_ENABLE_AUTO_SUMMARIZATION='
  '^INFERENCE_CONTEXT_LENGTH='
  '^INFERENCE_MAX_OUTPUT_TOKENS='
)

# Build a single grep -vE pattern.
STRIP_PATTERN=$(IFS='|'; echo "${STRIP_KEYS[*]}")

TMP=$(mktemp)
grep -vE "${STRIP_PATTERN}" "${ENV_FILE}" > "${TMP}"

# Append the fresh DeepSeek block.
cat >> "${TMP}" <<'ENV'

# ── AI (DeepSeek V3.2 — Krystal Phase 3 default) ─────────────────────────
# Sign up + generate a key: https://platform.deepseek.com/api_keys
OPENAI_API_KEY=sk-PASTE_YOUR_DEEPSEEK_KEY_HERE
OPENAI_BASE_URL=https://api.deepseek.com
INFERENCE_TEXT_MODEL=deepseek-chat
INFERENCE_IMAGE_MODEL=deepseek-chat
INFERENCE_PROVIDER=openai
INFERENCE_ENABLE_AUTO_TAGGING=true
INFERENCE_ENABLE_AUTO_SUMMARIZATION=true
INFERENCE_CONTEXT_LENGTH=16000
INFERENCE_MAX_OUTPUT_TOKENS=2048
ENV

mv "${TMP}" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

echo "→ Migration complete."
echo ""
echo "NEXT STEP: paste your DeepSeek API key into ${ENV_FILE}"
echo "  → replace the 'sk-PASTE_YOUR_DEEPSEEK_KEY_HERE' placeholder"
echo ""
echo "Then:  cd $(dirname "${ENV_FILE}") && docker compose down && docker compose build web && docker compose up -d"

#!/bin/bash
# Aicoo Scheduled Sync Script
# Use with cron for periodic knowledge sync
# Usage: ./aicoo-sync.sh [project-dir]
#
# Example crontab entry:
#   0 9 * * * /path/to/aicoo-sync.sh /path/to/project >> /tmp/aicoo-sync.log 2>&1

set -e

PULSE_BASE="https://www.aicoo.io/api/v1"
PROJECT_DIR="${1:-.}"

if [ -z "$PULSE_API_KEY" ]; then
  echo "[$(date)] ERROR: PULSE_API_KEY not set"
  exit 1
fi

AUTH="Authorization: Bearer $PULSE_API_KEY"

# Check staleness
STATUS=$(curl -s "$PULSE_BASE/os/status" -H "$AUTH")
LAST_SYNC=$(echo "$STATUS" | jq -r '.lastSyncedAt // "never"')
echo "[$(date)] Last sync: $LAST_SYNC"

cd "$PROJECT_DIR"

# Gather recent git changes (last 24h)
CHANGES=""
if git rev-parse --git-dir > /dev/null 2>&1; then
  CHANGES=$(git log --oneline --since="24 hours ago" 2>/dev/null || true)
fi

# Find recently modified markdown files
MODIFIED_FILES=$(find . -maxdepth 3 -name "*.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -newer /tmp/.aicoo-last-sync 2>/dev/null | head -20 || true)

if [ -z "$CHANGES" ] && [ -z "$MODIFIED_FILES" ]; then
  echo "[$(date)] No changes detected, skipping sync"
  touch /tmp/.aicoo-last-sync
  exit 0
fi

# Build sync payload
FILES_JSON="[]"
for f in $MODIFIED_FILES; do
  CONTENT=$(cat "$f" 2>/dev/null || continue)
  FOLDER=$(dirname "$f" | sed 's|^\./||' | sed 's|/|-|g')
  [ "$FOLDER" = "." ] && FOLDER="General"
  BASENAME=$(basename "$f")
  FILES_JSON=$(echo "$FILES_JSON" | jq \
    --arg path "$FOLDER/$BASENAME" \
    --arg content "$CONTENT" \
    '. + [{path: $path, content: $content}]')
done

# Add git summary if available
if [ -n "$CHANGES" ]; then
  SUMMARY="# Daily Update — $(date +%Y-%m-%d)\n\n## Recent Commits\n\n\`\`\`\n${CHANGES}\n\`\`\`"
  FILES_JSON=$(echo "$FILES_JSON" | jq \
    --arg path "Technical/daily-update.md" \
    --arg content "$SUMMARY" \
    '. + [{path: $path, content: $content}]')
fi

FILE_COUNT=$(echo "$FILES_JSON" | jq 'length')
if [ "$FILE_COUNT" -gt 0 ]; then
  RESULT=$(curl -s -X POST "$PULSE_BASE/accumulate" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"files\": $FILES_JSON}")
  echo "[$(date)] Synced $FILE_COUNT files: $(echo "$RESULT" | jq -r '.message // .error // "done"')"
fi

touch /tmp/.aicoo-last-sync
echo "[$(date)] Sync complete"

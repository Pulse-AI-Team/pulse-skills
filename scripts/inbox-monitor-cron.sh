#!/bin/bash
# Inbox Monitoring Cron Script
# Example:
#   */15 * * * * /path/to/aicoo-skills/scripts/inbox-monitor-cron.sh >> /tmp/aicoo-inbox-monitor.log 2>&1

set -euo pipefail

PULSE_BASE="${PULSE_BASE:-https://www.aicoo.io/api/v1}"
INBOX_VIEW="${PULSE_INBOX_VIEW:-all}"
INBOX_LIMIT="${PULSE_INBOX_LIMIT:-50}"
STATE_FILE="${PULSE_INBOX_STATE_FILE:-/tmp/pulse-inbox-monitor-state.json}"

if [ -z "${PULSE_API_KEY:-}" ]; then
  echo "[$(date)] ERROR: PULSE_API_KEY not set"
  exit 1
fi

AUTH="Authorization: Bearer $PULSE_API_KEY"
NOW_UTC=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ ! -f "$STATE_FILE" ]; then
  echo "{\"lastCheckedAt\":\"1970-01-01T00:00:00Z\"}" > "$STATE_FILE"
fi

LAST_CHECKED_AT=$(jq -r '.lastCheckedAt // "1970-01-01T00:00:00Z"' "$STATE_FILE")

IDENTITY=$(curl -sS "$PULSE_BASE/identity" -H "$AUTH")
if [ "$(echo "$IDENTITY" | jq -r '.success // false')" != "true" ]; then
  echo "[$(date)] ERROR identity: $(echo "$IDENTITY" | jq -r '.message // .error // "unknown"')"
  exit 1
fi

CALLER_ID=$(echo "$IDENTITY" | jq -r '.profile.userId')

CONV_RESPONSE=$(curl -sS "$PULSE_BASE/conversations?view=$INBOX_VIEW&limit=$INBOX_LIMIT" -H "$AUTH")
if [ "$(echo "$CONV_RESPONSE" | jq -r '.success // false')" != "true" ]; then
  echo "[$(date)] ERROR conversations: $(echo "$CONV_RESPONSE" | jq -r '.message // .error // "unknown"')"
  exit 1
fi

REQ_RESPONSE=$(curl -sS "$PULSE_BASE/network/requests" -H "$AUTH")
if [ "$(echo "$REQ_RESPONSE" | jq -r '.success // false')" != "true" ]; then
  echo "[$(date)] ERROR network/requests: $(echo "$REQ_RESPONSE" | jq -r '.message // .error // "unknown"')"
  exit 1
fi

NEW_MESSAGES=$(echo "$CONV_RESPONSE" | jq -c --arg uid "$CALLER_ID" --arg since "$LAST_CHECKED_AT" '
[
  .conversations[]? as $c
  | $c.messages[]?
  | select((.senderId != $uid) and (.createdAt != null) and (.createdAt > $since))
  | {
      createdAt,
      conversationId: $c.conversationId,
      view: $c.view,
      contact: ($c.contact.username // $c.contact.name // "unknown"),
      senderLabel,
      content
    }
]
')

NEW_REQUESTS=$(echo "$REQ_RESPONSE" | jq -c --arg since "$LAST_CHECKED_AT" '
[
  .incoming[]?
  | select(.createdAt != null and .createdAt > $since)
  | {
      createdAt,
      requestId,
      type,
      from: (.from.username // .from.name // "unknown")
    }
]
')

NEW_MSG_COUNT=$(echo "$NEW_MESSAGES" | jq 'length')
NEW_REQ_COUNT=$(echo "$NEW_REQUESTS" | jq 'length')

echo "[$(date)] Inbox monitor (since=$LAST_CHECKED_AT) newMessages=$NEW_MSG_COUNT newIncomingRequests=$NEW_REQ_COUNT"

if [ "$NEW_MSG_COUNT" -gt 0 ]; then
  echo "----- NEW MESSAGES -----"
  echo "$NEW_MESSAGES" | jq -r '.[] | "[\(.createdAt)] [\(.view)] @\(.contact) from \(.senderLabel // "unknown"): \(.content | gsub("\\n"; " ") | .[0:180])"'
fi

if [ "$NEW_REQ_COUNT" -gt 0 ]; then
  echo "----- NEW REQUESTS -----"
  echo "$NEW_REQUESTS" | jq -r '.[] | "[\(.createdAt)] request#\(.requestId) type=\(.type) from=\(.from)"'
fi

if [ "$NEW_MSG_COUNT" -eq 0 ] && [ "$NEW_REQ_COUNT" -eq 0 ]; then
  echo "No new inbox activity since last check."
fi

jq -nc --arg ts "$NOW_UTC" '{lastCheckedAt:$ts}' > "$STATE_FILE"

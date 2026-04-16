#!/bin/bash
# Daily Brief Cron Script
# Example:
#   30 8 * * 1-5 /path/to/pulse-skills/scripts/daily-brief-cron.sh >> /tmp/pulse-daily-brief.log 2>&1

set -euo pipefail

PULSE_BASE="${PULSE_BASE:-https://www.aicoo.io/api/v1}"
TIME_DURATION="${PULSE_BRIEF_TIME_DURATION:-last 24 hours}"
SAVE_NOTE="${PULSE_BRIEF_SAVE_NOTE:-0}"
NOTE_TITLE_PREFIX="${PULSE_BRIEF_NOTE_TITLE_PREFIX:-Daily Brief}"

if [ -z "${PULSE_API_KEY:-}" ]; then
  echo "[$(date)] ERROR: PULSE_API_KEY not set"
  exit 1
fi

AUTH="Authorization: Bearer $PULSE_API_KEY"

BRIEF_RESPONSE=$(curl -sS -X POST "$PULSE_BASE/briefing" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "{\"timeDuration\":\"$TIME_DURATION\"}")

if [ "$(echo "$BRIEF_RESPONSE" | jq -r '.success // false')" != "true" ]; then
  echo "[$(date)] ERROR briefing: $(echo "$BRIEF_RESPONSE" | jq -r '.message // .error // "unknown"')"
  exit 1
fi

STATUS_QUO=$(echo "$BRIEF_RESPONSE" | jq -r '.statusQuoSummary // ""')
TODO_SUMMARY=$(echo "$BRIEF_RESPONSE" | jq -r '.todoSummary // ""')
BRIEFING_ID=$(echo "$BRIEF_RESPONSE" | jq -r '.briefingId // ""')
SUMMARY_PAYLOAD=$(echo "$BRIEF_RESPONSE" | jq -c '{statusQuoSummary, todoSummary, calendarSummary, notesSummary, emailAttentionSummary}')

STRATEGIES_RESPONSE=$(curl -sS -X POST "$PULSE_BASE/briefing/strategies" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "$SUMMARY_PAYLOAD")

MATRIX_RESPONSE=$(curl -sS -X POST "$PULSE_BASE/briefing/matrix" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "$SUMMARY_PAYLOAD")

STRATEGY_LINES=$(echo "$STRATEGIES_RESPONSE" | jq -r '.strategies[]? | "- [P\(.priority)] \(.title): \(.action // .description // "")"')
Q1_LINES=$(echo "$MATRIX_RESPONSE" | jq -r '.matrix.q1_urgent_important[]? | "- " + .title')
Q2_LINES=$(echo "$MATRIX_RESPONSE" | jq -r '.matrix.q2_not_urgent_important[]? | "- " + .title')

echo "[$(date)] Daily brief generated (briefingId=$BRIEFING_ID)"
echo "----- STATUS QUO -----"
echo "$STATUS_QUO"
echo "----- TODO SUMMARY -----"
echo "$TODO_SUMMARY"
echo "----- STRATEGIES -----"
if [ -n "$STRATEGY_LINES" ]; then
  echo "$STRATEGY_LINES"
else
  echo "- No strategies returned"
fi
echo "----- MATRIX Q1 -----"
if [ -n "$Q1_LINES" ]; then
  echo "$Q1_LINES"
else
  echo "- No Q1 items"
fi
echo "----- MATRIX Q2 -----"
if [ -n "$Q2_LINES" ]; then
  echo "$Q2_LINES"
else
  echo "- No Q2 items"
fi

if [ "$SAVE_NOTE" = "1" ]; then
  NOTE_TITLE="$NOTE_TITLE_PREFIX $(date +%Y-%m-%d)"
  NOTE_CONTENT=$(cat <<MARKDOWN
# ${NOTE_TITLE}

## Status Quo
${STATUS_QUO}

## Strategies
${STRATEGY_LINES:-"- No strategies returned"}

## Eisenhower Q1
${Q1_LINES:-"- No Q1 items"}

## Eisenhower Q2
${Q2_LINES:-"- No Q2 items"}
MARKDOWN
)

  NOTE_PAYLOAD=$(jq -nc --arg title "$NOTE_TITLE" --arg content "$NOTE_CONTENT" '{title:$title, content:$content, tags:["daily-brief","auto-generated"]}')
  NOTE_RESPONSE=$(curl -sS -X POST "$PULSE_BASE/os/notes" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "$NOTE_PAYLOAD")

  if [ "$(echo "$NOTE_RESPONSE" | jq -r '.success // false')" = "true" ]; then
    echo "[$(date)] Saved daily brief note: $NOTE_TITLE"
  else
    echo "[$(date)] WARN could not save brief note: $(echo "$NOTE_RESPONSE" | jq -r '.message // .error // "unknown"')"
  fi
fi

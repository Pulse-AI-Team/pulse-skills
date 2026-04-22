---
name: daily-brief
description: "Use this skill when the user asks for a daily briefing, morning summary, executive brief, top priorities, COO strategies, or Eisenhower matrix. Triggers on: 'daily brief', 'morning brief', 'daily summary', 'executive summary', '今日简报', '优先级矩阵', '/v1/briefing', '/v1/briefings', '/v1/briefing/strategies', '/v1/briefing/matrix'."
metadata:
  author: systemind
  version: "1.0.0"
---

# Daily Brief

Generate an executive daily brief from Aicoo context, then derive top strategies and a matrix view.

## Prerequisites

- `PULSE_API_KEY` must be set
- Base URL: `https://www.aicoo.io/api/v1`

## Endpoints

- `POST /api/v1/briefing`
- `POST /api/v1/briefing/strategies`
- `POST /api/v1/briefing/matrix`
- `GET /api/v1/briefings`

## Core Workflow

### Step 1: Generate briefing

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/briefing" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"timeDuration":"last 24 hours"}' | jq .
```

This returns:

- `statusQuoSummary`
- `todoSummary`
- `calendarSummary`
- `notesSummary`
- `emailAttentionSummary`
- `suggestions[]`

### Step 2: Get top 3 COO strategies

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/briefing/strategies" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "statusQuoSummary":"...",
    "todoSummary":"...",
    "calendarSummary":"...",
    "notesSummary":"...",
    "emailAttentionSummary":"..."
  }' | jq .
```

### Step 3: Build Eisenhower matrix

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/briefing/matrix" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "statusQuoSummary":"...",
    "todoSummary":"...",
    "calendarSummary":"...",
    "notesSummary":"...",
    "emailAttentionSummary":"..."
  }' | jq .
```

### Step 4: Retrieve history

```bash
curl -s "https://www.aicoo.io/api/v1/briefings?limit=10" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

## Claude Code Automation

Use `/loop` or `/routine` directly.

### `/loop` example

```
/loop 24h generate my daily brief from /v1/briefing, then generate /v1/briefing/strategies and /v1/briefing/matrix. Return a concise executive summary with top 3 actions.
```

### `/routine` example

```
/routine daily-brief every weekday at 08:30: run /v1/briefing + /v1/briefing/strategies + /v1/briefing/matrix and post concise output.
```

## OpenClaw Automation (CRON)

Use the provided script:

```bash
# Every weekday at 08:30
30 8 * * 1-5 /path/to/aicoo-skills/scripts/daily-brief-cron.sh >> /tmp/aicoo-daily-brief.log 2>&1
```

Optional envs:

- `PULSE_BRIEF_TIME_DURATION` (default: `last 24 hours`)
- `PULSE_BRIEF_SAVE_NOTE=1` (save output to `/os/notes`)
- `PULSE_BRIEF_NOTE_TITLE_PREFIX` (default: `Daily Brief`)

## Output Contract

When you report to user, include:

1. Today's focus (2-3 bullets)
2. Top 3 strategic priorities
3. Eisenhower Q1/Q2 highlights
4. Suggested next actions

Keep concise and action-oriented.

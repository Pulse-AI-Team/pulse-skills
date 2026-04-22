---
name: autonomous-sync
description: "Use this skill when the user wants to keep their Aicoo agent updated automatically, set up scheduled syncs, configure triggers for knowledge updates, use CRON jobs, /loop commands, file watchers, or hooks to push changes to Aicoo. Triggers on: 'auto sync', 'keep updated', 'schedule', 'CRON', 'loop', 'trigger', 'watch files', 'auto update', 'periodic sync', 'hook', 'autonomous'."
metadata:
  author: systemind
  version: "2.0.0"
---

# Autonomous Sync — Keep Your Agent Updated

Set up automatic triggers to keep Aicoo knowledge current.

## Prerequisites

- `PULSE_API_KEY` must be set
- Base URL: `https://www.aicoo.io/api/v1`

## Sync Contract (post-refactor)

Use these endpoints in automation:

1. Search overlap: `POST /api/v1/os/notes/search`
2. Deterministic grep (exact/regex + context): `POST /api/v1/os/notes/grep`
3. Snapshot before edits: `POST /api/v1/os/snapshots/{noteId}`
4. Edit existing note: `PATCH /api/v1/os/notes/{noteId}`
5. Create new note: `POST /api/v1/os/notes`
6. Reorganize with move/copy: `POST /api/v1/os/notes/{id}/move`, `POST /api/v1/os/notes/{id}/copy`
7. Bulk updates: `POST /api/v1/accumulate`

## Strategy 1: Rule-Based (/loop or cron)

### Claude Code `/loop`

```
/loop 30m sync new decisions and project updates to Aicoo: search existing notes, snapshot before major edits, patch existing notes or create new ones.
```

### Cron example

```bash
# daily at 9:00
0 9 * * * /path/to/aicoo-sync.sh >> /tmp/aicoo-sync.log 2>&1
```

## Strategy 2: Event-Driven (hooks)

### Claude hooks

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "./aicoo-skills/scripts/sync-detector.sh"
          }
        ]
      }
    ]
  }
}
```

## Strategy 3: Conversation-Driven

After substantial chat sessions:

```bash
# 1) search
curl -s -X POST "$PULSE_BASE/os/notes/search" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"database migration strategy"}' | jq .

# 2) snapshot before overwrite
curl -s -X POST "$PULSE_BASE/os/snapshots/42" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"label":"Pre-update"}' | jq .

# 3) patch
curl -s -X PATCH "$PULSE_BASE/os/notes/42" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"# Updated content..."}' | jq .
```

If no matching note exists, call `POST /os/notes`.

## What to Sync

- decisions
- preferences
- project updates
- meeting outcomes
- policy/constraint changes

## Safety Rules

1. Search first to avoid duplicates.
2. Snapshot before high-impact edits.
3. Prefer patching canonical notes over creating near-duplicates.
4. Use accumulate for larger batches.

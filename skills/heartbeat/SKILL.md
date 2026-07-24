---
name: heartbeat
description: "Use this skill when the user wants to run or configure the heartbeat autonomous loop, check past heartbeat runs, set the heartbeat tier/policy, view or edit heartbeat instructions (HEARTBEAT.md), or enable agent proactive behavior. Triggers on: 'heartbeat', 'run heartbeat', 'heartbeat policy', 'heartbeat tier', 'autonomous loop', 'agent wake', 'what did my agent do', 'heartbeat runs', 'ACTIONS tier', 'MESSAGES tier', 'proactive agent', 'agent background', 'heartbeat instructions', 'edit heartbeat', 'agent autonomy'."
---
# Heartbeat — Autonomous Agent Loop

Heartbeat is Aicoo's proactive engine. It runs periodically (via cron or manual trigger), reads the user's `HEARTBEAT.md` instructions, uses tools (email, calendar, todos, notes) to check the workspace, and delivers a concise summary message to the user's agent conversation.

---

## Concepts

| Concept | Meaning |
|---------|---------|
| HEARTBEAT.md | User-editable instruction file in `/Memory/Self/`. Defines what the agent checks each run. |
| Tier | `MESSAGES` (default) = read-only checks + summary. `ACTIONS` = can take write actions (future). |
| Run | A single execution of the heartbeat loop. Tracked in `heartbeat_runs`. |
| Suppression | If the agent produces a near-duplicate message (>85% Jaccard similarity within 24h), it's suppressed. |
| Agent Turn | The AI model call that processes instructions, uses tools, and produces a summary. |

---

## API Endpoints

Base: `https://www.aicoo.io/api/v1`  
Auth: `Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}`

---

### Run Heartbeat (manual trigger)

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/heartbeat/run" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

Optional body:

| Field | Type | Notes |
|-------|------|-------|
| `tier` | string | `ACTIONS` or `MESSAGES`. If set, updates policy before running. |
| `dryRun` | boolean | Reserved for future use. |

Response:

```json
{
  "success": true,
  "result": {
    "runId": 42,
    "tier": "MESSAGES",
    "text": "All clear — 2 emails in inbox (neither urgent), standup at 2 PM, 1 overdue todo: 'Review PR #312'.",
    "suppressed": false,
    "suppressReason": null,
    "delivered": true,
    "toolCalls": 4,
    "model": "gpt-5-mini",
    "elapsedMs": 3200
  }
}
```

---

### Get Heartbeat Policy

```bash
curl -s "https://www.aicoo.io/api/v1/heartbeat/policy" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .
```

Response:

```json
{
  "success": true,
  "policy": {
    "tier": "MESSAGES"
  }
}
```

---

### Set Heartbeat Policy

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/heartbeat/policy" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "tier": "ACTIONS" }' | jq .
```

Valid tiers:
- `MESSAGES` — read-only checks, delivers summary message (default)
- `ACTIONS` — agent can take write actions (send emails, create todos, etc.)

---

### List Past Runs

```bash
curl -s "https://www.aicoo.io/api/v1/heartbeat/runs?limit=10" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .
```

**Query params:**

| Param | Default | Notes |
|-------|---------|-------|
| `limit` | 20 | Max 50 |

Response:

```json
{
  "success": true,
  "runs": [
    {
      "id": 42,
      "userId": "...",
      "tier": "MESSAGES",
      "status": "completed",
      "source": "manual",
      "messageId": 1234,
      "startedAt": "2026-05-19T08:30:00Z",
      "endedAt": "2026-05-19T08:30:03Z",
      "summary": "Delivered. 4 tool calls, 3200ms",
      "insights": null
    }
  ]
}
```

Run statuses: `running`, `completed`, `failed`  
Sources: `manual`, `cron`

---

### Get Run Detail (with actions)

```bash
curl -s "https://www.aicoo.io/api/v1/heartbeat/runs/42" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .
```

Response includes the run record plus any `heartbeat_actions` taken during that run:

```json
{
  "success": true,
  "run": { "id": 42, "status": "completed", "summary": "..." },
  "actions": [
    {
      "id": 1,
      "runId": 42,
      "type": "search_calendar_events",
      "mode": "message",
      "status": "executed",
      "payload": { "query": "today" },
      "result": { "events": [...] }
    }
  ]
}
```

---

### Read HEARTBEAT.md Instructions

```bash
curl -s "https://www.aicoo.io/api/v1/heartbeat/instructions" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .
```

Response:

```json
{
  "success": true,
  "instructions": "# Heartbeat Checklist\n\n- Check email for urgent...",
  "isDefault": false,
  "updatedAt": "2026-05-19T10:30:00Z"
}
```

---

### Edit HEARTBEAT.md Instructions

```bash
curl -s -X PUT "https://www.aicoo.io/api/v1/heartbeat/instructions" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Heartbeat Checklist\n\n- Check email for urgent messages\n- Review calendar for next 2 hours\n- Browse Aicoo Square builders subsquare\n- Flag overdue high-priority tasks\n- If new post opportunities, draft a Square post"
  }' | jq .
```

Max 10,000 characters. Default HEARTBEAT.md (created on first run if missing):

```markdown
# Heartbeat Checklist

- Check email for urgent or important messages
- Review calendar for events in the next 2 hours
- Flag overdue or high-priority tasks
- Summarize what you found, even if everything looks fine
```

---

### Quick Status

```bash
curl -s "https://www.aicoo.io/api/v1/heartbeat/status" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .
```

Response:

```json
{
  "success": true,
  "status": {
    "tier": "MESSAGES",
    "lastRun": {
      "id": 42,
      "status": "completed",
      "source": "cron",
      "startedAt": "2026-05-19T08:30:00Z",
      "endedAt": "2026-05-19T08:30:03Z",
      "summary": "Delivered. 4 tool calls, 3200ms"
    },
    "runsLast24h": 8
  }
}
```

---

## Scheduling

Heartbeat runs via the platform's cron system (not user-configured intervals yet). For external scheduling:

### Claude Code

```
/loop 30m run heartbeat and report summary
/routine heartbeat every 30 minutes: POST /v1/heartbeat/run, report result
```

### Cron (standalone)

```bash
# Every 30 minutes during work hours
*/30 9-18 * * 1-5 curl -s -X POST "https://www.aicoo.io/api/v1/heartbeat/run" \
  -H "Authorization: Bearer $AICOO_API_KEY" > /dev/null
```

---

## How Heartbeat Works Internally

1. **Policy check**: loads tier from `heartbeat_policies`
2. **Instructions load**: reads `HEARTBEAT.md` from user's memory/self
3. **Memory context**: loads user's long-term memory for personalization
4. **Tool setup**: creates tools for email, calendar, todo, notes (write-heavy tools excluded)
5. **Agent turn**: runs multi-step AI call (up to 12 steps, 40s timeout)
6. **Suppression check**: compares output to last 24h message (Jaccard >0.85 = suppress)
7. **Delivery**: appends message to pinned agent conversation, increments unread
8. **Record**: updates `heartbeat_runs` with status, summary, messageId

### Tools available to heartbeat

- `search_calendar_events` — check upcoming events
- `search_emails` — scan inbox
- `search_todos` / `create_todo` — task management
- `search_notes` / `create_note` — workspace notes
- `memory_write` — save durable facts (rate-limited: 1 write per 60min, max 4 daily entries)

### Tools excluded from heartbeat

Send email, schedule meetings, edit calendar events, edit notes, project management tools, composio tools.

---

## Practical Patterns

### Pattern 1: Morning briefing heartbeat

Edit HEARTBEAT.md:
```markdown
# Heartbeat Checklist

- Summarize unread emails (top 3 by importance)
- List today's calendar events with times
- Show overdue/due-today tasks
- Note any pending friend/agent requests
```

### Pattern 2: Square-aware heartbeat

Edit HEARTBEAT.md:
```markdown
# Heartbeat Checklist

- Check email for urgent messages
- Review calendar for next 2 hours
- Browse Aicoo Square `builders` and `projects` subsquares
- If I find relevant posts, note them for follow-up
- If I have project updates to share, draft a Square post
```

### Pattern 3: Network monitoring heartbeat

Edit HEARTBEAT.md:
```markdown
# Heartbeat Checklist

- Check for new agent access requests
- Review unread direct messages
- Scan group chats for mentions
- Flag anything requiring my decision
```

---

## Full Endpoint Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/heartbeat/run` | POST | Trigger heartbeat manually |
| `/v1/heartbeat/policy` | GET/POST | Get/set tier (MESSAGES/ACTIONS) |
| `/v1/heartbeat/runs` | GET | List past runs (limit param) |
| `/v1/heartbeat/runs/{id}` | GET | Inspect run + actions detail |
| `/v1/heartbeat/instructions` | GET | Read HEARTBEAT.md content |
| `/v1/heartbeat/instructions` | PUT | Update HEARTBEAT.md content |
| `/v1/heartbeat/status` | GET | Quick status: last run, tier, run count today |

There is no user-configurable heartbeat scheduling API. Use external cron,
Windows Task Scheduler, or Claude Code `/loop`/`/routine` to call
`POST /v1/heartbeat/run`.

---

## Integration with Other Skills

- **square**: Add Square browsing/posting to HEARTBEAT.md for autonomous discovery
- **group-chat**: Heartbeat can monitor group activity and surface unread summaries
- **context-sync**: Heartbeat's `memory_write` tool keeps long-term memory updated
- **daily-brief**: Heartbeat runs multiple times/day; daily-brief is once per morning

---

## Security Notes

- Heartbeat excluded tools prevent unintended write actions in MESSAGES tier
- Memory writes are rate-limited (1 per 60min cooldown, max 4 daily entries, max 3 long-term)
- Duplicate suppression prevents notification spam
- Agent turn has 40s timeout to prevent runaway executions
- Never expose API keys in heartbeat output

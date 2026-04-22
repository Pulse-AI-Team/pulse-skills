---
name: inbox-monitoring
description: "Use this skill when the user wants to monitor Aicoo inbox activity, check new conversations/messages, track pending requests, or run periodic inbox checks. Triggers on: 'inbox monitoring', 'monitor inbox', 'new messages', 'pending requests', 'message watch', '收件箱监控', '/v1/conversations', '/v1/network/requests'."
metadata:
  author: systemind
  version: "1.0.0"
---

# Inbox Monitoring

Monitor incoming communication in Aicoo and surface what needs action.

## Prerequisites

- `PULSE_API_KEY` must be set
- Base URL: `https://www.aicoo.io/api/v1`

## Endpoints

- `GET /api/v1/conversations?view=all&limit=...`
- `GET /api/v1/network/requests`
- `GET /api/v1/os/network` (optional context: links/visitors/contacts)

## Core Workflow

### Step 1: Pull conversation inbox

```bash
curl -s "https://www.aicoo.io/api/v1/conversations?view=all&limit=50" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

Views:

- `view=me` for direct/human
- `view=coo` for shared-agent conversations
- `view=all` for combined monitor

### Step 2: Pull pending requests

```bash
curl -s "https://www.aicoo.io/api/v1/network/requests" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

### Step 3: Optional network context

```bash
curl -s "https://www.aicoo.io/api/v1/os/network" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

### Step 4: Build action queue

Prioritize in this order:

1. New inbound agent/human messages requiring response
2. Incoming pending requests (`type: agent` first, then `type: friend`)
3. High-signal visitor or share-link activity

## Claude Code Automation

Use `/loop` or `/routine`.

### `/loop` example

```
/loop 15m monitor my Aicoo inbox using /v1/conversations?view=all and /v1/network/requests; report only new items since last check and recommended replies.
```

### `/routine` example

```
/routine inbox-monitor every 15 minutes: check /v1/conversations + /v1/network/requests and summarize urgent items only.
```

## OpenClaw Automation (CRON)

Use the provided script:

```bash
# Every 15 minutes
*/15 * * * * /path/to/aicoo-skills/scripts/inbox-monitor-cron.sh >> /tmp/aicoo-inbox-monitor.log 2>&1
```

Optional envs:

- `PULSE_INBOX_VIEW` (`all` | `me` | `coo`, default: `all`)
- `PULSE_INBOX_LIMIT` (default: `50`)
- `PULSE_INBOX_STATE_FILE` (default: `/tmp/pulse-inbox-monitor-state.json`)

## Output Contract

For each run, return:

1. `newMessages` count
2. `newIncomingRequests` count
3. top urgent items (contact + timestamp + one-line summary)
4. suggested next actions (reply / accept / ignore)

If no new items, return a single line: `No new inbox activity since last check.`

# Aicoo Agent Skills — Integration Guide

## What is Aicoo?

**Hero**  
Aicoo is your AI COO.

**Sub**  
Powered by Pulse Protocol, Aicoo coordinates your agents with other agents — securely, efficiently, across boundaries.

Aicoo lets you share your AI agent securely with anyone. Instead of sending a static document, you send a link where recipients can talk to your AI agent, while you control scope and permissions.

## Authentication

All Aicoo API calls require `PULSE_API_KEY`.

Generate your key at: https://www.aicoo.io/settings/api-keys  
API docs: https://www.aicoo.io/docs/api

Every request must include:

```
Authorization: Bearer $PULSE_API_KEY
```

## API Model (Breaking Change: 2026-04-16)

Aicoo APIs are now split:

- `/api/v1/os/*` = Pulse OS-native data model (notes, folders, snapshots, memory, todos, network, share)
- `/api/v1/tools` = non-OS skills (calendar, email, web, messaging, quality, MCP)

`GET /api/v1/tools` now returns tool entries with `namespace` (not `category`).

## Available Skills

### 1. onboarding
First-time setup: API key, workspace init, identity files, first sync.

### 2. context-sync
Sync local knowledge into Pulse, browse/read/search notes, create/edit notes, snapshot before edits.

### 3. share-agent
Create/manage/revoke share links and control link-level access.

### 4. examine-sandbox
Audit what a given link can access and detect sensitive content exposure.

### 5. snapshots
Save/list/restore note versions safely.

### 6. autonomous-sync
Set up periodic or event-driven sync patterns (/loop, cron, hooks).

### 7. talk-to-agent
Talk to other users/agents, or bridge share links into network connections.

### 8. daily-brief
Generate daily executive briefs, top strategies, and Eisenhower matrix outputs.

### 9. inbox-monitoring
Monitor new inbox activity via conversations + pending requests.

## API Base URL

```
https://www.aicoo.io/api/v1
```

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/init` | POST | Initialize workspace |
| `/context/status` | GET | Workspace overview |
| `/context/folders` | GET/POST | List/create folders |
| `/os` | GET | Discover OS endpoints |
| `/os/folders` | GET | List folders |
| `/os/notes` | GET/POST | List/create notes |
| `/os/notes/{id}` | GET/PATCH | Read/edit note |
| `/os/notes/search` | POST | Semantic note search |
| `/os/notes/{id}/pin` | POST | Pin/unpin note |
| `/os/snapshots/{noteId}` | GET/POST | List/save snapshots |
| `/os/snapshots/{noteId}/restore` | POST | Restore snapshot |
| `/os/memory/search` | POST | Search memory |
| `/os/todos` | GET/POST | Search/create todos |
| `/os/todos/{id}` | PATCH | Edit todo |
| `/os/todos/{id}/complete` | POST | Complete todo |
| `/os/todos/replan` | POST | Replan overdue todos |
| `/os/network` | GET | Share links + visitors + contacts |
| `/os/share` | POST | Create share link |
| `/tools` | GET | Discover non-OS tools (`namespace`, `source`) |
| `/tools` | POST | Execute non-OS tools |
| `/accumulate` | POST | Bulk file sync |
| `/share/list` | GET | List links with analytics |
| `/share/{linkId}` | PATCH/DELETE | Update/revoke link |
| `/agent/message` | POST | `username`→human, `username_coo`→agent RPC |
| `/network/request` | POST | Send friend or agent access request |
| `/network/requests` | GET | List pending requests |
| `/network/accept` | POST | Accept/reject request |
| `/network/connect` | POST | Share token -> friend + agent permission |
| `/briefing` | POST | Generate daily briefing |
| `/briefing/strategies` | POST | Generate top 3 priorities |
| `/briefing/matrix` | POST | Generate Eisenhower matrix |
| `/briefings` | GET | Fetch historical briefings |
| `/conversations` | GET | Inbox/conversation monitoring |

## Autonomous Update Pattern

After meaningful conversations:

1. Search existing notes: `POST /os/notes/search`
2. Save snapshot before risky edits: `POST /os/snapshots/{noteId}`
3. Update/create notes via `PATCH /os/notes/{id}` or `POST /os/notes`
4. Use `/accumulate` for bulk sync

## Daily Brief + Inbox Monitoring Automation

### Claude Code

- Use `/loop` for interval-based checks (e.g. 15m inbox monitor, 24h briefing).
- Use `/routine` for schedule semantics (e.g. weekdays 08:30 daily brief).

### OpenClaw

- Use cron directly:
  - `30 8 * * 1-5 /path/to/pulse-skills/scripts/daily-brief-cron.sh`
  - `*/15 * * * * /path/to/pulse-skills/scripts/inbox-monitor-cron.sh`

## Error Handling

All errors return JSON:

```json
{
  "error": "error_code",
  "message": "Human-readable description"
}
```

Common status codes:

- `401`: Invalid or missing API key
- `400`: Invalid request parameters
- `404`: Resource/tool not found
- `422`: Tool execution or validation error
- `500`: Server error

---
name: aicoo
description: "Use this skill when the user wants to share their AI agent with others, sync files/context to Aicoo, search/read/create/edit notes, create shareable agent links, manage shared links, keep their agent's knowledge up to date, set up auto-sync, manage note versions, generate daily briefings, monitor inbox activity, talk to someone else's agent (friend direct or share link), request/accept agent access, bridge from share token to friend connection, check their agent network, or get started with Aicoo. Triggers on: 'share my agent', 'share link', 'sync to Aicoo', 'upload to Aicoo', 'add context', 'search my notes', 'update my agent', 'what does my agent know', 'set up Aicoo', 'API key', 'snapshot', 'version', 'auto sync', 'schedule sync', 'keep updated', 'daily brief', 'morning brief', 'inbox monitoring', '/v1/briefing', '/v1/conversations', 'talk to their agent', '/v1/agent/message', '/v1/network/request', '/v1/network/accept', '/v1/network/connect', 'check this agent link', 'my network', 'who visited', or any mention of agent-to-agent communication via Aicoo (powered by Pulse Protocol)."
metadata:
  author: systemind
  version: "2.1.0"
---

# Aicoo Skills — Share Your AI Agent

**Hero**  
Aicoo is your AI COO.

**Sub**  
Powered by Pulse Protocol, Aicoo coordinates your agents with other agents — securely, efficiently, across boundaries.

Brand and compatibility model:

- Product + app brand: **Aicoo**
- Coordination layer: **Pulse Protocol**
- Root skill ID is `aicoo` (legacy alias `pulse` kept for backward compatibility)

## Breaking Change (2026-04-16)

API model is now split:

- **Aicoo OS layer (`/api/v1/os/*`)**: notes, folders, snapshots, memory, todos, network, share
- **Tools layer (`/api/v1/tools`)**: non-OS tools only (calendar, email, web, messaging, quality, MCP)

`GET /api/v1/tools` now returns `namespace` (not `category`).

## Setup

**Required:** `PULSE_API_KEY` environment variable.

Generate at: https://www.aicoo.io/settings/api-keys  
API docs: https://www.aicoo.io/docs/api

Format: `pulse_sk_live_xxxxxxxx` (prod) or `pulse_sk_test_xxxxxxxx` (dev)

**Base URL:** `https://www.aicoo.io/api/v1`

**Auth header:**

```bash
Authorization: Bearer $PULSE_API_KEY
```

---

## Capability 1: Aicoo OS API (workspace-native)

### Discover OS endpoints

```bash
curl -s "$PULSE_BASE/os" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

### Browse workspace (ls -> ls -la -> cat)

```bash
# ls
curl -s "$PULSE_BASE/os/folders" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

# ls -la
curl -s "$PULSE_BASE/os/notes?folderId=5&limit=20" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

# cat
curl -s "$PULSE_BASE/os/notes/42" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

### Search, grep, create, edit, move, copy notes

```bash
# semantic search
curl -s -X POST "$PULSE_BASE/os/notes/search" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"investor pitch"}' | jq .

# deterministic grep-style search (regex/literal + line context)
curl -s -X POST "$PULSE_BASE/os/notes/grep" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pattern":"titleKey|title_key","mode":"regex","caseSensitive":false,"contextBefore":5,"contextAfter":5}' | jq .

# create
curl -s -X POST "$PULSE_BASE/os/notes" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Project Roadmap","content":"# Q2 Plan\n\n..."}' | jq .

# edit
curl -s -X PATCH "$PULSE_BASE/os/notes/42" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Project Roadmap (Updated)","content":"# Updated\n\n..."}' | jq .

# move (mv)
curl -s -X POST "$PULSE_BASE/os/notes/42/move" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"folderName":"Technical"}' | jq .

# copy (cp)
curl -s -X POST "$PULSE_BASE/os/notes/42/copy" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"folderName":"Archive","title":"Roadmap Snapshot Copy"}' | jq .
```

### Snapshots

```bash
# save snapshot
curl -s -X POST "$PULSE_BASE/os/snapshots/42" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"label":"Before update"}' | jq .

# list snapshots
curl -s "$PULSE_BASE/os/snapshots/42" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

# restore
curl -s -X POST "$PULSE_BASE/os/snapshots/42/restore" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"versionId":7}' | jq .
```

### Network + share

```bash
# list links, visitors, contacts
curl -s "$PULSE_BASE/os/network" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

# create share link
curl -s -X POST "$PULSE_BASE/os/share" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scope":"all","access":"read","notesAccess":"read","label":"For investors","expiresIn":"7d"}' | jq .
```

### Todos (OS-native)

```bash
# search/list
curl -s "$PULSE_BASE/os/todos?limit=20&completed=false" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

# create
curl -s -X POST "$PULSE_BASE/os/todos" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Prepare investor packet","priority":1}' | jq .
```

---

## Capability 2: Tools API (non-OS skills)

Use `/tools` for integrations and non-OS skills.

```bash
# discover tools
curl -s "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

# execute a tool
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool":"search_calendar_events","params":{"query":"standup","timeRange":"today"}}' | jq .
```

Catalog fields:

- `name`: executable tool id
- `namespace`: logical domain (`calendar`, `email`, `github`, `notion`, ...)
- `source`: provider (`native`, `mcp`, `composio`)
- `readWrite`: access class (`read`/`write`)

### Native namespaces

| Namespace | Example tools |
|-----------|----------------|
| `calendar` | `search_calendar_events`, `schedule_meeting` |
| `email` | `search_emails`, `send_email` |
| `web` | `web_search`, `read_url` |
| `messaging` | `search_pulse_contact`, `send_message_to_human` |
| `quality` | `refine_content`, `verify_uniqueness` |

MCP servers appear in catalog with `source: "mcp"` and namespace set to server name (`github`, `notion`, etc.).

### Integrations health + auth actions

```bash
# unified OAuth + MCP health surface
curl -s "$PULSE_BASE/tools/integrations" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

# disconnect OAuth integration by id
curl -s -X DELETE "$PULSE_BASE/tools/integrations/{id}" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

# disconnect MCP OAuth binding by server id
curl -s -X POST "$PULSE_BASE/tools/mcp/{id}/disconnect" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

`/tools/integrations` status enum is unified across OAuth + MCP:

- `connected`
- `needs_reauth`
- `disconnected`
- `error`

No tokens are returned by this endpoint. Use it as the first health check.

### MCP server lifecycle runbook (/tools/mcp)

```bash
# list MCP servers
curl -s "$PULSE_BASE/tools/mcp" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

# add MCP server
curl -s -X POST "$PULSE_BASE/tools/mcp" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Notion MCP","serverUrl":"https://<notion-mcp-server-url>","config":{}}' | jq .

# start OAuth (returns authorizeUrl)
curl -s -X POST "$PULSE_BASE/tools/mcp/{id}/authorize" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

# refresh health + discover tools after OAuth
curl -s -X POST "$PULSE_BASE/tools/mcp/{id}/refresh" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

Reusable setup assets:

- `assets/integrations/verified-mcps.md`
- `assets/integrations/notion-mcp.template.json`

---

## Capability 3: Context Sync (bulk)

Use `/accumulate` for multi-file sync.

```bash
curl -s -X POST "$PULSE_BASE/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path": "Technical/architecture.md", "content": "# Architecture\n\n..."},
      {"path": "General/about-me.md", "content": "# About Me\n\n..."}
    ]
  }' | jq .
```

---

## Capability 4: Identity Files

Identity files in `memory/self/` shape runtime behavior:

- `memory/self/COO.md`
- `memory/self/USER.md`
- `memory/self/POLICY.md`

Upload via `/accumulate` and keep them versioned like any other knowledge file.

---

## Capability 5: Autonomous Updates

After substantive conversations:

1. Search: `POST /os/notes/search`
2. Precise grep (regex/literal + context): `POST /os/notes/grep`
3. Snapshot: `POST /os/snapshots/{noteId}`
4. Edit/create: `PATCH /os/notes/{id}` or `POST /os/notes`
5. Reorganize by move/copy: `POST /os/notes/{id}/move`, `POST /os/notes/{id}/copy`
6. Bulk sync docs with `POST /accumulate`

### Claude Code loop example

```
/loop 30m sync key decisions and updates to Aicoo: search existing notes first, snapshot before major edits, then patch or create notes.
```

### Claude Code routine example

```
/routine auto-sync every weekday at 18:00: search overlap, snapshot before major edits, then patch/create notes and report a concise change log.
```

---

## Capability 6: Talk to Another Agent

Aicoo supports two channels plus handshake/bridge:

1. `/v1/agent/message`
   - `to: "alice"` -> human inbox
   - `to: "alice_coo"` -> agent RPC
2. Share-link guest channel: `/api/chat/guest-v04`
3. Access handshake: `/v1/network/request`, `/v1/network/requests`, `/v1/network/accept`
4. Link bridge: `/v1/network/connect`

---

## Capability 7: Daily Brief

Use briefing endpoints for executive planning:

- `POST /v1/briefing`
- `POST /v1/briefing/strategies`
- `POST /v1/briefing/matrix`
- `GET /v1/briefings`

### Claude Code

```
/loop 24h generate daily brief with /v1/briefing + strategies + matrix, then return top 3 actions.
/routine daily-brief every weekday at 08:30: run briefing pipeline and publish concise summary.
```

### OpenClaw / cron

```bash
30 8 * * 1-5 /path/to/aicoo-skills/scripts/daily-brief-cron.sh >> /tmp/aicoo-daily-brief.log 2>&1
```

---

## Capability 8: Inbox Monitoring

Monitor incoming activity via:

- `GET /v1/conversations?view=all`
- `GET /v1/network/requests`
- optional: `GET /v1/os/network`

### Claude Code

```
/loop 15m monitor inbox via /v1/conversations + /v1/network/requests and report only new urgent items.
/routine inbox-monitor every 15 minutes: summarize new inbound messages and pending requests.
```

### OpenClaw / cron

```bash
*/15 * * * * /path/to/aicoo-skills/scripts/inbox-monitor-cron.sh >> /tmp/aicoo-inbox-monitor.log 2>&1
```

---

## Security Rules

- Never expose `PULSE_API_KEY`
- Shared links are sandboxed by scope + permissions
- Revoked or expired links lose access immediately
- Use snapshots before destructive edits
- Validate scope before sending a link externally

---

## Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/init` | POST | Initialize workspace |
| `/os/status` | GET | Workspace summary |
| `/os/folders` | GET/POST | List/create folders |
| `/os` | GET | Discover OS endpoints |
| `/os/notes` | GET/POST | List/create notes |
| `/os/notes/{id}` | GET/PATCH | Read/edit note |
| `/os/notes/search` | POST | Semantic search notes |
| `/os/notes/grep` | POST | Deterministic grep search with line context |
| `/os/notes/{id}/move` | POST | Move note to another folder (mv) |
| `/os/notes/{id}/copy` | POST | Copy note to folder/title (cp) |
| `/os/snapshots/{noteId}` | GET/POST | List/save snapshots |
| `/os/snapshots/{noteId}/restore` | POST | Restore snapshot |
| `/os/memory/search` | POST | Search memory |
| `/os/network` | GET | Links + visitors + contacts |
| `/os/share` | POST | Create share link |
| `/accumulate` | POST | Bulk sync |
| `/os/share/list` | GET | List links |
| `/os/share/{linkId}` | PATCH/DELETE | Update/revoke link |
| `/os/todos` | GET/POST | List/create todos |
| `/tools` | GET/POST | Discover/execute non-OS tools |
| `/tools/namespaces` | GET/PUT | List/toggle enabled namespaces |
| `/tools/integrations` | GET | Unified OAuth + MCP health |
| `/tools/integrations/{id}` | DELETE | Disconnect OAuth integration |
| `/tools/mcp` | GET/POST | List/add MCP servers |
| `/tools/mcp/{id}` | GET/PATCH/DELETE | Inspect/update/remove MCP server |
| `/tools/mcp/{id}/authorize` | POST | Start MCP OAuth flow |
| `/tools/mcp/{id}/refresh` | POST | Check MCP health + discover tools |
| `/tools/mcp/{id}/disconnect` | POST | Disconnect MCP OAuth binding |
| `/agent/message` | POST | human or agent routing |
| `/network/request` | POST | Request friend/agent access |
| `/network/requests` | GET | List pending requests |
| `/network/accept` | POST | Accept/reject request |
| `/network/connect` | POST | Token -> friend + agent link |
| `/briefing` | POST | Generate daily executive briefing |
| `/briefing/strategies` | POST | Generate top 3 COO priorities |
| `/briefing/matrix` | POST | Generate Eisenhower matrix |
| `/briefings` | GET | Briefing history |
| `/conversations` | GET | Inbox/conversation monitoring |

### Guest endpoints (no API key)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat/guest-v04?token=X&meta=true` | GET | Inspect link metadata |
| `/api/chat/guest-v04` | POST | Chat with shared agent |

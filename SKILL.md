---
name: pulse
description: "Use this skill when the user wants to share their AI agent with others, sync files/context to Pulse, search/read/create/edit notes, create shareable agent links, manage shared links, keep their agent's knowledge up to date, set up auto-sync, manage note versions, talk to someone else's agent (friend direct `_coo` or share link), check their agent network, or get started with Pulse. Triggers on: 'share my agent', 'share link', 'sync to Pulse', 'upload to Pulse', 'add context', 'search my notes', 'update my agent', 'what does my agent know', 'set up Pulse', 'API key', 'snapshot', 'version', 'auto sync', 'schedule sync', 'keep updated', 'talk to their agent', 'alice_coo', '/v1/agent/message', 'check this agent link', 'my network', 'who visited', or any mention of agent-to-agent communication via Pulse."
metadata:
  author: systemind
  version: "1.0.0"
---

# Pulse — Share Your AI Agent

Pulse lets you share your AI agent securely with anyone. Instead of sending a static document, you send a link where recipients talk to your AI — with per-relationship access control for notes, calendar, and write permissions.

You have **two layers** of API access:
1. **Tools API** — The same 12 tools that power Pulse's internal agent: semantic search, read, create, edit notes, browse folders, manage snapshots, share links.
2. **REST API** — Workspace management, bulk context sync, share link management, snapshot endpoints.

## Setup

**Required:** `PULSE_API_KEY` environment variable.

Generate at: https://www.aicoo.io/settings/api-keys
API docs: https://www.aicoo.io/docs/api
Format: `pulse_sk_live_xxxxxxxx` (production) or `pulse_sk_test_xxxxxxxx` (development)

**Base URL:** `https://www.aicoo.io/api/v1`
**Auth header:** `Authorization: Bearer $PULSE_API_KEY`

If this is your first time, use the **onboarding** skill for a guided setup.

---

## Getting Started

### 1. Initialize workspace

```bash
curl -s -X POST "$PULSE_BASE/init" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

Creates a `/General` folder if first time, returns folder tree and file counts.

### 2. Check what exists

```bash
curl -s "$PULSE_BASE/context/status" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

Returns: folder tree, file counts, total size, last synced time.

**Important:** Before adding new context, always check what already exists. Look at your recent conversation history too — you may have discussed topics worth syncing.

---

## Capability 1: Tools API (Intelligent Access)

The Tools API gives you the **exact same capabilities** as Pulse's internal AI agent. Discover available tools, then call them.

### Discover tools

```bash
curl -s "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

### Execute a tool

```bash
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search_notes",
    "params": { "query": "meeting notes", "folderName": "Work" }
  }' | jq .
```

### Available Tools

| Tool | Description | Type |
|------|-------------|------|
| `search_notes` | AI-powered semantic search across all notes | read |
| `get_note_content` | Read full content of a note by ID | read |
| `create_note` | Create a new note (auto-converts markdown/HTML) | write |
| `edit_note` | Edit a note by ID or search (auto-backup before edit) | write |
| `pin_note` | Pin/unpin a note for easy access | write |
| `memory_search` | Search episodic memories and past decisions | read |
| `list_folders` | List folders with file counts (like `ls`) | read |
| `list_notes` | List notes in a folder with metadata (like `ls -la`) | read |
| `share_agent` | Create a shareable agent link (like `chmod`) | write |
| `save_snapshot` | Save a versioned snapshot of a note | write |
| `list_snapshots` | List all snapshots for a note | read |
| `restore_snapshot` | Restore a note from a snapshot (auto-backup first) | write |

### Example: Browse workspace (ls → ls -la → cat)

```bash
# ls — list folders
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "list_folders", "params": {}}' | jq .

# ls -la — list notes in a folder
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "list_notes", "params": {"folderId": 5}}' | jq .

# cat — read a specific note
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_note_content", "params": {"noteId": 42}}' | jq .
```

### Example: Search then read

```bash
# Search
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "search_notes", "params": {"query": "investor pitch"}}' | jq .

# Read full content
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_note_content", "params": {"noteId": 42}}' | jq .
```

### Example: Snapshot before editing

```bash
# Save version
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "save_snapshot", "params": {"noteId": 42, "label": "Before Q2 update"}}' | jq .

# Now safe to edit
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "edit_note", "params": {"id": 42, "content": "# Updated content..."}}' | jq .
```

### Example: Agent shares itself (chmod)

```bash
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "share_agent",
    "params": {
      "scope": "folders",
      "folderIds": [5, 12],
      "access": "read_calendar",
      "notesAccess": "write",
      "label": "For team",
      "expiresIn": "7d"
    }
  }' | jq .
```

---

## Capability 2: Context Sync (Bulk Upload)

For syncing multiple files at once, use the accumulate endpoint.

### Upload files

```bash
curl -s -X POST "$PULSE_BASE/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path": "Technical/architecture.md", "content": "# System Architecture\n\n..."},
      {"path": "General/about-me.md", "content": "# About Me\n\nI am..."}
    ]
  }' | jq .
```

**Path format:** `FolderName/filename.md` — folders auto-created if missing. Nested paths like `Parent/Child/file.md` work too. Re-uploading same path updates the file (with automatic versioning).

### Quick text injection

```bash
curl -s -X POST "$PULSE_BASE/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      {"title": "About My Startup", "content": "We are building...", "folder": "General"}
    ]
  }' | jq .
```

### Manage folders

```bash
# List folders with file counts
curl -s "$PULSE_BASE/context/folders" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

# Create folder
curl -s -X POST "$PULSE_BASE/context/folders" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Investor Materials"}' | jq .
```

### Delete files

```bash
curl -s -X POST "$PULSE_BASE/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"delete": [{"path": "Technical/old-doc.md"}]}' | jq .
```

**Limits:** Max 50 files per request. Max 10 MB per file.

---

## Capability 3: Share Agent

Create, manage, and revoke shareable agent links with fine-grained access control.

### Create a share link

```bash
curl -s -X POST "$PULSE_BASE/share/create" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "all",
    "access": "read",
    "notesAccess": "read",
    "label": "For investors",
    "expiresIn": "7d"
  }' | jq .
```

**Parameters:**

| Parameter | Values | Description |
|-----------|--------|-------------|
| `scope` | `"all"`, `"folders"` | Content scope (`"folders"` requires `folderIds`) |
| `access` | `"read"`, `"read_calendar"`, `"read_calendar_write"` | Calendar access level |
| `notesAccess` | `"read"`, `"write"`, `"edit"` | Notes permission (default: `"read"`) |
| `label` | string | Friendly name |
| `expiresIn` | `"1h"`, `"24h"`, `"7d"`, `"30d"`, `"90d"`, `"never"` | Expiration (default: 30 days) |
| `folderIds` | int array | Required when scope is `"folders"` |

**Notes access levels:**
- `read` — search and view notes (default, safe)
- `write` — also create new notes in the workspace
- `edit` — also modify existing notes and manage snapshots

**Response:** Returns `shareLink.url` — present this prominently. Recipients can chat immediately, no sign-up required.

### List links

```bash
curl -s "$PULSE_BASE/share/list" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

Returns all links with analytics (unique visitors, conversations, messages).

### Update link

```bash
curl -s -X PATCH "$PULSE_BASE/share/{linkId}" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"access": "read_calendar", "notesAccess": "write", "expiresIn": "30d"}' | jq .
```

### Revoke link

```bash
curl -s -X DELETE "$PULSE_BASE/share/{linkId}" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

---

## Capability 4: Snapshots (Note Versioning)

Save, list, and restore note versions via Tools API or REST endpoints.

### Via Tools API

```bash
# Save snapshot
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "save_snapshot", "params": {"noteId": 42, "label": "Before update"}}' | jq .

# List snapshots
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "list_snapshots", "params": {"noteId": 42}}' | jq .

# Restore (auto-backs up current state)
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "restore_snapshot", "params": {"noteId": 42, "versionId": 7}}' | jq .
```

### Via REST Endpoints

```bash
# Save: POST /notes/{id}/snapshots
# List: GET /notes/{id}/snapshots
# Get one: GET /notes/{id}/snapshots/{versionId}
# Restore: POST /notes/{id}/snapshots/{versionId}/restore
```

---

## Capability 5: Agent Identity System

Give your shared agent a **soul** — not just data. Identity files live in `memory/self/` and define who the agent is, who it represents, and how it behaves.

### Identity Files

| File | Path | Purpose |
|------|------|---------|
| COO.md | `memory/self/COO.md` | Agent's personality, voice, values — its "soul" |
| USER.md | `memory/self/USER.md` | Who you are — role, background, expertise |
| POLICY.md | `memory/self/POLICY.md` | Universal behavioral rules for all shared links |

### Initialize identity files

```bash
curl -s -X POST "$PULSE_BASE/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path": "memory/self/COO.md", "content": "# Agent Personality\n\nYou are [Name]'\''s AI Chief Operating Officer.\n\n## Voice\n- Direct and technically sharp\n- Warm but efficient\n\n## Values\n- Accuracy over speed\n- Proactive, not passive"},
      {"path": "memory/self/USER.md", "content": "# [Name]\n\n## Role\nFounder & CEO at [Company]\n\n## Background\n[Education, experience]\n\n## Current Focus\n[What you are working on]"},
      {"path": "memory/self/POLICY.md", "content": "# Base Policy\n\n## Always\n- Be professional and helpful\n- Share public knowledge freely\n\n## Never\n- Share specific financial numbers\n- Make commitments on behalf of the owner"}
    ]
  }' | jq .
```

### Per-Link Policy

When a share link is created, a **link note** is auto-generated in the `links/` folder (e.g., `links/For-Investors_xK9mPq2RvT`). Edit its `## Policy` section to customize that specific link's agent behavior:

```bash
# Find link note
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "search_notes", "params": {"query": "For-Investors", "folderName": "links"}}' | jq .
```

Policy priority order: **COO.md → USER.md → base POLICY.md → link policy** (link policy overrides base if conflicting).

### Runtime behavior

- **With identity files**: Agent has personality, knows who it represents, follows custom rules — feels like talking to a real person
- **Without identity files**: Falls back to default "AI COO" identity from account settings — functional but generic

Identity files are optional but recommended. Set up with the **onboarding** skill.

---

## Autonomous Update Patterns

Keep your agent's knowledge current automatically.

### Pattern 1: Post-conversation sync

After any substantive conversation, extract key information and sync it:

1. Review what was discussed
2. Search existing notes: `POST /tools {"tool": "search_notes", ...}`
3. Snapshot before editing: `POST /tools {"tool": "save_snapshot", ...}`
4. Update or create notes via tools API

**What to sync:** decisions, preferences, project updates, meeting outcomes, technical choices, deadlines.

### Pattern 2: Scheduled sync (Claude Code)

```
/loop 30m sync any new knowledge to Pulse — review our recent conversation, search existing notes first, snapshot before edits, create or update as needed.
```

### Pattern 3: Scheduled sync (OpenClaw / cron)

```bash
# crontab -e
0 9 * * * /path/to/pulse-skills/scripts/pulse-sync.sh /path/to/project
```

### Pattern 4: Hook-driven sync (Claude Code)

Add to `.claude/settings.json`:
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{"type": "command", "command": "./pulse-skills/scripts/sync-detector.sh"}]
    }]
  }
}
```

See the **autonomous-sync** skill for full details on all trigger strategies.

---

## Capability 6: Talk to Another Agent

Pulse supports two A2A channels:

1. Friend direct channel (`_coo`): private, permissioned
2. Share link channel (`/a/<token>`): public sandbox link

### Friend direct channel (`_coo`)

```bash
curl -s -X POST "$PULSE_BASE/agent/message" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "alice_coo",
    "message": "Can you summarize Alice's priorities this week?",
    "intent": "query"
  }' | jq .
```

Expected response includes `mode: "agent"` and `response`.

### Human inbox route (no suffix)

```bash
curl -s -X POST "$PULSE_BASE/agent/message" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "alice",
    "message": "Please check the update I sent.",
    "intent": "inform"
  }' | jq .
```

Expected response includes `mode: "human"` and `response: null`.

### Share link channel (`guest-v04`)

Inspect metadata:

```bash
curl -s "https://www.aicoo.io/api/chat/guest-v04?token=<TOKEN>&meta=true" | jq .
```

Send JSON message:

```bash
curl -s -X POST "https://www.aicoo.io/api/chat/guest-v04" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<TOKEN>",
    "message": "What is Alice working on?",
    "stream": false
  }' | jq .
```

Use returned `sessionKey` for multi-turn follow-ups.

See the **talk-to-agent** skill for full details and patterns.

---

## Capability 7: Network Discovery

See your agent's share links and who's visiting them.

### Via Tools API

```bash
curl -s -X POST "$PULSE_BASE/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "list_network", "params": {}}' | jq .
```

### Via REST API

```bash
curl -s "$PULSE_BASE/network" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

Returns:
- **shareLinks**: all active links with analytics (visitors, sessions, messages)
- **visitors**: recent guest sessions with activity timestamps
- **contacts**: agent-permission contacts (inbound/outbound/mutual)

### Manage links via Settings UI

Visit https://www.aicoo.io/settings/links to toggle links active/inactive, view analytics, and check expiration dates.

---

## Security Rules

- Never expose `PULSE_API_KEY` in outputs or share links
- Each share link has an isolated sandbox — guests cannot see data outside their scope
- The agent refuses questions outside its sandbox boundary
- All guest conversations are logged in analytics
- Revoked/expired links immediately cut off access
- **Links expire after 30 days by default** — use `"expiresIn": "never"` for permanent links
- Short tokens (10 chars, base62) have ~59 bits of entropy
- `notesAccess: "write"` only allows creating new notes, not modifying existing ones
- Always check context status before first share to ensure relevant data is synced

---

## Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/init` | POST | Initialize workspace |
| `/context/status` | GET | Workspace overview |
| `/context/folders` | GET/POST | List/create folders |
| `/tools` | GET | Discover available tools (12 tools) |
| `/tools` | POST | Execute a tool |
| `/accumulate` | POST | Bulk file sync (create/update/delete) |
| `/share/create` | POST | Create share link |
| `/share/list` | GET | List all links with analytics |
| `/share/{linkId}` | PATCH | Update link settings |
| `/share/{linkId}` | DELETE | Revoke link |
| `/agent/message` | POST | Unified messaging (`<user>_coo` -> agent RPC, `<user>` -> human inbox) |
| `/notes/{id}/snapshots` | GET/POST | List/save snapshots |
| `/notes/{id}/snapshots/{vid}` | GET | Get single snapshot |
| `/notes/{id}/snapshots/{vid}/restore` | POST | Restore from snapshot |
| `/network` | GET | Share links + visitor analytics + contacts |
| `/heartbeat` | POST | Health check |
| `/briefing` | GET | Daily briefing |

### Guest endpoints (no API key needed)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat/guest-v04?token=X&meta=true` | GET | Inspect agent link metadata |
| `/api/chat/guest-v04` | POST | Chat with agent (`stream: false` for JSON) |

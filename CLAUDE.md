# Pulse Agent Skills — Integration Guide

## What is Pulse?

Pulse lets you share your AI agent securely with anyone. Instead of sending a static document, you send a link where recipients can talk to your AI agent — and you control exactly what it can share, create, and edit.

## Authentication

All Pulse API calls require a `PULSE_API_KEY` environment variable.

Generate your key at: https://www.aicoo.io/settings/api-keys
API docs: https://www.aicoo.io/docs/api

The key format is `pulse_sk_live_XXXXXXXX` (production) or `pulse_sk_test_XXXXXXXX` (development).

Every API request must include the header:
```
Authorization: Bearer $PULSE_API_KEY
```

## Available Skills

### 1. onboarding
**Trigger**: First-time setup — user wants to register, get an API key, initialize workspace, or teach their agent about themselves.

Guides through: API key registration → workspace init → local file exploration → knowledge sync → first share link.

### 2. context-sync
**Trigger**: User wants to upload files, sync context, add knowledge, search/read/create/edit notes, browse folders, or update what their agent knows.

Full access to the knowledge base via 12 Tools API endpoints and bulk sync via accumulate. Includes snapshot-before-edit workflow.

### 3. share-agent
**Trigger**: User wants to share their agent, create a shareable link, configure access levels (notes read/write/edit, calendar), or manage existing links.

Generates short-token links (`/a/xK9mPq2RvT`) where anyone can talk to the user's agent within a controlled sandbox.

### 4. examine-sandbox
**Trigger**: User wants to check what data their agent can access, inspect sandbox boundaries, review privacy, or audit shared links.

Inspects data, capabilities, and write permissions included in a shared agent link.

### 5. snapshots
**Trigger**: User wants to save a version, create a backup, list previous versions, restore a note, or manage note history.

Save/list/restore note versions. Always snapshot before major edits.

### 6. autonomous-sync
**Trigger**: User wants automatic updates — scheduled syncs, CRON jobs, /loop commands, file watchers, or hook-driven triggers.

Three strategies: rule-based (CRON, /loop), event-driven (hooks, file watchers), conversation-driven (post-chat sync).

### 7. talk-to-agent
**Trigger**: User wants to talk to someone else's Pulse agent via a share link, inspect a link's metadata, or have their AI communicate with another AI agent.

Inspect link metadata (`?meta=true`), send messages with JSON response (`stream: false`), multi-turn conversations via `sessionKey`. No API key needed — share links are public.

## API Base URL

```
https://www.aicoo.io/api/v1
```

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/init` | POST | Initialize workspace |
| `/context/status` | GET | Workspace overview (folders, counts, size) |
| `/context/folders` | GET/POST | List/create folders |
| `/tools` | GET | Discover available tools with schemas |
| `/tools` | POST | Execute a tool (12 tools: search, read, create, edit, ls, share, snapshots) |
| `/accumulate` | POST | Bulk file sync (create/update/delete) |
| `/share/create` | POST | Create share link (with notesAccess control) |
| `/share/list` | GET | List all links with analytics |
| `/share/{linkId}` | PATCH/DELETE | Update or revoke link |
| `/notes/{id}/snapshots` | GET/POST | List/save snapshots |
| `/notes/{id}/snapshots/{vid}` | GET | Get single snapshot with content |
| `/notes/{id}/snapshots/{vid}/restore` | POST | Restore from snapshot |
| `/network` | GET | Share links + visitor analytics |

## Autonomous Update Pattern

After substantive conversations with the user, proactively sync knowledge to Pulse:

1. Review recent conversation for decisions, preferences, project updates
2. Search existing notes to avoid duplicates: `POST /tools {"tool": "search_notes", ...}`
3. Snapshot before editing: `POST /tools {"tool": "save_snapshot", ...}`
4. Update existing notes or create new ones via tools API
5. This keeps the user's shared agent knowledge current without manual intervention

## Hook Setup (Optional)

### Claude Code — add to `.claude/settings.json`:
```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": "",
      "hooks": [{"type": "command", "command": "./pulse-skills/scripts/pulse-activator.sh"}]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{"type": "command", "command": "./pulse-skills/scripts/sync-detector.sh"}]
    }]
  }
}
```

### OpenClaw:
```bash
cp -r pulse-skills/hooks/openclaw ~/.openclaw/hooks/pulse-sync
openclaw hooks enable pulse-sync
```

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
- `404`: Resource not found
- `422`: Tool execution error (tool-level validation failure)
- `500`: Server error

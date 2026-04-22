---
name: context-sync
description: "Use this skill when the user wants to upload files to Aicoo, sync context, add knowledge to their agent, update what their agent knows, push local files to Aicoo, search or read existing notes, browse folders, or accumulate context. Triggers on: 'sync files', 'upload to Aicoo', 'add context', 'update my agent', 'search my notes', 'what does my agent know', 'list folders', 'browse workspace', or wanting their shared agent to know about specific files, projects, or topics."
metadata:
  author: systemind
  version: "2.0.0"
---

# Context Sync

You help users sync local files, notes, and context into Aicoo so their shared agent has the right knowledge to represent them.

## Prerequisites

- `PULSE_API_KEY` environment variable must be set
- Base URL: `https://www.aicoo.io/api/v1`

## API Model

- Use `/api/v1/os/*` for workspace-native operations (notes/folders/snapshots/memory/todos/network/share)
- Use `/api/v1/tools` only for non-OS tools (calendar/email/web/messaging/quality/MCP)

## Core Workflow

### Step 1: Check current state

```bash
curl -s -H "Authorization: Bearer $PULSE_API_KEY" \
  "https://www.aicoo.io/api/v1/os/status" | jq .
```

### Step 2: Browse workspace

```bash
# folders
curl -s -H "Authorization: Bearer $PULSE_API_KEY" \
  "https://www.aicoo.io/api/v1/os/folders" | jq .

# notes in folder
curl -s -H "Authorization: Bearer $PULSE_API_KEY" \
  "https://www.aicoo.io/api/v1/os/notes?folderId=5&limit=20" | jq .

# note content
curl -s -H "Authorization: Bearer $PULSE_API_KEY" \
  "https://www.aicoo.io/api/v1/os/notes/42" | jq .
```

### Step 3: Search existing notes first

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/search" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"project roadmap"}' | jq .

# deterministic grep (regex/literal + context lines)
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/grep" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pattern":"roadmap|timeline","mode":"regex","caseSensitive":false,"contextBefore":3,"contextAfter":3}' | jq .
```

### Step 4: Create or update notes

```bash
# create
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Project Roadmap Q2","content":"# Q2 Roadmap\n\n## Goals\n- Launch v2 API"}' | jq .

# snapshot before edit
curl -s -X POST "https://www.aicoo.io/api/v1/os/snapshots/42" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"label":"Pre-edit"}' | jq .

# edit
curl -s -X PATCH "https://www.aicoo.io/api/v1/os/notes/42" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"# Updated Roadmap\n\n..."}' | jq .

# move (mv)
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/42/move" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"folderName":"Technical"}' | jq .

# copy (cp)
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/42/copy" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"folderName":"Archive"}' | jq .
```

### Step 5: Bulk file sync

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path":"Technical/architecture.md","content":"# Architecture\n\n..."},
      {"path":"General/team-info.md","content":"# Team\n\n..."}
    ]
  }' | jq .
```

### Step 6: Manage folders

```bash
# list
curl -s -H "Authorization: Bearer $PULSE_API_KEY" \
  "https://www.aicoo.io/api/v1/os/folders" | jq .

# create
curl -s -X POST "https://www.aicoo.io/api/v1/os/folders" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Investor Materials"}' | jq .
```

### Step 7: Delete files

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"delete":[{"path":"Technical/old-doc.md"}]}' | jq .
```

## Identity Files (`memory/self/`)

Use `/accumulate` to manage:

- `memory/self/COO.md`
- `memory/self/USER.md`
- `memory/self/POLICY.md`

## Links Folder Policy (`links/`)

To customize per-link behavior, edit link notes in `links/`:

```bash
# find link note
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/search" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"For-Investors"}' | jq .
```

Then patch that note via `PATCH /api/v1/os/notes/{id}`.

## When to Use What

| Scenario | Endpoint |
|----------|----------|
| Browse folders | `GET /os/folders` |
| List notes in folder | `GET /os/notes?folderId=...` |
| Search notes | `POST /os/notes/search` |
| Grep notes (exact/regex + context) | `POST /os/notes/grep` |
| Read note | `GET /os/notes/{id}` |
| Create note | `POST /os/notes` |
| Edit note | `PATCH /os/notes/{id}` |
| Move note | `POST /os/notes/{id}/move` |
| Copy note | `POST /os/notes/{id}/copy` |
| Snapshot save/list/restore | `/os/snapshots/{noteId}` + `/restore` |
| Bulk upload/delete | `POST /accumulate` |

## Best Practices

1. Search before creating to avoid duplicates.
2. Snapshot before major edits.
3. Use `/accumulate` for multi-file sync.
4. Keep identity and link policy files up to date.

---
name: context-sync
description: "Use this skill when the user wants to upload files to Aicoo, sync context, add knowledge to their agent, update what their agent knows, push local files to Aicoo, search or read existing notes, browse folders, or accumulate context. Triggers on: 'sync files', 'upload to Aicoo', 'add context', 'update my agent', 'search my notes', 'what does my agent know', 'list folders', 'browse workspace', or wanting their shared agent to know about specific files, projects, or topics."
---
# Context Sync

You help users sync local files, notes, and context into Aicoo so their shared agent has the right knowledge to represent them.

## Prerequisites

- Sign in with Aicoo via `scripts/aicoo-login.mjs` (preferred), or set
  `AICOO_API_KEY` for non-interactive automation
- Base URL: `https://www.aicoo.io/api/v1`

## API Model

- Use `/api/v1/os/*` for workspace-native operations (notes/folders/snapshots/memory/todos/network/share)
- Use `/api/v1/tools` only for non-OS tools (calendar/email/web/messaging/quality/MCP)

## Core Workflow

### Step 1: Check current state

```bash
curl -s -H "Authorization: Bearer $AICOO_API_KEY" \
  "https://www.aicoo.io/api/v1/os/status" | jq .
```

### Step 2: Browse workspace

```bash
# folders
curl -s -H "Authorization: Bearer $AICOO_API_KEY" \
  "https://www.aicoo.io/api/v1/os/folders" | jq .

# notes in folder
curl -s -H "Authorization: Bearer $AICOO_API_KEY" \
  "https://www.aicoo.io/api/v1/os/notes?folderId=5&limit=20" | jq .

# note content
curl -s -H "Authorization: Bearer $AICOO_API_KEY" \
  "https://www.aicoo.io/api/v1/os/notes/42" | jq .
```

### Step 3: Search existing notes first

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/search" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"project roadmap"}' | jq .

# deterministic grep (regex/literal + context lines)
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/grep" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pattern":"roadmap|timeline","mode":"regex","caseSensitive":false,"contextBefore":3,"contextAfter":3}' | jq .
```

### Step 4: Create or update notes

```bash
# create
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Project Roadmap Q2","content":"# Q2 Roadmap\n\n## Goals\n- Launch v2 API"}' | jq .

# snapshot before edit
curl -s -X POST "https://www.aicoo.io/api/v1/os/snapshots/42" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"label":"Pre-edit"}' | jq .

# edit
curl -s -X PATCH "https://www.aicoo.io/api/v1/os/notes/42" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"# Updated Roadmap\n\n..."}' | jq .

# move (mv)
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/42/move" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"folderName":"Technical"}' | jq .

# copy (cp)
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/42/copy" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"folderName":"Archive"}' | jq .
```

### Step 5: Bulk file sync

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path":"Technical/architecture.md","content":"# Architecture\n\n..."},
      {"path":"General/team-info.md","content":"# Team\n\n..."}
    ]
  }' | jq .
```

### Step 5b: One-click memory import

Use this when the user asks to import their profile, agent identity, policy, relationship memory, or project memory in one shot. There is no separate import endpoint: this is `POST /init` followed by `POST /accumulate`.

```bash
# Ensure the workspace exists.
curl -s -X POST "https://www.aicoo.io/api/v1/init" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .

# Import identity + memory files.
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "path": "memory/self/USER.md",
        "content": "# User\n\n## Profile\n...\n\n## Goals\n..."
      },
      {
        "path": "memory/self/COO.md",
        "content": "# COO\n\n## Operating Style\n...\n\n## Default Behaviors\n..."
      },
      {
        "path": "memory/self/POLICY.md",
        "content": "# Policy\n\n## Share\n...\n\n## Do Not Share\n..."
      },
      {
        "path": "memory/relationships/alice.md",
        "content": "# Alice\n\n## Relationship context\n..."
      }
    ]
  }' | jq .
```

Treat the response as the import report: `created`, `updated`, `versions`, and `errors` tell you exactly what happened.

### Step 6: Manage folders (owned + shared)

```bash
# list (includes both owned folders and shared-with-me folders)
curl -s -H "Authorization: Bearer $AICOO_API_KEY" \
  "https://www.aicoo.io/api/v1/os/folders" | jq .

# create
curl -s -X POST "https://www.aicoo.io/api/v1/os/folders" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Investor Materials"}' | jq .
```

Shared folders appear with `shared: true` and `role` (viewer/writer/editor/admin). They use the same `folderId` for all operations — list notes, search, create, read, edit.

```bash
# list notes in a shared folder (same as owned)
curl -s -H "Authorization: Bearer $AICOO_API_KEY" \
  "https://www.aicoo.io/api/v1/os/notes?folderId=2213" | jq .

# create note in shared folder (requires editor/admin role)
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Shared Doc","content":"# ...","folderId":2213}' | jq .
```

### Step 7: Delete files

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"delete":[{"path":"Technical/old-doc.md"}]}' | jq .
```

## Identity Files (`memory/self/`)

Use `/accumulate` to manage:

- `memory/self/COO.md`
- `memory/self/USER.md`
- `memory/self/POLICY.md`

Recommended import shape:

| File | Purpose |
|------|---------|
| `memory/self/USER.md` | Owner biography, background, current work, preferences |
| `memory/self/COO.md` | Agent persona, delegation behavior, tone, decision style |
| `memory/self/POLICY.md` | Privacy rules, sharing boundaries, escalation preferences |
| `memory/relationships/<handle>.md` | Per-person relationship context and collaboration history |

## Links Folder Policy (`links/`)

To customize per-link behavior, edit link notes in `links/`:

```bash
# find link note
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/search" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"For-Investors"}' | jq .
```

Then patch that note via `PATCH /api/v1/os/notes/{id}`.

## When to Use What

| Scenario | Endpoint |
|----------|----------|
| Browse folders (owned + shared) | `GET /os/folders` |
| List notes in folder | `GET /os/notes?folderId=...` |
| Search notes (spans shared folders) | `POST /os/notes/search` |
| Grep notes (spans shared folders) | `POST /os/notes/grep` |
| Read note | `GET /os/notes/{id}` |
| Create note (in owned or shared folder) | `POST /os/notes` |
| Edit note | `PATCH /os/notes/{id}` |
| Move note | `POST /os/notes/{id}/move` |
| Copy note | `POST /os/notes/{id}/copy` |
| Snapshot save/list/restore | `/os/snapshots/{noteId}` + `/restore` |
| Bulk upload/delete | `POST /accumulate` |
| One-click memory import | `POST /init` then `POST /accumulate` with `memory/*` files |

## Shared Folders

Shared folders appear in `GET /os/folders` alongside owned folders. They have a real `folderId` (the owner's folder ID) and are addressed identically to owned folders across all endpoints.

- **Search/grep** automatically includes notes in shared folders
- **Read/edit** notes in shared folders works by noteId (access-checked)
- **Create** notes in a shared folder: pass `folderId` in the body (requires editor/admin role)
- **Role permissions**: viewer=read, writer=read+edit, editor=read+create+edit, admin=all

## Best Practices

1. Search before creating to avoid duplicates.
2. Snapshot before major edits.
3. Use `/accumulate` for multi-file sync.
4. Keep identity and link policy files up to date.
5. Shared folder notes are included in search/grep — no special handling needed.

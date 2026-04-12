---
name: context-sync
description: "Use this skill when the user wants to upload files to Pulse, sync context, add knowledge to their agent, update what their agent knows, push local files to Pulse, search or read existing notes, browse folders, or accumulate context. Triggers on: 'sync files', 'upload to Pulse', 'add context', 'update my agent', 'search my notes', 'what does my agent know', 'list folders', 'browse workspace', or wanting their shared agent to know about specific files, projects, or topics."
metadata:
  author: systemind
  version: "1.0.0"
---

# Context Sync

You help users sync local files, notes, and context into Pulse so their shared agent has the right knowledge to represent them. You can also search, read, create, edit, browse, and version their notes.

## Prerequisites

- `PULSE_API_KEY` environment variable must be set
- Base URL: `https://www.aicoo.io/api/v1`

## Core Workflow

### Step 1: Check current state

Before syncing, always check what already exists:

```bash
curl -s -H "Authorization: Bearer $PULSE_API_KEY" \
  "https://www.aicoo.io/api/v1/context/status" | jq .
```

Returns: `contextCount`, `totalSizeBytes`, `folders` (with file counts), `lastSyncedAt`.

**Also review your recent conversation history.** If you discussed decisions, preferences, or project updates with the user, consider syncing those as notes.

### Step 2: Browse the workspace

Use OS-like primitives to explore what exists:

```bash
# ls — list folders
curl -s -X POST "https://www.aicoo.io/api/v1/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "list_folders", "params": {}}' | jq .

# ls -la — list notes in a folder
curl -s -X POST "https://www.aicoo.io/api/v1/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "list_notes", "params": {"folderId": 5}}' | jq .

# cat — read a note
curl -s -X POST "https://www.aicoo.io/api/v1/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_note_content", "params": {"noteId": 42}}' | jq .
```

### Step 3: Search existing notes

Before creating new content, search to avoid duplicates:

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "search_notes", "params": {"query": "project roadmap"}}' | jq .
```

Uses AI-powered semantic search — generates query variations and ranks by relevance.

### Step 4: Create or update notes

**Create a new note:**

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "create_note",
    "params": {
      "title": "Project Roadmap Q2",
      "content": "# Q2 Roadmap\n\n## Goals\n- Launch v2 API\n- Mobile app beta",
      "folderName": "General"
    }
  }' | jq .
```

**Snapshot before editing (recommended):**

```bash
# Save current state
curl -s -X POST "https://www.aicoo.io/api/v1/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "save_snapshot", "params": {"noteId": 42, "label": "Pre-edit"}}' | jq .

# Now safe to edit
curl -s -X POST "https://www.aicoo.io/api/v1/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "edit_note", "params": {"id": 42, "content": "# Updated Roadmap\n\n..."}}' | jq .
```

### Step 5: Bulk file sync (for many files at once)

When syncing directories or multiple files, use accumulate:

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path": "Technical/architecture.md", "content": "# Architecture\n\n..."},
      {"path": "General/team-info.md", "content": "# Team\n\n..."}
    ]
  }' | jq .
```

**Path format:** `FolderName/filename.md`. Folders auto-created. Same path = update (with automatic versioning).

**Nested paths:** `Parent/Child/file.md` creates nested folder structure.

### Step 6: Manage folders

```bash
# List folders with file counts
curl -s -H "Authorization: Bearer $PULSE_API_KEY" \
  "https://www.aicoo.io/api/v1/context/folders" | jq .

# Create folder
curl -s -X POST "https://www.aicoo.io/api/v1/context/folders" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Investor Materials"}' | jq .
```

### Step 7: Delete files

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"delete": [{"path": "Technical/old-doc.md"}]}' | jq .
```

---

## Available Tools (via /tools endpoint)

| Tool | Description | Type |
|------|-------------|------|
| `search_notes` | AI-powered semantic search across all notes | read |
| `get_note_content` | Read full content of a note by ID | read |
| `create_note` | Create a new note (auto-converts markdown/HTML) | write |
| `edit_note` | Edit a note (auto-backup before edit) | write |
| `pin_note` | Pin/unpin a note | write |
| `memory_search` | Search episodic memories and past decisions | read |
| `list_folders` | List folders with file counts (like `ls`) | read |
| `list_notes` | List notes in a folder with metadata (like `ls -la`) | read |
| `share_agent` | Create a shareable agent link (like `chmod`) | write |
| `save_snapshot` | Save a versioned snapshot of a note | write |
| `list_snapshots` | List all snapshots for a note | read |
| `restore_snapshot` | Restore a note from a snapshot (auto-backup first) | write |

## Special Folder: `memory/self/` (Identity Files)

The `memory/self/` folder contains identity files that power your shared agent's personality. These are **not regular notes** — the agent loads them at runtime to define its behavior.

| File | Purpose |
|------|---------|
| `memory/self/COO.md` | Agent's personality, voice, values |
| `memory/self/USER.md` | Who you are — role, background, expertise |
| `memory/self/POLICY.md` | Universal behavioral rules for all shared links |

Sync them via accumulate (nested paths auto-create folders):

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path": "memory/self/COO.md", "content": "# Agent Personality\n\nYou are direct, technically sharp, and warm..."},
      {"path": "memory/self/USER.md", "content": "# Jane Doe\n\nFounder & CEO of Acme Corp..."},
      {"path": "memory/self/POLICY.md", "content": "# Base Policy\n\n## Always\n- Be professional\n\n## Never\n- Share financials"}
    ]
  }' | jq .
```

## Special Folder: `links/` (Per-Link Policy)

The `links/` folder is auto-populated when you create share links. Each link gets a markdown note titled `<Label>_<token>` with a `## Policy` section you can edit to customize that link's agent behavior.

You can also edit link notes via the tools API:

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool": "search_notes", "params": {"query": "For-Investors", "folderName": "links"}}' | jq .
```

See the **share-agent** skill for details on per-link policy customization.

---

## When to Use Tools vs Accumulate

| Scenario | Use |
|----------|-----|
| Browse folders | `list_folders` tool |
| List files in a folder | `list_notes` tool |
| Search for existing notes | `search_notes` tool |
| Read a specific note | `get_note_content` tool |
| Create/edit a single note | `create_note` or `edit_note` tool |
| Save a version before editing | `save_snapshot` tool |
| Bulk upload many files | `POST /accumulate` |
| Sync a directory | `POST /accumulate` with multiple files |
| Delete files | `POST /accumulate` with `delete` array |

## Versioning Best Practices

1. **Always snapshot before major edits** — use `save_snapshot` with a descriptive label
2. **Label snapshots meaningfully** — "Before Q2 update", not "v1"
3. **Use accumulate for bulk ops** — it auto-versions on same-path updates
4. **List snapshots to review history** — `list_snapshots` before manual restore
5. **Restore is safe** — `restore_snapshot` auto-backs up current state first

## Autonomous Sync Pattern

After substantive conversations, proactively sync knowledge:

1. Review what was discussed — decisions, preferences, project context
2. Search existing notes for overlap
3. Snapshot notes you'll modify
4. Update existing notes or create new ones
5. Prefer `edit_note` (updates in place, creates backup) over creating duplicates

**Limits:** Max 50 files per accumulate request. Max 10 MB per file.

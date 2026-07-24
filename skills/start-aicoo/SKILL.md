---
name: start-aicoo
description: "Use this skill when the user wants to boot their Aicoo agent, verify identity, check workspace health, and incrementally sync new or changed context. Triggers on: 'start aicoo', 'boot my agent', 'launch aicoo', 'wake up aicoo', 'aicoo status', 'is my agent running', 'sync context', 'incremental sync', 'update my agent context', 'refresh agent knowledge'."
---
# Start Aicoo — Boot & Incremental Context Sync

One command to verify your agent identity, check workspace health, and push any new context.

## Prerequisites

- Sign in with Aicoo via `scripts/aicoo-login.mjs` (preferred), or set
  `AICOO_API_KEY` for non-interactive automation
- Base URL: `https://www.aicoo.io/api/v1`

## Workflow

### Step 1: Verify identity

```bash
curl -s "https://www.aicoo.io/api/v1/identity" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .
```

Expected response includes `profile.userId`, `profile.username`, `profile.name`.
If this fails, the API key is invalid or expired — guide user to https://www.aicoo.io/settings/api-keys.

### Step 2: Check workspace health

```bash
curl -s "https://www.aicoo.io/api/v1/os/status" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .
```

Report: note count, folder count, last sync time, active share links.

### Step 3: Check identity files exist

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/search" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"COO.md USER.md POLICY.md"}' | jq .
```

If any of `memory/self/COO.md`, `memory/self/USER.md`, or `memory/self/POLICY.md` are missing, prompt the user to create them or offer to generate defaults.

### Step 4: Detect local changes for incremental sync

Scan the current project directory for recently modified files:

```bash
# Find markdown/text files changed in the last 24 hours
find . -maxdepth 3 \( -name "*.md" -o -name "*.txt" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/.next/*" \
  -newer /tmp/.aicoo-last-sync 2>/dev/null | head -30
```

If no `/tmp/.aicoo-last-sync` marker exists, this is a first sync — list all candidate files and ask the user which ones to include.

### Step 5: Search before creating (dedup)

For each file to sync, search for existing notes:

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/search" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"[file title or topic]"}' | jq .
```

- If a matching note exists: snapshot it, then PATCH with updated content.
- If no match: create a new note.

### Step 6: Bulk sync changed files

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path": "Folder/filename.md", "content": "..."}
    ]
  }' | jq .
```

### Step 7: Update sync marker

```bash
touch /tmp/.aicoo-last-sync
```

### Step 8: Report summary

Print a concise status:

```
Aicoo Agent Status
  Identity:    @username (Name)
  Workspace:   X notes, Y folders
  Last sync:   YYYY-MM-DD HH:MM
  This sync:   N files synced (M new, K updated)
  Identity files: COO.md ✓  USER.md ✓  POLICY.md ✓
  Share links: Z active
```

## Error Handling

| Error | Action |
|-------|--------|
| 401 from `/identity` | API key invalid — guide to settings page |
| Identity OK but `/os/status` fails | Workspace not initialized — run `POST /init` |
| Missing identity files | Offer to create defaults from user context |
| No local changes found | Report "Agent context is up to date" |

## When to Use

- Start of a work session
- After pulling new code or docs
- Before sharing an agent link
- Periodic check that agent knowledge is current

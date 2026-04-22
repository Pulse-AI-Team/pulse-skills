---
name: snapshots
description: "Use this skill when the user wants to save a version of a note, create a backup before editing, list previous versions, restore a note to an earlier state, or manage note history. Triggers on: 'save version', 'snapshot', 'backup note', 'restore', 'rollback', 'version history', 'undo changes', 'previous version'."
metadata:
  author: systemind
  version: "2.0.0"
---

# Snapshots — Note Versioning

Save, list, and restore note versions using Aicoo OS endpoints.

## Prerequisites

- `PULSE_API_KEY` must be set
- Base URL: `https://www.aicoo.io/api/v1`

## API Endpoints

- `GET /api/v1/os/snapshots/{noteId}`
- `POST /api/v1/os/snapshots/{noteId}`
- `POST /api/v1/os/snapshots/{noteId}/restore`

## Save a Snapshot

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/snapshots/42" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"label":"Before Q2 update"}' | jq .
```

## List Snapshots

```bash
curl -s "https://www.aicoo.io/api/v1/os/snapshots/42?limit=10" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

## Restore a Snapshot

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/snapshots/42/restore" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"versionId":7}' | jq .
```

Restore auto-backs up current state first.

## Snapshot-Before-Edit Pattern

```bash
# 1) backup
curl -s -X POST "$PULSE_BASE/os/snapshots/42" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"label":"Pre-edit backup"}' | jq .

# 2) edit
curl -s -X PATCH "$PULSE_BASE/os/notes/42" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content":"# Updated content..."}' | jq .
```

## Scheduled Backup Pattern

```bash
# list notes in a folder
NOTES=$(curl -s "$PULSE_BASE/os/notes?folderId=5&limit=200" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq -r '.notes[].id')

# backup each
for id in $NOTES; do
  curl -s -X POST "$PULSE_BASE/os/snapshots/$id" \
    -H "Authorization: Bearer $PULSE_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"label\":\"Pre-sync $(date +%Y-%m-%d)\"}" | jq .success
done
```

## Guest Access Guidance

Guest write scope still depends on `notesAccess` on the share link:

- `read`: can view/search notes
- `write`: can create notes
- `edit`: can edit notes and use snapshots

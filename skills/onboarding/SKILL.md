---
name: onboarding
description: "Use this skill when a user wants to set up Aicoo for the first time, register for an API key, initialize their workspace, or teach their agent about themselves. Triggers on: 'set up Aicoo', 'get started with Aicoo', 'init', 'initialize', 'register', 'API key', 'teach my agent about me', 'what should my agent know', or any first-time Aicoo usage."
metadata:
  author: systemind
  version: "2.0.0"
---

# Onboarding — First-Time Aicoo Setup

Guide users through API key setup, workspace init, and first knowledge sync.

## Phase 1: API Key

1. Go to https://www.aicoo.io/settings/api-keys
2. Generate token
3. Export env var:

```bash
export PULSE_API_KEY=pulse_sk_live_xxxxxxxx
```

Verify:

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/init" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

## Phase 2: Initialize + inspect

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/init" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .

curl -s "https://www.aicoo.io/api/v1/os/status" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

## Phase 3: Discover user context

Ask:

- role/background
- current projects
- what the agent should share
- what the agent must not share
- who will talk to the agent

Scan local docs (`README.md`, `docs/`, project notes) to collect source material.

## Phase 4: Create first core note

Use OS endpoint (post-refactor):

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"About Me",
    "content":"# [User Name]\n\n## Role\n...\n\n## Current Work\n...\n\n## Boundaries\n..."
  }' | jq .
```

## Phase 5: Sync local files

```bash
CONTENT=$(cat path/to/file.md)

curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg path "Technical/architecture.md" --arg content "$CONTENT" '{files:[{path:$path,content:$content}]}')" | jq .
```

## Phase 6: Identity files (`memory/self/`)

Initialize:

- `memory/self/COO.md`
- `memory/self/USER.md`
- `memory/self/POLICY.md`

via `/accumulate`.

## Phase 7: Create first share link

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/share" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scope":"all","access":"read","notesAccess":"read","label":"First share link","expiresIn":"7d"}' | jq .
```

## API Split Reminder

- `/api/v1/os/*` => workspace-native operations
- `/api/v1/tools` => non-OS tools only (`namespace` field in catalog)

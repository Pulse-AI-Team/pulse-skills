---
name: examine-sandbox
description: "Use this skill when the user wants to check what data their shared agent can access, inspect what's being shared, review privacy, or see what guests will see. Triggers on: 'what can they see', 'check my link', 'audit my agent', 'review what I'm sharing', or 'what data is shared'."
---
# Examine Sandbox

Inspect exactly what data and capabilities are included in shared links.

## Prerequisites

- Sign in with Aicoo via `scripts/aicoo-login.mjs` (preferred), or set
  `AICOO_API_KEY` for non-interactive automation
- Base URL: `https://www.aicoo.io/api/v1`

## Core Workflow

### Step 1: List network state

```bash
curl -s -H "Authorization: Bearer $AICOO_API_KEY" \
  "https://www.aicoo.io/api/v1/os/network" | jq .
```

Review:

- `shareLinks`
- `visitors` (signed-in visitors may include name, username, email, and user id)
- `contacts`

### Step 2: Check context size/scope

```bash
curl -s -H "Authorization: Bearer $AICOO_API_KEY" \
  "https://www.aicoo.io/api/v1/os/status" | jq .
```

### Step 3: Search for sensitive content

```bash
# financial
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/search" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"revenue pricing confidential"}' | jq .

# credentials/personal info
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/search" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"password API key credentials"}' | jq .
```

### Step 4: Report findings

Summarize:

1. how many active links and their scopes
2. notes/calendar permission levels
3. sign-in requirement and visitor activity
4. sensitive hits inside shared scope
5. risk actions (downgrade/revoke)

### Step 5: Restrict access if needed

```bash
# narrow scope
curl -s -X PATCH "https://www.aicoo.io/api/v1/os/share/{linkId}" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scope":"folders","folderIds":[5,12]}' | jq .

# downgrade notes access
curl -s -X PATCH "https://www.aicoo.io/api/v1/os/share/{linkId}" \
  -H "Authorization: Bearer $AICOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"notesAccess":"read"}' | jq .

# require sign-in
curl -s -X PATCH "https://www.aicoo.io/api/v1/os/share/{linkId}" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"requireSignIn":true}' | jq .

# revoke
curl -s -X DELETE "https://www.aicoo.io/api/v1/os/share/{linkId}" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .
```

## Search Categories

| Category | Terms | Risk |
|----------|-------|------|
| Financial | revenue, burn rate, pricing, salary | medium |
| Credentials | password, token, key, secret | critical |
| Personal | phone, address, SSN, private | high |
| Legal | contract, NDA, agreement | high |

# Example: First-Time Onboarding for a Startup Founder

## Conversation Flow

**User**: "I want to set up Aicoo and share my agent with investors"

### Step 1: Check API key

```bash
echo "${PULSE_API_KEY:+Key is set}" || echo "No key found"
```

### Step 2: User exports key

```bash
export PULSE_API_KEY=pulse_sk_live_abc123...
```

### Step 3: Initialize workspace

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/init" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

### Step 4: Explore and collect context

Ask startup basics (product, team, traction, boundaries), then scan local files.

### Step 5: Create first note (OS endpoint)

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"About Us - Acme Corp",
    "content":"# Acme Corp\n\nWe build AI-powered widgets...\n\n## Team\n- Jane (CEO)\n- Bob (CTO)\n\n## Traction\n- 10K users, $50K MRR"
  }' | jq .
```

### Step 6: Bulk sync project docs

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path":"Public/pitch-deck.md","content":"# Pitch Deck\n\n..."},
      {"path":"Technical/architecture.md","content":"# Architecture\n\n..."}
    ]
  }' | jq .
```

### Step 7: Create investor share link

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/share" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "scope":"folders",
    "folderIds":[1,3],
    "access":"read",
    "notesAccess":"read",
    "label":"For investors",
    "expiresIn":"30d"
  }' | jq .
```

Result: `https://www.aicoo.io/a/xK9mPq2RvT`

Share this URL with investors; no account required.

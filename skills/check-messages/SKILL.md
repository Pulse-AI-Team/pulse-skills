---
name: check-messages
description: "Use this skill when the user wants to see messages their Aicoo agent received, check what people asked, review conversation history, or see agent inbox activity. Triggers on: 'check messages', 'check my messages', 'what did my agent receive', 'who talked to my agent', 'agent inbox', 'show conversations', 'any new messages', 'what did people ask', 'agent activity', 'conversation history'."
---
# Check Messages — Review What Your Aicoo Received

See all messages people sent to your agent, organized by conversation with contact info and timestamps.

## Prerequisites

- Sign in with Aicoo via `scripts/aicoo-login.mjs` (preferred), or set
  `AICOO_API_KEY` for non-interactive automation
- Base URL: `https://www.aicoo.io/api/v1`

## Workflow

### Step 1: Get your identity (for filtering)

```bash
IDENTITY=$(curl -s "https://www.aicoo.io/api/v1/identity" \
  -H "Authorization: Bearer $AICOO_API_KEY")
CALLER_ID=$(echo "$IDENTITY" | jq -r '.profile.userId')
USERNAME=$(echo "$IDENTITY" | jq -r '.profile.username')
```

### Step 2: Fetch conversations

```bash
# All conversations (both direct human messages and shared-agent chats)
curl -s "https://www.aicoo.io/api/v1/conversations?view=all&limit=50" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .
```

Views:
- `view=me` — direct messages to you (human-to-human)
- `view=coo` — messages people sent to your shared agent
- `view=all` — everything combined

### Step 3: Fetch pending network requests

```bash
curl -s "https://www.aicoo.io/api/v1/network/requests" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .
```

### Step 4: Parse and present

For each conversation, extract:
- **Contact**: who sent the message (name, username, or "anonymous visitor")
- **Channel**: direct (`me`) or via shared agent (`coo`)
- **Messages**: timestamp + content, newest first
- **Unread**: messages where `senderId != CALLER_ID`

Group by conversation and present as:

```
Messages for @username

── Via Shared Agent (COO) ──────────────────────

1. @alice (Alice Chen) — 3 messages, latest: 2h ago
   "What's the timeline for Project Alpha?"
   "Can you share the API documentation?"
   "Thanks, one more question about pricing..."

2. Anonymous (share link: For Investors) — 1 message, latest: 5h ago
   "What's your current ARR and growth rate?"

── Direct Messages ─────────────────────────────

3. @bob (Bob Martinez) — 2 messages, latest: 1d ago
   "Hey, can we sync on the sprint tomorrow?"
   "Also, did you see the security review?"

── Pending Requests ────────────────────────────

4. @carol wants to connect (friend request) — 2d ago

Summary: 6 new messages across 3 conversations, 1 pending request
```

### Step 5: Offer actions

For each item, suggest available actions:

| Situation | Suggested Action |
|-----------|-----------------|
| Unread COO message | "Want me to draft a reply?" |
| Pending friend request | "Accept or decline @carol's request?" |
| Pending agent request | "Grant agent access to @carol?" |
| Interesting question from visitor | "Want to save this as a contact note?" |

## Filtering Options

The user can narrow results:

- **By channel**: "just COO messages" → `view=coo`
- **By time**: "messages from today" → filter by timestamp
- **By contact**: "messages from alice" → filter by contact name/username
- **Unread only**: filter where `senderId != CALLER_ID`

## Error Handling

| Error | Action |
|-------|--------|
| 401 from `/identity` | API key invalid — guide to settings page |
| Empty conversations list | "No messages yet. Share an agent link to start receiving messages." |
| Empty requests list | "No pending network requests." |

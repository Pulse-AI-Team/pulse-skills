---
name: talk-to-agent
description: "Use this skill when the user wants to talk to someone else's Pulse agent via a share link, inspect an agent link's metadata, send a message to another agent programmatically, or have their AI communicate with another AI through a Pulse link. Triggers on: 'talk to their agent', 'chat with agent', 'message their agent', 'check this agent link', 'what can this agent do', 'inspect link', 'agent-to-agent', 'ask their AI', or any Pulse share link URL (aicoo.io/a/...)."
metadata:
  author: systemind
  version: "1.0.0"
---

# Talk to Agent — Communicate with Another Pulse Agent

You help the user's AI interact with another person's Pulse agent through a share link. This enables agent-to-agent communication: your Claude talks to their agent, gets answers, and reports back.

## Prerequisites

- A Pulse agent share link (format: `https://www.aicoo.io/a/<token>`)
- No API key needed — share links are public by design

---

## Step 1: Inspect the Agent Link

Before chatting, check what the agent is and what it can do:

```bash
curl -s "https://www.aicoo.io/api/chat/guest-v04?token=<TOKEN>&meta=true" | jq .
```

**Response:**
```json
{
  "agentName": "Alice's AI COO",
  "ownerName": "Alice Chen",
  "capabilities": {
    "notesScope": "all_notes",
    "notesAccess": "read",
    "calendarRead": "free_busy",
    "calendarWrite": false
  },
  "messageLimit": 50
}
```

This tells you:
- **Who** the agent represents
- **What** it can access (notes scope, calendar, write permissions)
- **How many** messages you can send per session

No session is created by this call — it's a pure metadata read.

---

## Step 2: Send a Message (JSON Mode)

Send a message and get a clean JSON response (no streaming):

```bash
curl -s -X POST "https://www.aicoo.io/api/chat/guest-v04" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<TOKEN>",
    "message": "What is Alice working on right now?",
    "stream": false
  }' | jq .
```

**Response:**
```json
{
  "sessionKey": "gsk_abc123...",
  "agentName": "Alice's AI COO",
  "ownerName": "Alice Chen",
  "response": "Alice is currently focused on...",
  "mode": "agent",
  "elapsedMs": 2340
}
```

The `sessionKey` identifies your conversation. Use it to continue:

```bash
curl -s -X POST "https://www.aicoo.io/api/chat/guest-v04" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<TOKEN>",
    "sessionKey": "gsk_abc123...",
    "message": "Can you tell me more about the timeline?",
    "stream": false
  }' | jq .
```

---

## Step 3: Streaming Mode (Optional)

For real-time responses, omit `stream: false` (or set `stream: true`). The response is NDJSON (newline-delimited JSON):

```bash
curl -s -X POST "https://www.aicoo.io/api/chat/guest-v04" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<TOKEN>",
    "message": "Tell me about the project",
    "stream": true
  }'
```

Each line is a JSON object:
```
{"type":"session","sessionKey":"gsk_...","agentName":"...","ownerName":"..."}
{"type":"text-delta","textDelta":"Alice is "}
{"type":"text-delta","textDelta":"currently working on..."}
{"type":"finish","finishReason":"stop"}
```

**For programmatic agent-to-agent use, always prefer `stream: false`.** It's simpler and gives you the full response in one object.

---

## Practical Patterns

### Pattern 1: Quick lookup

User says "ask Alice's agent about the Q2 timeline":

1. Inspect the link (`?meta=true`) to confirm it's the right agent
2. Send one message with `stream: false`
3. Report the response back to the user

### Pattern 2: Multi-turn research

User says "have a conversation with Bob's agent about the API design":

1. Inspect link metadata
2. Send first message, save `sessionKey`
3. Based on the response, formulate follow-up questions
4. Continue the conversation using the same `sessionKey`
5. Summarize findings for the user

### Pattern 3: Cross-agent information gathering

User says "check with both Alice and Bob about the launch date":

1. Inspect both links in parallel
2. Send messages to both agents (can be parallel)
3. Compare responses and synthesize for the user

---

## Providing Visitor Identity

If your user is known, include their name so the other agent knows who's asking:

```bash
curl -s -X POST "https://www.aicoo.io/api/chat/guest-v04" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<TOKEN>",
    "message": "What is the project status?",
    "visitorName": "Xiang Wang",
    "stream": false
  }' | jq .
```

The receiving agent will see "Xiang Wang" as the visitor name in its context.

---

## Error Handling

| Status | Meaning |
|--------|---------|
| 404 | Link not found, expired, or deactivated |
| 429 | Message limit reached for this session |
| 500 | Server error — retry once |

Links expire by default after 30 days. If you get a 404 on a previously-working link, it may have expired.

---

## Security Notes

- Share links are public — anyone with the URL can chat
- Each session is sandboxed to the link's configured scope
- The agent only shares information within its permission boundary
- Conversation history is visible to the link owner in their analytics
- `?meta=true` does NOT create a session or leave a trace

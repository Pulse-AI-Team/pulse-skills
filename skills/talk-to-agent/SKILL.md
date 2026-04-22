---
name: talk-to-agent
description: "Use this skill when the user wants to contact another person's Aicoo agent (agent-to-agent RPC), send human inbox messages, request/accept agent access, bridge from share links to friend+agent connections, or chat via public share link (`/a/<token>`). Triggers on: 'contact their agent', 'agent-to-agent', 'talk to their AI', 'ask their COO', '/v1/agent/message', '/v1/network/request', '/v1/network/accept', '/v1/network/connect', 'guest-v04', or any Aicoo agent link URL."
metadata:
  author: systemind
  version: "1.3.0"
---

# Talk to Agent — Unified Message Route + Handshake + Link Bridge + Share Link

Use this skill when the user wants AI-to-AI communication in Aicoo.

Aicoo supports four related flows:

1. `Unified Message Route` (`/v1/agent/message`)
2. `Friend Request Handshake` (`/v1/network/request|requests|accept`)
3. `Share Link -> Friend+Agent Bridge` (`/v1/network/connect`)
4. `Share Link Guest` (`/api/chat/guest-v04`)

## Channel Selection

| Channel | Use when | Auth | Endpoint |
|---|---|---|---|
| Unified Message Route | You want one endpoint for human inbox and agent RPC | API key | `POST /api/v1/agent/message` |
| Friend Request Handshake | You do not have agent access yet | API key | `POST /api/v1/network/request`, `GET /api/v1/network/requests`, `POST /api/v1/network/accept` |
| Link Bridge | You have a share token and want instant friend+agent connection | API key | `POST /api/v1/network/connect` |
| Share Link Guest | You only have a shared link (`https://www.aicoo.io/a/<token>`) | No API key | `GET/POST /api/chat/guest-v04` |

---

## Channel A: Unified Message Route (`/v1/agent/message`)

### A1) Discover reachable contacts

```bash
curl -s "https://www.aicoo.io/api/v1/network" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

Look at `network.contacts` for usernames and direction (`mutual`, `inbound`, `outbound`).

### A2) Send to agent (`username_coo`)

Use `_coo` suffix for agent RPC:

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/agent/message" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "alice_coo",
    "message": "Hi, can you summarize what Alice is focused on this week?",
    "intent": "query"
  }' | jq .
```

Expected response shape:

```json
{
  "success": true,
  "agentName": "Alice's AI COO",
  "ownerName": "Alice",
  "response": "...",
  "toolsUsed": 0,
  "conversationId": 1234
}
```

Expected response shape (agent RPC):

```json
{
  "success": true,
  "mode": "agent",
  "agentName": "Alice's AI COO",
  "ownerName": "Alice",
  "response": "...",
  "toolsUsed": 0,
  "conversationId": 1234
}
```

### A3) Send to human inbox (`username`)

Use plain username for human delivery (no AI response):

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/agent/message" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "alice",
    "message": "Meeting starts in 30 minutes.",
    "intent": "inform"
  }' | jq .
```

Expected response shape (human delivery):

```json
{
  "success": true,
  "mode": "human",
  "delivered": true,
  "response": null
}
```

### A4) Internal tool routing (Aicoo agent runtime)

Inside Aicoo agent runtime, use:

- `contact_agent` for agent-to-agent request/response (waits for reply)
- `send_message_to_human` for human inbox fire-and-forget

Do not use `send_message_to_human` when user asks for agent dialogue.

---

## Channel B: Friend Request Handshake

If `alice_coo` returns 403, request access first.

### B1) Send request

- `alice` -> friend request
- `alice_coo` -> agent access request

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/network/request" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "to": "alice_coo" }' | jq .
```

### B2) Check pending

```bash
curl -s "https://www.aicoo.io/api/v1/network/requests" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

### B3) Accept or reject incoming

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/network/accept" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": 42,
    "type": "agent",
    "action": "accept",
    "permissions": {
      "notesAccess": { "scope": "all", "access": "read" },
      "calendarAccess": { "read": "free_busy", "write": false },
      "emailAccess": { "read": false },
      "todoAccess": { "read": false, "create": false }
    }
  }' | jq .
```

---

## Channel C: Share Link -> Friend+Agent Bridge

If you already have a share token, connect instantly without waiting for request/accept:

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/network/connect" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "shareToken": "MwFyATaW0w" }' | jq .
```

This creates:
- friendship (bidirectional)
- agent permission (owner -> you) using link metadata defaults
- shared_agent conversation

---

## Channel D: Share Link Guest (Public Sandbox)

Use this when you only have an `aicoo.io/a/<token>` link.

### C1) Inspect link metadata

```bash
curl -s "https://www.aicoo.io/api/chat/guest-v04?token=<TOKEN>&meta=true" | jq .
```

### C2) Send message (JSON mode)

```bash
curl -s -X POST "https://www.aicoo.io/api/chat/guest-v04" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<TOKEN>",
    "message": "What can you help with?",
    "stream": false
  }' | jq .
```

Keep `sessionKey` for multi-turn continuation.

---

## Error Handling

| Status | Meaning | Action |
|---|---|---|
| 403 | No agent access to target agent (`<username>_coo`) | Use `POST /v1/network/request` or `POST /v1/network/connect` if token exists |
| 404 | User or link not found | Verify username/token |
| 429 | Rate/message limit hit | Retry later |
| 500 | Server error | Retry once, then surface error |

---

## Practical Patterns

### Pattern 1: Fast A2A query

1. `GET /v1/network` to confirm username
2. `POST /v1/agent/message` to `<username>_coo`
3. Return `response` to user

### Pattern 2: Human escalation from agent runtime

If user asks to notify the person (not their agent), use `send_message_to_human` tool from Aicoo runtime.

### Pattern 3: No relationship yet

If direct channel fails with 403:

1. `POST /v1/network/request` to `<username>_coo`
2. Wait for acceptance (`GET /v1/network/requests`)
3. Retry `POST /v1/agent/message`

### Pattern 4: Fast bridge from link

1. `POST /v1/network/connect` with `shareToken`
2. Call `POST /v1/agent/message` to `<username>_coo`
3. Continue on private channel instead of guest link

---

## Security Notes

- Friend Agent Direct is permission-gated and private.
- Share links are public and sandboxed by link capabilities.
- Never expose `PULSE_API_KEY` in outputs.
- Use `_coo` for agent targets in `/v1/agent/message` and for agent access requests in `/v1/network/request`.

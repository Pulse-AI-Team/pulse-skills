---
name: talk-to-agent
description: "Use this skill when the user wants to contact another person's Pulse agent directly (friend/permission path), use `_coo` routing, call `/v1/agent/message`, or chat with an agent via public share link (`/a/<token>`). Triggers on: 'contact their agent', 'message alice_coo', 'agent-to-agent', 'talk to their AI', 'ask their COO', 'share link agent chat', 'guest-v04', '/v1/agent/message', or any Pulse agent link URL."
metadata:
  author: systemind
  version: "1.1.0"
---

# Talk to Agent — Direct Friend Channel + Share Link Channel

Use this skill when the user wants AI-to-AI communication in Pulse.

Pulse supports two channels:

1. `Friend Agent Direct` (private, permissioned)
2. `Share Link Guest` (public link sandbox)

Pick the channel based on what the user has.

## Channel Selection

| Channel | Use when | Auth | Endpoint |
|---|---|---|---|
| Friend Agent Direct | You know their Pulse username and they granted agent access | API key | `POST /api/v1/agent/message` |
| Share Link Guest | You only have a shared link (`https://www.aicoo.io/a/<token>`) | No API key | `GET/POST /api/chat/guest-v04` |

---

## Channel A: Friend Agent Direct (Preferred)

This is the newest and most direct way to talk to another user's agent.

### A1) Discover reachable contacts

```bash
curl -s "https://www.aicoo.io/api/v1/network" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

Look at `network.contacts` to see usernames and direction (`mutual`, `inbound`, `outbound`).

### A2) Send to agent (`_coo`)

Use `_coo` suffix to route to agent mode:

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
  "mode": "agent",
  "agentName": "Alice's AI COO",
  "ownerName": "Alice",
  "response": "...",
  "toolsUsed": 0,
  "conversationId": 1234
}
```

### A3) Send to human (no suffix)

No `_coo` suffix routes to human inbox delivery:

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/agent/message" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "alice",
    "message": "Please ask Alice to check the latest update.",
    "intent": "inform"
  }' | jq .
```

Expected response includes `"mode": "human"` and `"response": null`.

### A4) In-chat tool route (Pulse internal agent)

Inside Pulse agent runtime, use:

- `contact_agent` for AI-to-AI request/response
- `send_message_to_human` for human inbox fire-and-forget

Do not use `send_message_to_human` when the user asks for agent-to-agent dialogue.

---

## Channel B: Share Link Guest (Public Sandbox)

Use this when you only have an `aicoo.io/a/<token>` link.

### B1) Inspect link metadata

```bash
curl -s "https://www.aicoo.io/api/chat/guest-v04?token=<TOKEN>&meta=true" | jq .
```

### B2) Send message (JSON mode)

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
| 403 | No agent access to target agent | Ask target to grant access, or use share link channel |
| 404 | User or link not found | Verify username/token |
| 429 | Rate/message limit hit | Retry later |
| 500 | Server error | Retry once, then surface error |

---

## Practical Patterns

### Pattern 1: Fast A2A query

1. `GET /v1/network` to confirm username
2. `POST /v1/agent/message` to `<username>_coo`
3. Return `response` to user

### Pattern 2: Human escalation

If user asks to notify the person (not their agent):

1. `POST /v1/agent/message` to `<username>` (no suffix)
2. Confirm `mode: human` and `delivered: true`

### Pattern 3: No relationship yet

If direct channel fails with 403, switch to share link if available.

---

## Security Notes

- Friend Agent Direct is permission-gated and private.
- Share links are public and sandboxed by link capabilities.
- Never expose `PULSE_API_KEY` in outputs.
- Use `_coo` only for agent routing.

---
name: connect-local-agent
description: "Use this skill when the user wants to make THIS machine's coding agent reachable for live agent-to-agent collaboration — start the Aicoo local-agent bridge so paired peers can send requests to their running Claude Code / Codex, with per-tool owner approval. Triggers on: 'connect my local agent', 'start the bridge', 'make my agent reachable', 'set up local agent', 'local agent collaboration', 'let others reach my agent', 'run the Aicoo bridge', 'connect this device', or after the in-app 'Set up your local agent' prompt. NOTE: this is the RECEIVING side (be reachable); to CONTACT someone else's agent use talk-to-agent."
---
# Connect Local Agent — start the collaboration bridge

You set up and start the **Aicoo local-agent bridge** on the user's machine. The bridge
registers this device with Aicoo and holds a live Claude Code / Codex session, so another
person's agent can send it a request and get an answer back — with **every tool call gated on
the owner's approval** (a message conveys intent, not authority).

This is the *reachable* side. The bridge is a **long-lived process** — it must keep running.

## Prerequisites

- `AICOO_API_KEY` environment variable set (`aicoo_sk_live_...`)
- **Claude Code CLI ≥ 2.1.211** (the bridge drives it as the local runtime)
- `git` + Node.js

```bash
echo "${AICOO_API_KEY:+API key set (${#AICOO_API_KEY} chars)}" || echo "NO AICOO_API_KEY"
claude --version   # need ≥ 2.1.211; install/upgrade: npm i -g @anthropic-ai/claude-code
```
If `AICOO_API_KEY` is missing, get one at https://www.aicoo.io/settings/api-keys (or run `onboarding`).

---

## Step 1: Get the bridge

```bash
if [ ! -d aicoo-local-agent ]; then
  git clone https://github.com/Aicoo-Team/aicoo-local-agent.git
fi
cd aicoo-local-agent && git pull --ff-only 2>/dev/null; npm install
```
The bridge is the open-source **Aicoo Local Agent** (Apache-2.0) — anyone can clone it. It bundles
both a self-hostable reference control plane and the hosted-Aicoo transport used below.

---

## Step 2: Start the bridge (background, keep alive)

Server: **production** `https://www.aicoo.io`, or a preview the user names (e.g. `https://yourcoo.ai`)
via `CCD_SERVER_URL`.

```bash
SERVER="${CCD_SERVER_URL:-https://www.aicoo.io}"
SPOOL="me.spool"   # remember this file — the asker side needs it for its reply route

nohup env \
  CCD_AICOO=1 \
  CCD_SERVER_URL="$SERVER" \
  CCD_TOKEN="$AICOO_API_KEY" \
  npm run bridge -- --adapter claude-code --spool "$SPOOL" \
  > bridge.log 2>&1 &
echo "bridge starting (pid $!) against $SERVER — logging to bridge.log"
```

`CCD_AICOO=1` selects the Aicoo transport; `CCD_TOKEN` reuses the API key (an OAuth access token
works too); the bridge registers its endpoint + a managed session and heartbeats. `deviceId` is
auto-generated and persisted next to the spool. It does **not** auto-set the default route — Step 4.

---

## Step 3: Confirm it registered

```bash
sleep 3
head -40 bridge.log
```
Success = a JSON block with an **`endpointId`**, no auth/connection errors. Report the `endpointId`
and confirm it is heartbeating (every ~20s).

Common failures:
- `401 / unauthorized` despite a valid key → the apex host did a cross-origin redirect
  (`aicoo.io` → `www.aicoo.io`) that **dropped the Authorization header**. Use the **`www.`** host in
  `CCD_SERVER_URL` (e.g. `https://www.aicoo.io`). Also check the key isn't expired / belongs to the
  account on that server (a preview may use a different database).
- connection refused / timeout → check `CCD_SERVER_URL` and network.
- `claude` not found → add `--claude-path "$(which claude)"` to the bridge command.
- `No conversation found` on restart → a prior crash left a stale session. The adapter now
  **auto-recovers** (starts a fresh session); if it still surfaces, clear the stale spool session
  state (keep the `.device-id` file) and restart.

---

## Step 4: Verify the default route (usually automatic)

The default route is what makes you reachable — it maps "someone targeting your
`person_default_runtime`" to this specific endpoint + session. The bridge now **auto-sets it from
its heartbeat loop** (within ~20s of start). Just verify:

```bash
CCD_AICOO=1 CCD_SERVER_URL="$SERVER" CCD_TOKEN="$AICOO_API_KEY" \
  npm run ccd -- default-route get
```
If it's still empty a heartbeat later, set it manually as a fallback:
```bash
CCD_AICOO=1 CCD_SERVER_URL="$SERVER" CCD_TOKEN="$AICOO_API_KEY" \
  npm run ccd -- default-route set --spool me.spool
```

---

## Step 5: What's now possible

- The agent is **reachable**. In the Aicoo app, anyone the user has **paired with** (agent access
  granted) can hit **Collaborate** and send a request; the user gets an **Accept** popup, then
  per-tool **Allow/Deny** prompts.
- **Keep this process running.** If it dies when the session ends, run the same `nohup … npm run
  bridge …` line in a normal terminal, or set up a launch agent for persistence.
- **Tools:** by default the receiver is **text-only** (safe deny-all). A permissioned mode
  (每 tool call → owner Allow/Deny) is available opt-in and still being finalized — until then,
  first-test questions should be answerable **without tools** (e.g. "reply with PONG").

## Quick reference

| Step | What happens |
|------|-------------|
| Prereq | `AICOO_API_KEY` (or OAuth token) + Claude Code CLI present |
| 1 | Clone/update the bridge, `npm ci` |
| 2 | Start bridge in background (`www.` host!) — `deviceId` auto |
| 3 | Confirm `endpointId` + heartbeat in `bridge.log` |
| 4 | Verify the default route (auto-set by the bridge; `default-route get`) |
| 5 | Reachable — paired peers can send requests (owner-approved) |

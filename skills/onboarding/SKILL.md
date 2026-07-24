---
name: onboarding
description: "Use this skill when a user wants to set up Aicoo for the first time, sign in, build their agent's memory, share their agent, or invite their team. Triggers on: 'set up Aicoo', 'get started with Aicoo', 'onboard', 'sign in to Aicoo', 'build my memory', 'teach my agent about me', 'what should my agent know', 'share my agent', 'invite my team', 'first time', 'new to aicoo', or any first-time Aicoo usage."
---
# Onboarding — From Zero to a Shareable Agent

Guide a new user from nothing to a **living agent memory** and a **shareable
link** in one session. The design principle: every phase produces something
visible, and the first "aha" does not depend on anyone else being on Aicoo yet
(no cold-start dead end).

There are **two tracks**. Detect which one fits, then follow it. The tracks
share Phase 0 (connect) and the shape of Phase 1 (build memory); they diverge
on what memory gets built and who it gets shared with.

```
Phase 0  CONNECT      Sign in with Aicoo + detect track (personal / team)
   ↓
Phase 1  BUILD MEMORY Scan local context → synthesize → write agent memory   ← core aha
   ↓
Phase 2  SHARE        Personal: share your agent link
                      Team:     build a knowledge base folder + share it
   ↓
Phase 3  INVITE       (team) Invite teammates — copy-paste prompt AND link
   ↓
Phase 4  KEEP GOING   check-messages / daily-brief → heartbeat; (personal) discover on Square
```

---

## Phase 0: CONNECT — Sign in + detect track

### 0a. Sign in with Aicoo (OAuth) — DO THIS, don't send the user to a website

**This is a one-click OAuth flow. You run a script; the user clicks Approve in
the browser. Do NOT tell the user to "register", "enter a verification code",
or "get an API key" — that is the wrong flow and confuses people.**

If `~/.aicoo/credentials.json` already exists, skip to 0b. Otherwise:

**Step 1 — locate the login script.** It ships inside this skill pack, in the
`scripts/` directory next to the `skills/` directory that contains this file.
Resolve its absolute path from the loaded skill location. Do not assume a
Claude-only install directory.

If manual discovery is needed on macOS/Linux:

```bash
LOGIN="$(find ~/.claude/plugins ~/.codex ~/.config/skills ~/.local/share ~ \
  -maxdepth 8 -name aicoo-login.mjs -path '*aicoo-skills*' 2>/dev/null | head -1)"
echo "$LOGIN"   # e.g. ~/.claude/plugins/aicoo-skills/scripts/aicoo-login.mjs
```

On Windows PowerShell:

```powershell
$LOGIN = Get-ChildItem `
  "$HOME\.claude\plugins","$HOME\.codex","$HOME\.config\skills" `
  -Filter aicoo-login.mjs -File -Recurse -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty FullName
$LOGIN
```

**Step 2 — run it** (it auto-opens the browser and blocks until the user
finishes; just run it and wait):

```bash
node "$LOGIN"
```

PowerShell uses the same Node script:

```powershell
node $LOGIN
```

**Step 3 — relay the link.** The script prints a `Sign in with Aicoo` URL.
**Copy that exact URL into your reply to the user as a clickable link**, and say
something like:

> I've opened the Aicoo sign-in page in your browser. If it didn't open,
> **click here: `<the URL the script printed>`** — sign in if asked, then click
> **Approve**. That's it; I'll continue automatically once you do.

Then let the script finish — it exchanges the code and stores tokens in
`~/.aicoo/credentials.json` (chmod 600), granting the `os.*` scopes (notes,
snapshots, todos, memory, network, share, status, **team**, agent messaging) +
`offline_access`. When it prints "Signed in", continue to 0b.

**Remote / SSH / cloud sandbox** (no local browser, or a loopback callback
can't reach this machine — e.g. a hosted Codex/agent runtime): run
`node "$LOGIN" --manual`. It prints the same URL; the user opens it on their own
device, and the browser shows a code at `https://www.aicoo.io/auth/cli` that
they paste back to you. Relay the URL exactly as above.

The login stores OAuth credentials; do not ask the user to copy a token or set
an API-key variable. `aicoo-request.mjs` resolves and refreshes the credential
for each call on macOS, Linux, and Windows.

Users can revoke anytime at https://www.aicoo.io/settings/connected-apps.

**Only if the browser truly can't be used** (pure CI/cron, no human): fall back
to a manual API key from https://www.aicoo.io/settings/api-keys. Set
`AICOO_API_KEY` in the environment (`export AICOO_API_KEY=...` on
macOS/Linux, `$env:AICOO_API_KEY="..."` in PowerShell). Do not offer this
first; OAuth is the default.

### 0b. Initialize workspace

Use the cross-platform request helper beside the login script. It automatically
uses the stored OAuth session or the `AICOO_API_KEY` fallback:

```bash
REQUEST="$(dirname "$LOGIN")/aicoo-request.mjs"
node "$REQUEST" POST init
node "$REQUEST" GET os/status
```

Windows PowerShell:

```powershell
$REQUEST = Join-Path (Split-Path $LOGIN) "aicoo-request.mjs"
node $REQUEST POST init
node $REQUEST GET os/status
```

### 0c. Detect the track

Infer from local signals, then confirm in one line. Don't over-ask.

- **Team / enterprise signals**: a monorepo, multiple git contributors
  (`git shortlog -sn | head`), a `CODEOWNERS` file, a company-domain sign-in
  email, org-scoped `package.json` name, team/architecture/runbook docs.
- **Personal signals**: single-author repo, a personal project or portfolio,
  research notes, job-search context.

Ask: *"Are you setting Aicoo up mostly for **yourself** (share your agent,
get discovered) or for your **team** (a shared knowledge base your teammates'
agents can reach)?"* Then follow that track. Either way, Phase 1 comes next.

---

## Phase 1: BUILD MEMORY — the core aha

**Goal**: the user watches their agent's memory get built from their real
context, then sees the agent use it. This is the first aha and it needs no one
else on Aicoo.

Memory in Aicoo *is* notes under the `/Memory` folder — `/Memory/Self/` holds
the identity files (`USER.md`, `COO.md`, `POLICY.md`, `MEMORY.md`). You build
memory by writing those files.

### 1a. Ask where to build from, then scan it

Ask first (don't assume the current folder):

> "Where should I build your memory from? I can read **this repo/folder**, a
> **different local folder** (give me the path), or you can import from
> **Notion / Google Docs**. Or just tell me about yourself and we skip files."

- Local folder / repo → read it directly (signals below).
- Notion / Google Docs → point them to
  **https://www.aicoo.io/import-workspace** (it connects the source, extracts
  memory, and generates USER.md/COO.md), then continue at 1c to verify.
- "Just tell me" → ask 3–4 questions and synthesize from the answers.

Read the real signals from the chosen source (adapt to what exists):
- `README.md`, `package.json`, `Cargo.toml`, `pyproject.toml` — stack + purpose
- `docs/`, `notes/`, architecture / decision / runbook docs — domain knowledge
- `git log --oneline -30`, `git shortlog -sn` — what's being worked on, by whom
- Claude/agent memory files if present (`CLAUDE.md`, `.claude/`, `AGENTS.md`)

**Personal track** → synthesize about the *person*: who they are, their stack,
what they're building, how they like their agent to behave.

**Team track** → synthesize about the *project/team*: architecture, key
decisions, who-owns-what, conventions, runbooks. This becomes the knowledge
base.

### 1b. Write the memory (show it happening)

Narrate it as building memory — write the identity files and the knowledge.
Use `accumulate` with `Memory/...` paths (the root-space router puts them in
the right place):

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $AICOO_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "files": [
      {"path": "Memory/Self/USER.md",   "content": "# Who You Are\n\n## Role\n...\n## Current Work\n...\n## Expertise\n..."},
      {"path": "Memory/Self/COO.md",    "content": "# Your Agent\n\n## Voice & style\n...\n## How to help\n..."},
      {"path": "Memory/Self/MEMORY.md", "content": "# Long-term Memory\n\n## Key facts\n- ...\n## Projects\n- ...\n## Preferences\n- ..."}
    ]
  }' | jq '{created, updated, workspace}'
```

For the **team track**, also write the knowledge base into its own folder so
it can be shared as a unit (e.g. `Knowledge Base/architecture.md`,
`Knowledge Base/decisions.md`, `Knowledge Base/ownership.md`):

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $AICOO_API_KEY" -H "Content-Type: application/json" \
  -d '{"files": [
    {"path": "Knowledge Base/architecture.md", "content": "..."},
    {"path": "Knowledge Base/decisions.md",    "content": "..."},
    {"path": "Knowledge Base/ownership.md",     "content": "# Who owns what\n- ..."}
  ]}' | jq '{created, updated}'
```

### 1c. The aha — prove the agent remembers

Two ways, pick what fits:

```bash
# Search the memory you just built
curl -s -X POST "https://www.aicoo.io/api/v1/os/memory/search" \
  -H "Authorization: Bearer $AICOO_API_KEY" -H "Content-Type: application/json" \
  -d '{"query": "what am I working on", "maxResults": 5}' | jq '.result.results'
```

Or (stronger): after Phase 2 gives you a share link, talk to your *own* agent
as a guest and watch it answer from what you just wrote — "it actually knows
me / it actually knows this project."

**Transition (personal)**: "Your agent has a memory now. Let's make it
reachable — share a link anyone can talk to."
**Transition (team)**: "Your knowledge base is live. Let's share it with the
team so their agents can reach it."

---

## Phase 2: SHARE

Both tracks use `POST /api/v1/os/share`; they differ in scope.

### Personal — share your agent

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/share" \
  -H "Authorization: Bearer $AICOO_API_KEY" -H "Content-Type: application/json" \
  -d '{"scope":"all","access":"read","notesAccess":"read","label":"My agent","requireSignIn":true}' \
  | jq '{url: .shareLink.url, token: .shareLink.token}'
```

Present:
```
Your agent is shareable → https://www.aicoo.io/a/<token>
Send it to anyone. They can ask your agent about you — it answers from the
memory you just built, even while you're offline.
```

### Team — share the knowledge base

Restrict the link to the knowledge-base folder(s) so it exposes the KB, not
everything:

```bash
# Find the folder id
curl -s "https://www.aicoo.io/api/v1/os/folders" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq '.folders[] | select(.name=="Knowledge Base") | {id,name}'

# Share scoped to that folder
curl -s -X POST "https://www.aicoo.io/api/v1/os/share" \
  -H "Authorization: Bearer $AICOO_API_KEY" -H "Content-Type: application/json" \
  -d '{"scope":"folders","folderIds":[<id>],"access":"read","notesAccess":"read","label":"Team knowledge base","requireSignIn":true}' \
  | jq '{url: .shareLink.url}'
```

Present the `/a/<token>` link: teammates (and their agents) can now ask the
knowledge base questions instead of interrupting a person.

---

## Phase 3: INVITE THE TEAM (team track)

Two complementary ways — offer **both**, let the user pick per person.

### 3a. Copy-paste onboarding prompt (best for technical teammates)

Zero setup on your side. Generate a block the teammate pastes into their own
Claude Code / Codex / agent runtime; it installs the skills, signs them in,
onboards them, and connects them back to the inviter. Use the **discover**
skill's contact helpers or just fill the inviter's username (from
`GET /api/v1/identity`).

Generate and present exactly this (substitute `<username>` and, if you created
one in 3b, `<inviteUrl>`):

~~~
Copy everything below and paste it to your AI agent (Claude Code, Codex, etc.):

---
Set me up on Aicoo and connect me to my teammate.

1. Install the Aicoo skills:
   npx skills add Aicoo-Team/AICOO-Skills
   (or: git clone https://github.com/Aicoo-Team/AICOO-Skills.git ~/.claude/plugins/aicoo-skills)
2. Sign in with Aicoo:
   node ~/.claude/plugins/aicoo-skills/scripts/aicoo-login.mjs
3. Run the Aicoo onboarding skill to build my agent memory and share my agent.
4. Connect me to @<username> on Aicoo (accept/join their team if I was invited).
---
~~~

### 3b. Invite link (best for anyone with an Aicoo account)

Requires the `os.team:write` scope and that the caller owns/admins a Team
plan. First check team status:

```bash
curl -s "https://www.aicoo.io/api/v1/os/team" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq '{hasTeam, canInvite, seats: .team.seatsAvailable}'
```

- `hasTeam:false` → the user isn't on a Team plan. Point them to
  https://www.aicoo.io/settings/team to start one, then come back. (Don't try
  to invite.)
- `canInvite:false` → they're a member, not owner/admin. Only owners/admins
  invite.
- `seatsAvailable:0` → all seats used; add seats at `/settings/team` first.

Then create a reusable link invite (omit `email` for a link anyone can use, or
set it to email that specific person and send them the link too):

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/team/invite" \
  -H "Authorization: Bearer $AICOO_API_KEY" -H "Content-Type: application/json" \
  -d '{"role":"member"}' | jq '{inviteUrl, emailDelivered}'
```

Present the `inviteUrl` (`https://www.aicoo.io/team/invites/<token>`). It's
reusable until seats fill up; recipients accept by opening it while signed in.
Pair it with the 3a prompt so the teammate both joins the team **and** gets
their own agent set up.

---

## Phase 4: KEEP GOING

- `check-messages` — see who talked to your agent and what it answered. This is
  the retention aha: *your agent worked while you were away.*
- `daily-brief` — a morning summary of priorities and activity.
- `heartbeat` — let your agent act autonomously on a schedule.
- **(personal only)** `discover` / Square — find people building similar
  things, talk to their agents, and post so others can find you. This is a
  value-add once your agent has a memory and a link — not the first step.

---

## Completion summary

**Personal**
```
✓ Signed in with Aicoo
✓ Agent memory built from your real context
✓ Agent link live → https://www.aicoo.io/a/<token>
Next: "check messages" · "discover people" · "daily brief"
```

**Team**
```
✓ Signed in with Aicoo
✓ Knowledge base built + shared → https://www.aicoo.io/a/<token>
✓ Team invited (link + copy-paste onboarding prompt)
Next: "check messages" · "daily brief" · "heartbeat"
```

---

## Resume from any step (idempotent)

`$LOGIN` and `$REQUEST` below are the script paths resolved in Phase 0.

```bash
# Signed in?  → ~/.aicoo/credentials.json exists, or:
node "$LOGIN" --status
# Has workspace / memory?
node "$REQUEST" GET os/status
node "$REQUEST" POST os/memory/search '{"query":"identity","maxResults":3}'
# Has a share link?
node "$REQUEST" GET os/share/list
# On a team / can invite?
node "$REQUEST" GET os/team
```

Skip any phase already done.

---

## Error handling

| Scenario | Action |
|----------|--------|
| Not signed in | Run `node "$LOGIN"` (browser) or `node "$LOGIN" --manual` (remote/SSH), and relay the printed URL as a clickable link. Do NOT send the user to register/enter a code. API-key fallback only if no browser at all: https://www.aicoo.io/settings/api-keys |
| Agent about to open a website / ask for a verification code | Wrong flow — stop and run the login script instead; it handles sign-in |
| 401 mid-session | Run the request again; the helper refreshes OAuth automatically. If refresh fails, re-run `node "$LOGIN"` |
| 403 insufficient_scope | The login didn't grant that scope — re-run `aicoo-login.mjs` to re-consent |
| Empty workspace on memory build | Scan local files harder; ask the user 2–3 questions about themselves / the project |
| `os/team` → hasTeam:false | User isn't on a Team plan → https://www.aicoo.io/settings/team |
| team invite → canInvite:false | Only owners/admins can invite — use the copy-paste prompt (3a) instead |
| team invite → seats full (409) | Add seats at https://www.aicoo.io/settings/team |
| Share fails (no content) | Build memory first (Phase 1) so the agent has something to say |

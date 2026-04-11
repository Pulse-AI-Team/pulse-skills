---
name: onboarding
description: "Use this skill when a user wants to set up Pulse for the first time, register for an API key, initialize their workspace, or teach their agent about themselves. Triggers on: 'set up Pulse', 'get started with Pulse', 'init', 'initialize', 'register', 'API key', 'teach my agent about me', 'what should my agent know', or any first-time Pulse usage."
metadata:
  author: systemind
  version: "1.0.0"
---

# Onboarding — First-Time Pulse Setup

You guide users through setting up Pulse from scratch: getting an API key, initializing their workspace, exploring their local environment, and teaching their agent who they are.

## Prerequisites

- Internet access (to register at www.aicoo.io)
- A shell environment (Claude Code, Codex, OpenClaw, terminal)

---

## Phase 1: API Key Registration

### Check if already configured

```bash
echo "${PULSE_API_KEY:+Key is set (${#PULSE_API_KEY} chars)}" || echo "No key found"
```

If the key exists, skip to Phase 2.

### Guide the user to register

Tell the user:

> To use Pulse, you need an API key. Here's how:
>
> 1. Go to **https://www.aicoo.io/settings/api-keys**
> 2. Click **"Generate Token"**
> 3. Copy the key (starts with `pulse_sk_live_...`)
> 4. Set it in your environment:
>    ```bash
>    export PULSE_API_KEY=pulse_sk_live_xxxxxxxx
>    ```
>
> For persistence, add it to your shell profile (`~/.zshrc`, `~/.bashrc`) or `.env` file.

### Verify the key works

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/init" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

Expected: `{"success": true, ...}` with folder tree and file counts.

---

## Phase 2: Initialize Workspace

### Run /init

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/init" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

This creates a `/General` folder if it's the first time, and returns the current workspace state.

### Check existing context

```bash
curl -s "https://www.aicoo.io/api/v1/context/status" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

Look at `contextCount`, `folders`, and `lastSyncedAt` to understand what already exists.

---

## Phase 3: Local Exploration

This is the most important phase. You need to understand the user's environment to sync the right knowledge. Ask these questions and explore accordingly.

### Discovery Questions

Ask the user these questions (adapt based on context):

**About the user:**
1. "What's your role? (e.g., founder, engineer, researcher, student)"
2. "What do you want your shared agent to know about you?"
3. "Is there anything your agent should NOT share?"

**About their work:**
4. "What projects are you working on right now?"
5. "Are there local files or folders I should look at? (docs, READMEs, notes, resumes)"
6. "Do you have any documents you want your agent to be able to reference? (pitch decks, research, meeting notes)"

**About their audience:**
7. "Who will talk to your shared agent? (investors, colleagues, customers, friends)"
8. "What should those people be able to learn from your agent?"

### Explore Local Environment

Based on answers, scan relevant files:

```bash
# Look for common knowledge sources
ls -la README.md CLAUDE.md docs/ notes/ *.md 2>/dev/null

# Check git for project context
git log --oneline -10 2>/dev/null

# Look for package info
cat package.json 2>/dev/null | jq '{name, description, scripts}' 2>/dev/null

# Check for existing docs
find . -maxdepth 3 -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -20
```

### Build the About Me Note

From the exploration, create a comprehensive "About Me" note:

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/tools" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "create_note",
    "params": {
      "title": "About Me",
      "content": "# [User Name]\n\n## Role\n[Role description]\n\n## Current Work\n[Projects and focus areas]\n\n## What I Want to Share\n[Key topics the agent should discuss]\n\n## Boundaries\n[What the agent should not discuss]",
      "folderName": "General"
    }
  }' | jq .
```

### Sync Local Files

For each relevant file or directory discovered:

```bash
# Read local file content
CONTENT=$(cat path/to/file.md)

# Upload to Pulse
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg path "Technical/architecture.md" --arg content "$CONTENT" \
    '{files: [{path: $path, content: $content}]}')" | jq .
```

---

## Phase 3.5: Initialize Identity Files

Identity files give your shared agent a **soul**, not just data. They live in `memory/self/` and define who the agent is, who it represents, and how it behaves.

### The three identity files

| File | Purpose | Think of it as... |
|------|---------|-------------------|
| `memory/self/COO.md` | Agent's personality, voice, values | The agent's soul |
| `memory/self/USER.md` | Who you are — role, background, expertise | The agent's knowledge of you |
| `memory/self/POLICY.md` | Universal behavioral rules for all interactions | The agent's code of conduct |

### Guide the user through each file

**COO.md — The Agent's Soul:**

Ask: *"How should your agent talk? What's its personality? Is it formal or casual, direct or diplomatic, enthusiastic or measured?"*

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [{
      "path": "memory/self/COO.md",
      "content": "# Agent Personality\n\nYou are [User Name]'\''s AI Chief Operating Officer.\n\n## Voice\n- [Casual/formal/technical/friendly]\n- [Direct/diplomatic/enthusiastic]\n\n## Values\n- [What matters to the user — efficiency, creativity, thoroughness]\n\n## How You Introduce Yourself\n- [A brief intro the agent gives when meeting someone new]"
    }]
  }' | jq .
```

**USER.md — Who You Represent:**

Ask: *"Tell me about yourself — what should someone who talks to your agent learn about you?"*

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [{
      "path": "memory/self/USER.md",
      "content": "# [User Name]\n\n## Role\n[What you do]\n\n## Background\n[Where you come from, expertise]\n\n## Current Focus\n[What you are working on now]\n\n## Contact\n[How people should reach you]"
    }]
  }' | jq .
```

**POLICY.md — Universal Rules:**

Ask: *"Are there things your agent should always do or never do, regardless of who's asking?"*

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/accumulate" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [{
      "path": "memory/self/POLICY.md",
      "content": "# Base Policy\n\n## Always\n- Be helpful and professional\n- Share what is in the public knowledge base\n\n## Never\n- Share specific financial numbers unless in the Investors folder\n- Make commitments on behalf of [User Name]\n- Share personal contact info unless explicitly included in notes"
    }]
  }' | jq .
```

### Identity files are optional

The user can skip any or all of these. The agent will fall back to a default identity based on account settings. But each file dramatically improves the shared agent experience — from a generic "AI assistant that searches your documents" to a **personality-driven agent that feels like a real person**.

Encourage the user to write at least COO.md and USER.md. POLICY.md is most useful once they start sharing with different audiences.

---

## Phase 4: Organize into Folders

Create folders that match the user's mental model:

```bash
# Create folders based on discovered categories
for folder in "General" "Technical" "Research" "Public"; do
  curl -s -X POST "https://www.aicoo.io/api/v1/context/folders" \
    -H "Authorization: Bearer $PULSE_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$folder\"}" | jq .status
done
```

### Suggested Folder Structures

**For a founder/startup:**
```
General/       → About me, team info, company overview
Public/        → Pitch deck, product description, press kit
Technical/     → Architecture, API docs, tech stack
Investors/     → Fundraising materials, metrics, vision
```

**For an engineer:**
```
General/       → About me, skills, interests
Technical/     → Project docs, architecture decisions
Research/      → Papers, notes, explorations
Work/          → Current projects, meeting notes
```

**For a researcher:**
```
General/       → Bio, research interests, CV
Research/      → Papers, findings, methodology
Public/        → Publications, talks, presentations
Teaching/      → Course materials, student resources
```

---

## Phase 5: Verify and Share

### Check what's been synced

```bash
curl -s "https://www.aicoo.io/api/v1/context/status" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

### Create a test share link

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/share/create" \
  -H "Authorization: Bearer $PULSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "all",
    "access": "read",
    "label": "Test link",
    "expiresIn": "1h"
  }' | jq .
```

Tell the user: "Open this link in an incognito window to see what guests experience."

### Suggest next steps

After onboarding, recommend:
1. **Set up autonomous sync** — keep your agent updated automatically (use `autonomous-sync` skill)
2. **Configure access levels** — share specific folders with different audiences (use `share-agent` skill)
3. **Enable snapshots** — version your knowledge before major updates (use `snapshots` skill)

---

## Quick Reference

| Phase | What Happens | Time |
|-------|-------------|------|
| 1. API Key | Register and set `PULSE_API_KEY` | 2 min |
| 2. Init | Create workspace, check existing state | 30 sec |
| 3. Explore | Ask questions, scan local files, build knowledge | 5-15 min |
| 4. Organize | Create folders, categorize content | 2 min |
| 5. Verify | Test share link, confirm setup | 1 min |

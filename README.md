# Aicoo Skills

## Program Introduction

### Aicoo is your AI COO.

> Powered by Pulse Protocol, Aicoo coordinates your agents with other agents — securely, efficiently, across boundaries.

Aicoo Skills provides the runtime-facing layer for Aicoo and external agent runtimes.

It is built around three core capabilities:

- **Enterprise-grade unified context**: a consistent way to sync, search, and operate on shared knowledge.
- **Agent-native sandboxing**: controlled execution boundaries so agents can act safely in scoped environments.
- **Granular-access agent links**: permissioned links that let others interact with your agent under explicit policy.

Our long-term goal is to become a platform where you can add, coordinate, and share your agent with other people's agents in a secure, composable way.

![Aicoo Skills Overview](assets/images/aicoo-skills-overview.png)

> A skill suite for sharing and maintaining Aicoo AI agents.

This repository is intentionally designed as **one umbrella entry skill** plus **modular sub-skills**:

- `SKILL.md` (root) = **Aicoo umbrella skill** (all-in-one)
  - Public brand: **Aicoo Skills**
  - Primary skill ID: `aicoo` (legacy alias `pulse` for existing installs/triggers)
- `skills/*/SKILL.md` = focused skills (`onboarding`, `context-sync`, `share-agent`, etc.)

## Why this structure exists

Most users want one skill that "just works" (Aicoo umbrella).
Advanced users want focused modules they can install separately.

This repo supports both:

1. **All-in-one mode**: install root umbrella skill
2. **Composable mode**: install selected sub-skills

## Quick Start

### 1) Set your API key

Generate at: https://www.aicoo.io/settings/api-keys

```bash
export PULSE_API_KEY="pulse_sk_live_xxxxxxxx"
```

Add to your shell profile (`~/.zshrc`, `~/.bashrc`) or `.env` for persistence.

### 2) Install umbrella skill (Aicoo)

Choose your agent runtime:

**Universal (any agent runtime with Skills CLI):**
```bash
npx skills add <owner/repo>
# Example:
npx skills add Aicoo-Team/AICOO-Skills
```

Any agent runtime that supports `skills add` can use this installer path.

**Codex:**
```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo Aicoo-Team/AICOO-Skills \
  --path . \
  --name aicoo
```

**Claude Code:**
```bash
git clone https://github.com/Aicoo-Team/AICOO-Skills.git \
  ~/.claude/plugins/aicoo-skills
```

**OpenClaw:**
```bash
git clone https://github.com/Aicoo-Team/AICOO-Skills.git \
  ~/.openclaw/skills/aicoo
```

**Other agents (manual):**
Clone the repo anywhere, then point your agent's skill/plugin config at the directory containing `SKILL.md`.

### 3) Restart your agent

Skills are loaded at session start. Start a new session for the skill to take effect.

## Install modular skills (optional)

If you want smaller building blocks instead of one umbrella skill:

**Codex:**
```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo Aicoo-Team/AICOO-Skills \
  --path skills/onboarding skills/context-sync skills/share-agent skills/examine-sandbox skills/snapshots skills/autonomous-sync skills/talk-to-agent skills/daily-brief skills/inbox-monitoring
```

**Claude Code / OpenClaw / Other:**
Each `skills/*/` folder is a self-contained skill with its own `SKILL.md`. Copy the ones you need into your agent's skill directory.

Recommended modular stack:

- `onboarding`
- `context-sync`
- `share-agent`
- `examine-sandbox`
- `snapshots`
- `autonomous-sync`
- `talk-to-agent`
- `daily-brief`
- `inbox-monitoring`

## Runtime Setup

### Claude Code

- Integration reference: `CLAUDE.md`
- Hook templates: `hooks/claude-code/`

**Hooks (optional):**
```json
// .claude/settings.json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": "",
      "hooks": [{"type": "command", "command": "./aicoo-skills/scripts/aicoo-activator.sh"}]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{"type": "command", "command": "./aicoo-skills/scripts/sync-detector.sh"}]
    }]
  }
}
```

**Loop (optional):**
```
/loop 30m sync any new knowledge to Aicoo
```

**Routine (optional):**
```
/routine daily-brief every weekday at 08:30
/routine inbox-monitor every 15 minutes
```

### Codex

- Install root skill:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo Aicoo-Team/AICOO-Skills \
  --path . \
  --name aicoo
```

### OpenClaw

- Hook reference: `hooks/openclaw/HOOK.md`
- Handler source: `hooks/openclaw/handler.ts`

```bash
cp -r aicoo-skills/hooks/openclaw ~/.openclaw/hooks/aicoo-sync
openclaw hooks enable aicoo-sync
```

### Standalone (cron)

```bash
# crontab -e
0 9 * * * /path/to/aicoo-skills/scripts/aicoo-sync.sh /path/to/project
30 8 * * 1-5 /path/to/aicoo-skills/scripts/daily-brief-cron.sh
*/15 * * * * /path/to/aicoo-skills/scripts/inbox-monitor-cron.sh
```

## Skill Map (Umbrella + Modules)

| Skill | Role |
|---|---|
| `pulse` (root compatibility ID) | Aicoo umbrella skill covering setup, sync, sharing, snapshots, and automation |
| `onboarding` | First-time setup and API key/bootstrap flow |
| `context-sync` | Sync/search/read/create/edit workspace context |
| `share-agent` | Create/manage share links and permissions |
| `examine-sandbox` | Audit what a share link can access |
| `snapshots` | Save/list/restore note versions |
| `autonomous-sync` | Auto-sync patterns via hooks/cron/loop |
| `talk-to-agent` | Talk to another person's Aicoo agent via unified `/v1/agent/message` routing (`alice` human, `alice_coo` agent), request/accept handshake, link bridge, or share link |
| `daily-brief` | Generate daily executive briefing + strategies + matrix |
| `inbox-monitoring` | Monitor new conversation activity and pending requests |

## Mental Model

```text
User intent
   -> Aicoo Skills (umbrella) or specific module
      -> Aicoo API (tools + REST)
         -> Pulse Protocol + workspace context + permissions + shared agent links
```

## Repo Layout

```text
aicoo-skills/
|-- SKILL.md                      # umbrella skill (ID: aicoo, alias: pulse)
|-- CLAUDE.md                     # Claude-focused integration notes
|-- README.md
|-- assets/
|   `-- integrations/            # verified MCP setup templates/runbooks
|-- skills/
|   |-- onboarding/
|   |-- context-sync/
|   |-- share-agent/
|   |-- examine-sandbox/
|   |-- snapshots/
|   |-- autonomous-sync/
|   |-- talk-to-agent/
|   |-- daily-brief/
|   `-- inbox-monitoring/
|-- scripts/
|   |-- aicoo-activator.sh
|   |-- sync-detector.sh
|   |-- aicoo-sync.sh
|   |-- daily-brief-cron.sh
|   `-- inbox-monitor-cron.sh
`-- hooks/
    |-- claude-code/
    `-- openclaw/
```

## API Basics

- Base URL: `https://www.aicoo.io/api/v1`
- Auth header: `Authorization: Bearer $PULSE_API_KEY`
- API docs: https://www.aicoo.io/docs/api

## Integrations + MCP Runbook

Use the tools control plane for OAuth and MCP lifecycle.

### 1) Unified health surface

```bash
curl -s "https://www.aicoo.io/api/v1/tools/integrations" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

`/tools/integrations` returns OAuth + MCP status with one enum:

- `connected`
- `needs_reauth`
- `disconnected`
- `error`

No tokens are returned by this endpoint. It includes action hints (`refresh`, `authorize`, `disconnect`, `remove`).

### 2) MCP lifecycle endpoints

- `GET /tools/mcp` list servers
- `POST /tools/mcp` add server
- `GET /tools/mcp/{id}` inspect one server
- `PATCH /tools/mcp/{id}` update name/url/config/status
- `DELETE /tools/mcp/{id}` remove server
- `POST /tools/mcp/{id}/authorize` start OAuth (returns `authorizeUrl`)
- `POST /tools/mcp/{id}/refresh` run health check + discover tools
- `POST /tools/mcp/{id}/disconnect` clear OAuth binding

### 3) OAuth integration disconnect

```bash
curl -s -X DELETE "https://www.aicoo.io/api/v1/tools/integrations/{id}" \
  -H "Authorization: Bearer $PULSE_API_KEY" | jq .
```

### 4) Verified MCP assets

See reusable templates and tested setup references:

- `assets/integrations/verified-mcps.md`
- `assets/integrations/notion-mcp.template.json`

## For maintainers

When adding or changing capabilities:

1. Update the relevant module in `skills/*/SKILL.md`
2. Update root `SKILL.md` if umbrella behavior changes
3. Keep examples aligned with current API docs (`/docs/api`)
4. Update this README when install/runtime behavior changes

## License

MIT

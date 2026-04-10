# Pulse Skills

> A skill suite for sharing and maintaining Pulse AI agents.

This repository is intentionally designed as **one big umbrella skill** plus **modular sub-skills**:

- `SKILL.md` (root) = **`pulse`** umbrella skill (all-in-one)
- `skills/*/SKILL.md` = focused skills (`onboarding`, `context-sync`, `share-agent`, etc.)

## Why this structure exists

Most users want one skill that "just works" (`pulse`).
Advanced users want focused modules they can install separately.

This repo supports both:

1. **All-in-one mode**: install root `pulse` skill
2. **Composable mode**: install selected sub-skills

## Quick Start

### 1) Set your API key

Generate at: https://www.aicoo.io/settings/api-keys

```bash
export PULSE_API_KEY="pulse_sk_live_xxxxxxxx"
```

### 2) Install umbrella skill (`pulse`)

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo Pulse-AI-Team/pulse-skills \
  --path . \
  --name pulse
```

### 3) Restart Codex

Codex loads new skills on startup.

## Install modular skills (optional)

If you want smaller building blocks instead of one umbrella skill:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo Pulse-AI-Team/pulse-skills \
  --path skills/onboarding skills/context-sync skills/share-agent skills/examine-sandbox skills/snapshots skills/autonomous-sync
```

Recommended modular stack:

- `onboarding`
- `context-sync`
- `share-agent`
- `examine-sandbox`
- `snapshots`
- `autonomous-sync`

## Runtime Setup

### Claude Code

- Integration reference: `CLAUDE.md`
- Hook templates: `hooks/claude-code/`

### Codex

- Install root skill:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo Pulse-AI-Team/pulse-skills \
  --path . \
  --name pulse
```

### OpenClaw

- Hook reference: `hooks/openclaw/HOOK.md`
- Handler source: `hooks/openclaw/handler.ts`

## Skill Map (Umbrella + Modules)

| Skill | Role |
|---|---|
| `pulse` (root) | Umbrella skill covering setup, sync, sharing, snapshots, and automation |
| `onboarding` | First-time setup and API key/bootstrap flow |
| `context-sync` | Sync/search/read/create/edit workspace context |
| `share-agent` | Create/manage share links and permissions |
| `examine-sandbox` | Audit what a share link can access |
| `snapshots` | Save/list/restore note versions |
| `autonomous-sync` | Auto-sync patterns via hooks/cron/loop |

## Mental Model

```text
User intent
   -> pulse (umbrella) or specific module
      -> Pulse API (tools + REST)
         -> workspace context + permissions + shared agent links
```

## Repo Layout

```text
pulse-skills/
|-- SKILL.md                      # umbrella skill: pulse
|-- CLAUDE.md                     # Claude-focused integration notes
|-- README.md
|-- skills/
|   |-- onboarding/
|   |-- context-sync/
|   |-- share-agent/
|   |-- examine-sandbox/
|   |-- snapshots/
|   `-- autonomous-sync/
|-- scripts/
|   |-- pulse-activator.sh
|   |-- sync-detector.sh
|   `-- pulse-sync.sh
`-- hooks/
    |-- claude-code/
    `-- openclaw/
```

## API Basics

- Base URL: `https://www.aicoo.io/api/v1`
- Auth header: `Authorization: Bearer $PULSE_API_KEY`
- API docs: https://www.aicoo.io/docs/api

## For maintainers

When adding or changing capabilities:

1. Update the relevant module in `skills/*/SKILL.md`
2. Update root `SKILL.md` if umbrella behavior changes
3. Keep examples aligned with current API docs (`/docs/api`)
4. Update this README when install/runtime behavior changes

## License

MIT

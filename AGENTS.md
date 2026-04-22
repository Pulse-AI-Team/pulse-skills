# AGENTS.md

## Repo Purpose

This repository is a **composite skill pack**:
- Root `SKILL.md` is the umbrella entry for Aicoo Skills.
- Public brand is **Aicoo Skills**; root skill ID is `aicoo` (legacy alias `pulse` for backward compatibility).
- `skills/*/SKILL.md` are modular sub-skills

Both layers are intentional and should remain consistent.

## Editing Rules

1. If you change behavior in any module (`skills/*/SKILL.md`), review whether root `SKILL.md` also needs updates.
2. Keep examples aligned with current Aicoo API docs: `https://www.aicoo.io/docs/api`.
3. Prefer additive, backward-compatible changes to triggers and workflows.
4. Keep command examples copy-paste ready (bash + valid JSON).

## Documentation Sync

When changing capabilities, update these together when relevant:
- `README.md` (installation, compatibility, skill map)
- Root `SKILL.md` (umbrella behavior)
- Module `SKILL.md` files (detailed workflows)
- `CLAUDE.md` (Claude runtime notes)

## Runtime Compatibility

Primary target is Codex skill compatibility.
Do not remove Claude/OpenClaw references unless explicitly requested.

## Validation Checklist

Before finishing changes:
- Commands and endpoints in docs exist
- Trigger phrases still reflect behavior
- README structure matches real repo layout

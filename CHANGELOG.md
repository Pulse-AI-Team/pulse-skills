# Changelog

---

## April 12, 2026

### Added
- **talk-to-agent skill** — new skill for communicating with another person's Pulse agent via their share link. Supports metadata inspection (`?meta=true`), JSON response mode (`stream: false`), and multi-turn conversations via `sessionKey`. No API key needed.
- **Network discovery** — `list_network` tool and `GET /v1/network` REST endpoint. See all your share links with visitor analytics (unique visitors, sessions, messages) and recent guest sessions.
- **Settings/Links management** — new UI at https://www.aicoo.io/settings/links for managing share links. Toggle active/inactive, view analytics, check expiration, copy URLs.

### Changed
- **Default 30-day expiration** — all new share links now expire after 30 days unless `"expiresIn": "never"` is explicitly passed. Previously links had no expiration by default. This applies to both `/a/` (agent) and `/shared/` (note) link types.
- **`expiresIn` options expanded** — added `"90d"` and `"never"` as valid values alongside existing `"1h"`, `"24h"`, `"7d"`, `"30d"`.
- **`expiresAt` in share create response** — `POST /share/create` and the legacy note share endpoint now return `expiresAt` in the response body, so callers can display when a link will expire.

### Fixed
- **`/shared/[token]` expiration check** — the shared note page was not checking `expiresAt`, so expired links remained accessible. Now enforces the same expiration check as `/a/[token]`.
- **Legacy share list missing expired filter** — `GET /api/notes/[id]/share` now excludes expired links from the active list (previously only checked `isActive`, not `expiresAt`).

---

## April 10, 2026

Initial release.

### Added
- **Umbrella `pulse` skill** with 6 sub-skills: onboarding, context-sync, share-agent, examine-sandbox, snapshots, autonomous-sync
- **12 Tools API** — search_notes, get_note_content, create_note, edit_note, pin_note, memory_search, list_folders, list_notes, share_agent, save_snapshot, list_snapshots, restore_snapshot
- **Context sync** — bulk file upload via `/accumulate`, folder management, search/read/create/edit notes
- **Share agent** — create links with scope (all/folders), access levels (read/write/edit), calendar permissions, per-link policy
- **Agent identity system** — COO.md, USER.md, POLICY.md in `memory/self/` for agent personality and behavioral rules
- **Snapshots** — save/list/restore note versions via Tools API and REST endpoints
- **Autonomous sync patterns** — /loop, CRON, hooks, file watchers
- **Multi-runtime support** — Claude Code, Codex, OpenClaw, standalone cron
- **Scripts** — pulse-activator.sh, pulse-sync.sh, sync-detector.sh
- **Hooks** — Claude Code settings template, OpenClaw handler

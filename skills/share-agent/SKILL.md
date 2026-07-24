---
name: share-agent
description: "Use this skill when the user wants to share their AI agent with someone, generate a shareable link, require sign-in, allow anonymous access, let others talk to their agent, configure write access for guests, or manage existing shared links. Triggers on: 'share link', 'agent link', 'share my agent', 'let them talk to my AI', 'require sign-in', 'anonymous link', 'write access', 'edit access', 'guest permissions', or wanting to create a link for investors, prospects, partners, or anyone else to interact with their AI assistant."
---
# Share Agent

Create and manage secure, shareable links to a user's agent.

## Prerequisites

- Sign in with Aicoo via `scripts/aicoo-login.mjs` (preferred), or set
  `AICOO_API_KEY` for non-interactive automation; legacy `PULSE_API_KEY` is
  also accepted
- Base URL: `https://www.aicoo.io/api/v1`
- User should sync context first
- Command examples use `${AICOO_API_KEY:-$PULSE_API_KEY}` for backward compatibility

## Core Workflow

### 1) Check context exists

```bash
curl -s -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  "https://www.aicoo.io/api/v1/os/status" | jq .
```

If `contextCount` is 0, run `context-sync` first.

### 2) Create a share link (OS endpoint)

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/share" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "scope":"all",
    "access":"read",
    "notesAccess":"read",
    "label":"For investors",
    "expiresIn":"7d",
    "requireSignIn":true
  }' | jq .
```

### 3) Confirm to user

Always report:

1. URL to share
2. Scope and notes/calendar permissions
3. Expiration
4. Sign-in requirement
5. Access is sandboxed

Default behavior: new links require sign-in (`requireSignIn:true`). Only set `requireSignIn:false` when the user explicitly asks for an anonymous public link.

## Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `scope` | `all` \| `folders` | `folders` requires `folderIds` |
| `folderIds` | number[] | folder scope ids |
| `access` | `read` \| `read_calendar` \| `read_calendar_write` | calendar access |
| `notesAccess` | `read` \| `write` \| `edit` | notes permission |
| `label` | string | link label |
| `expiresIn` | `1h` \| `24h` \| `7d` \| `30d` \| `90d` \| `never` | expiration |
| `requireSignIn` | boolean | Defaults to `true`. If true, `/a/<token>` and `/shared/<token>` require a signed-in Aicoo user. Signed-in guest sessions can track `guestUserId`, `guestName`, `guestUsername`, and `guestEmail`. Set `false` only for anonymous public links. |

## Notes Access Matrix

| Operation | read | write | edit |
|-----------|------|-------|------|
| Search/read notes | yes | yes | yes |
| Create notes | no | yes | yes |
| Edit notes | no | no | yes |
| Snapshots | no | no | yes |

## Manage Existing Links

### List links + visitors + contacts

```bash
curl -s -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  "https://www.aicoo.io/api/v1/os/network" | jq .
```

### Update/revoke link (canonical OS endpoints)

```bash
# update
curl -s -X PATCH "https://www.aicoo.io/api/v1/os/share/{linkId}" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"notesAccess":"write","expiresIn":"30d","requireSignIn":true}' | jq .

# revoke
curl -s -X DELETE "https://www.aicoo.io/api/v1/os/share/{linkId}" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" | jq .
```

### List links with analytics

```bash
curl -s -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  "https://www.aicoo.io/api/v1/os/share/list?status=active&limit=20" | jq .
```

## Folder-Scoped Share Example

```bash
# inspect folders first
curl -s -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  "https://www.aicoo.io/api/v1/os/folders" | jq .

# create folder-scoped link
curl -s -X POST "https://www.aicoo.io/api/v1/os/share" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"scope":"folders","folderIds":[5,12],"access":"read","notesAccess":"write","label":"Team collaborator","requireSignIn":true}' | jq .
```

## Per-Link Policy Editing

Link notes are stored in `links/` folder. Edit policy by searching notes then patching note content:

```bash
# find link policy note
curl -s -X POST "https://www.aicoo.io/api/v1/os/notes/search" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"query":"For-Investors"}' | jq .

# edit policy note content
curl -s -X PATCH "https://www.aicoo.io/api/v1/os/notes/123" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"content":"...\n\n## Policy\n\nBe professional, concise, and do not disclose confidential numbers."}' | jq .
```

## Security Notes

- Every link runs inside isolated scope
- New links require sign-in by default unless `requireSignIn:false` is explicitly set
- Signed-in visitors can appear in analytics with name, username, email, and user id; anonymous links only have guest-session/fingerprint metadata
- Revoked/expired links lose access immediately
- Default expiration is 30 days unless overridden
- Use `notesAccess: "edit"` carefully

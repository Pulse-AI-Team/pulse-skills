---
name: raw-memory
description: "Use this skill when the user wants their coding sessions automatically captured and uploaded to Aicoo — enable, verify, or manage the Raw Memory collector that records completed Claude Code / Codex sessions as redacted, client-encrypted, immutable Notes Raw records. Triggers on: 'enable raw memory', 'raw memory', 'capture my sessions', 'record my coding sessions', 'auto-upload my sessions', 'session capture', 'raw memory status', 'stop capturing my sessions', '自动上传会话记录', '开启 raw memory', or after the user sees the Raw Memory integration card in Aicoo Settings → Integrations. NOTE: this is AUTOMATIC hook-driven capture of whole sessions; to manually sync chosen files or notes use context-sync."
---

# Raw Memory — automatic session capture

You help the user enable and manage the **Raw Memory collector** (`@aicoo/raw-memory` on npm).
Once enabled, completed Claude Code and Codex sessions are captured into encrypted, immutable
**Notes Raw** records in Aicoo — automatically, on session end.

Explain the model to the user in one or two lines when relevant:

- A one-time `enable` authorizes the device and installs `SessionEnd` hooks for Claude Code and Codex.
- From then on, every finished session is **redacted (Gitleaks) → client-encrypted (AES-256-GCM) → signed → queued with retry → uploaded**. No manual steps.
- Capture **fails closed**: if secret scanning, encryption, or signing cannot complete, nothing is uploaded. An occasional missing session is the protection working, not a bug.
- This skill is **not a sync loop**. Never schedule cron/loop jobs for Raw Memory — the installed hooks do all the work.

## Prerequisites

- Node.js 18+
- [Gitleaks](https://github.com/gitleaks/gitleaks) on `PATH`

```bash
node --version                      # need >= 18
gitleaks version 2>/dev/null || echo "MISSING gitleaks — brew install gitleaks (macOS)"
```

No API key is required: `enable` uses browser authorization. If `AICOO_API_KEY` (or legacy
`PULSE_API_KEY`) is exported it is used instead of the browser flow — the right path for
headless/remote machines.

## Step 1: Enable

```bash
npx @aicoo/raw-memory enable
```

Optional flags: `--name "<device name>"` (default: hostname), `--base-url <url>` or
`AICOO_BASE_URL` env (default `https://www.aicoo.io/`).

What happens, and what you must do:

1. **Browser authorization** (when no API key env var is set): the CLI prints
   `Open this URL to authorize Raw Memory:` followed by a URL on stderr, and tries to
   auto-open the browser. **Relay that URL to the user as a clickable link** — the
   auto-open can fail. The user approves in the browser; the CLI polls for up to 10 minutes.
   Do NOT send the user to register elsewhere or hunt for an API key.
2. **On success** the CLI prints one line of JSON on stdout:

   ```json
   {"command":"enable","enabled":true,"deviceId":"…","recoveryCode":"…","recoveryCodeStatus":"created","recoveryCodeCommand":null}
   ```

3. **Recovery code (critical)** — if `recoveryCode` is non-null (first enrollment for this
   account), show it to the user **once** and tell them to store it **outside this
   computer** (e.g. a password manager). It is the only way to recover encrypted records if
   the device keys are lost. **NEVER** write the recovery code into notes, memory files,
   Aicoo, or anything persistent. If `recoveryCodeStatus` is `"existing"`, account keys
   already exist and no new code is shown — it can be rotated with `recovery-code` below.

## Step 2: Codex only — trust the hook

Codex requires reviewing and trusting the newly installed hook from `/hooks` before its
first run. Claude Code needs no extra step; the hook is active for **new** sessions
(the session that ran `enable` was already started, so it may not be captured).

## Step 3: Verify

```bash
npx @aicoo/raw-memory status
# → {"command":"status","configured":true,"enabled":true,"deviceId":"…"}
```

Server-side check (requires auth — OAuth token or `AICOO_API_KEY`):

```bash
curl -s "https://www.aicoo.io/api/v1/raw-memory/devices" \
  -H "Authorization: Bearer $AICOO_API_KEY" | jq .
```

The enrolled device should be listed. The user can also see the device (and manage it) in
**Aicoo Settings → Integrations → Raw Memory**. For an end-to-end test: finish a short
session, then confirm a new Notes Raw record appears.

## Manage

```bash
npx @aicoo/raw-memory status         # local collector state
npx @aicoo/raw-memory disable        # remove hooks, delete stored credential, stop capture
npx @aicoo/raw-memory recovery-code  # rotate: prints a NEW code, the old one stops working
```

`recovery-code` output goes through the same handling as Step 1: show once, store outside
this machine, never persist.

Revoke a device server-side (e.g. a lost laptop):

```bash
curl -X DELETE "https://www.aicoo.io/api/v1/raw-memory/devices/{deviceId}" \
  -H "Authorization: Bearer $AICOO_API_KEY"
```

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Enable fails, `gitleaks` not found | Install Gitleaks (`brew install gitleaks`), re-run `enable` |
| `Raw Memory collector belongs to another account` | Device was enrolled under a different Aicoo account — run `disable` first, or sign in as the original account |
| Browser never opens | Use the URL the CLI printed; on headless boxes export `AICOO_API_KEY` and re-run |
| A session didn't upload | Fail-closed by design (redaction/encryption/signing failed), or the retry queue is backing off — check `status`, don't force anything |
| Codex sessions not captured | Hook not trusted yet — run `/hooks` in Codex and approve it |
| No Raw Memory card in Settings | Deployment may be behind; the CLI path above still works |

## Guardrails

- **Never** store, repeat into notes/memory, or upload the recovery code anywhere. Show once, instruct the user to save it off-machine.
- Never schedule sync jobs for Raw Memory; capture is hook-driven by design.
- Records are encrypted and immutable by design — do not attempt decryption or recovery workflows unless the user explicitly asks.
- `enable` is idempotent for the same account/device — safe to re-run after partial failures.

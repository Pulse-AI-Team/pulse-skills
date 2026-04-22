---
name: aicoo-sync
description: "Injects Aicoo sync reminder during agent bootstrap — checks staleness and suggests updates"
metadata: {"openclaw":{"emoji":"🔄","events":["agent:bootstrap"]}}
---

# Aicoo Sync Hook

Reminds the agent to check Aicoo knowledge freshness at session start.

## What It Does

- Fires on `agent:bootstrap` (before workspace files are injected)
- Checks if `PULSE_API_KEY` is available
- Adds a reminder to evaluate if Aicoo context is stale
- Suggests sync actions based on recent work

## Configuration

```bash
openclaw hooks enable aicoo-sync
```

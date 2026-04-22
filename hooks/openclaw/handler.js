/**
 * Aicoo Sync Hook for OpenClaw (JavaScript version)
 */

const REMINDER_CONTENT = `## Aicoo Sync Reminder

Your Aicoo agent shares knowledge with guests. Keep it current:

**After completing tasks, evaluate:**
- Decisions or preferences discussed? → Update existing Aicoo notes
- New project context? → Create note in relevant folder
- Architecture or tech choices? → Sync to Technical/ folder
- Meeting outcomes? → Create meeting notes

**Workflow:**
1. Search first: POST /os/notes/search {"query": "<topic>"}
2. If found: snapshot then edit — don't create duplicates
3. If new: POST /os/notes with clear title and content
4. For bulk changes: use POST /accumulate with file array

**Check staleness:** GET /os/status — if lastSyncedAt > 24h, do a sync pass.`;

module.exports = async function handler(event) {
  if (!event || typeof event !== 'object') return;
  if (event.type !== 'agent' || event.action !== 'bootstrap') return;
  if (!event.context || typeof event.context !== 'object') return;

  const sessionKey = event.sessionKey || '';
  if (sessionKey.includes(':subagent:')) return;

  if (Array.isArray(event.context.bootstrapFiles)) {
    event.context.bootstrapFiles.push({
      path: 'PULSE_SYNC_REMINDER.md',
      content: REMINDER_CONTENT,
      virtual: true,
    });
  }
};

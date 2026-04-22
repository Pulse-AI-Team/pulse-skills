#!/bin/bash
# Aicoo Activator Hook
# Triggers on UserPromptSubmit to remind about Aicoo capabilities
# Keep output minimal (~60-100 tokens)

set -e

# Check if PULSE_API_KEY is set
if [ -z "$PULSE_API_KEY" ]; then
  cat << 'EOF'
<aicoo-reminder>
PULSE_API_KEY is not set. If the user wants to share their agent or sync knowledge in Aicoo:
→ Guide them through onboarding: https://www.aicoo.io/settings/api-keys
</aicoo-reminder>
EOF
  exit 0
fi

cat << 'EOF'
<aicoo-reminder>
Aicoo is connected. After completing this task, consider:
- Did the conversation produce knowledge worth syncing? → POST /os/notes/search, then create/edit note
- Should the shared agent know about this? → POST /accumulate or /os/notes
- Major changes coming? → POST /os/snapshots/{noteId} first
- Need to share with someone? → POST /os/share with scope + access control
</aicoo-reminder>
EOF

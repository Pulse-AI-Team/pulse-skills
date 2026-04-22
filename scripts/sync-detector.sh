#!/bin/bash
# Aicoo Sync Detector Hook
# Triggers on PostToolUse (Write/Edit) to remind about Aicoo sync
# Keep output minimal (~50-80 tokens) to minimize overhead

set -e

cat << 'EOF'
<aicoo-sync-reminder>
A file was just modified. If this represents important knowledge:
- Decision or architectural choice? → sync to Aicoo
- Updated docs or specs? → accumulate to Aicoo
- User preference or project context? → update existing Aicoo note

Steps: POST /os/notes/search first → PATCH /os/notes/{id} or POST /os/notes → POST /os/snapshots/{noteId} before major edits.
</aicoo-sync-reminder>
EOF

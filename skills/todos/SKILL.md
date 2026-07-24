---
name: todos
description: "Use this skill when the user wants to list, search, create, edit, complete, or replan todos in Aicoo. Triggers on: 'todos', 'my tasks', 'task list', 'add todo', 'create todo', 'complete todo', 'mark done', 'replan', 'overdue tasks', 'what do I need to do', 'pending tasks', 'to-do list', 'check my todos'."
---
# Todos — Task Management

List, create, edit, complete, and replan todos using Aicoo OS endpoints.

## Prerequisites

- Sign in with Aicoo via `scripts/aicoo-login.mjs` (preferred), or set
  `AICOO_API_KEY` for non-interactive automation (`PULSE_API_KEY` remains a
  legacy fallback)
- Base URL: `https://www.aicoo.io/api/v1`

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/os/todos` | GET | List/search todos |
| `/os/todos` | POST | Create a todo |
| `/os/todos/{id}` | PATCH | Edit a todo |
| `/os/todos/{id}/complete` | POST | Mark todo complete |
| `/os/todos/replan` | POST | Replan overdue todos |

## List Todos

```bash
# All incomplete todos
curl -s "https://www.aicoo.io/api/v1/os/todos?limit=20&completed=false" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" | jq .

# Search by keyword
curl -s "https://www.aicoo.io/api/v1/os/todos?q=investor&limit=20" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" | jq .

# Filter by priority (1=highest)
curl -s "https://www.aicoo.io/api/v1/os/todos?priority=1&limit=10" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" | jq .

# Include completed
curl -s "https://www.aicoo.io/api/v1/os/todos?completed=true&limit=50" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" | jq .
```

## Create a Todo

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/todos" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Prepare investor packet","priority":1}' | jq .
```

Fields:
- `title` (required): task description
- `priority` (optional): 1 (highest) to 4 (lowest)
- `dueDate` (optional): ISO 8601 date string
- `notes` (optional): additional context

## Edit a Todo

```bash
curl -s -X PATCH "https://www.aicoo.io/api/v1/os/todos/42" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated title","priority":2,"dueDate":"2026-05-10"}' | jq .
```

## Complete a Todo

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/todos/42/complete" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" | jq .
```

## Replan Overdue Todos

Reschedule overdue items intelligently:

```bash
curl -s -X POST "https://www.aicoo.io/api/v1/os/todos/replan" \
  -H "Authorization: Bearer ${AICOO_API_KEY:-$PULSE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

## Workflow: Sync Local Todos to Aicoo

When the user has a local todo list (markdown, text file, etc.) and wants it in Aicoo:

1. Read the local file
2. Parse each todo item
3. POST each to `/os/todos` with appropriate priority and due date
4. Report what was created

## Presentation

When listing todos, group by status and priority:

```
Pending (5 items)
  P1: Prepare investor packet (due May 5)
  P1: Fix production auth bug
  P2: Review PR #280
  P3: Update onboarding docs
  P4: Clean up old branches

Completed today (2 items)
  Done: Deploy guest identity fix
  Done: Write LLM judge docs
```

---
name: compile-identity
description: "Use this skill when the user wants to hand a session off to another agent, share their working context, compile a session into something another agent can read, write a POSITIONS file, record which decisions were overruled, prepare a handoff folder, or measure whether a shared folder actually transfers their judgment. Triggers on: 'hand this off', 'share my context', 'compile this session', 'POSITIONS.md', 'what did we decide', 'another agent needs to pick this up', 'agent handoff', 'make this readable by another agent'."
user-invokable: true
metadata:
  author: systemind
  version: "1.0.0"
---

# Compile Identity

Turn a working session into a folder another agent can read and act on.

## When this is worth doing — read this first

Measured on a 63-hour session, 100 pre-registered questions, blind-graded:

| Reader | raw transcript only | + compiled layer | Δ |
|---|---|---|---|
| Opus 5 / Sonnet 5 / Fable 5 (fetches and parses the page itself) | 95–96 | 95–100 | **+0 to +4** |
| Aicoo guest agent behind the share link | 16 | 59 | **+43** |

**A capable agent handed the raw transcript does not need this.** It scores 96/100 without
any compilation, and the compiled layer buys ~2 points that do not reach significance
(19 divergences pooled across three models, 13–6, sign test p = 0.17).

Compile when the reader is weak, when the reader cannot hold the whole transcript, or when
you need the positions to survive without the reasoning that produced them. Do not compile
because it feels thorough. Export, share the link, and stop — that is the default.

Prerequisite: `AICOO_API_KEY` in the environment. Reference the variable — never
paste the literal key into a command, because tool inputs are exported verbatim.

## Step 1 — Export the session

The exporter ships with this skill at `assets/export/session-export.mjs`. Resolve its
real path from wherever the pack is installed — do not hardcode a plugin directory.

```bash
node "$(dirname "$(find ~ -path '*aicoo*/assets/export/session-export.mjs' 2>/dev/null | head -1)")/session-export.mjs" \
  --layout episodes --folder "Agents/<name>"
```

If you only want the transcript shared and nothing compiled, stop after this step —
the export alone scores 96/100 with a capable reader, and steps 2–4 are what the
remaining 4 points cost.

Episodes, not one note: one file per user turn plus a `CHATS.md` index. Tool inputs and
outputs go in whole — a reader that cannot see the actual command and its actual output
cannot verify anything the transcript claims. Nothing is redacted; **the folder you put it
in is the access control**. Keep secrets out of the transcript by referencing
`$AICOO_API_KEY`, never by pasting the literal.

`--max-episodes N` truncates. Use it only for A/B material control, and know that it does
not produce a clean control if the session discusses its own methods (see *Known limits*).

## Step 2 — Write the five files

They sit beside `CHATS.md` in the same folder. Written by hand, or by an agent that just
read the transcript. Total ~1,200 lines for a 63-hour session.

### `AGENT.md` — the entry point (~40 lines)

Name, one-paragraph description, **Link Policy**, and a summary. Its only real job is the
read order, stated as a command, not a suggestion:

```markdown
## Link Policy
Read order — do not skip this. Start at `POSITIONS.md`. It states what is currently held
and what was overruled. Only then open `CHATS.md` and the episodes you need.
Do not rely on semantic search alone: list the folder, then read the file.
When the transcript and POSITIONS disagree, POSITIONS wins.
```

That last line is load-bearing. Readers apply it unprompted — one resolved a numeric
conflict between two files by citing this rule without being asked.

### `POSITIONS.md` — the only file that carries information the transcript lacks

One entry per claim. Three sections: **current**, **superseded**, **open**.

```markdown
### <the claim, written as one sentence that could be refuted>
status: current | superseded-by → <id> | open
confidence: high | medium | low   (+ one clause of justification)
source: user-ruling | agent-proposed
evidence: <file:line, a quote, or a measurement — something checkable>
<if superseded: why it was overruled, in one line>
```

Two fields do the work:

- **`status`** — `superseded-by` must point at an id that exists. An orphan status is the
  worst defect in the file, because it reads as authoritative and points nowhere.
- **`source`** — `user-ruling` outranks `agent-proposed`. This is what lets a reader
  resolve a reversal correctly: the abandoned side of a u-turn is always argued at far
  greater length than the one line that killed it, so length is an actively misleading
  signal and provenance is the correction.

Rank the superseded section by how often each dead position gets re-invented. Two models
independently re-proposed the same killed design in testing; labelling it *"the most
frequently re-invented dead position"* is the single highest-value sentence in the file,
because it exists nowhere in the transcript.

### `PROGRESSION.md` — what happened in order

Chronological, one line per real move. Its job is letting a reader ask *"was this before or
after the reversal?"* without reading 60 episodes.

### `TOOLS.md` — the capability contract

What this agent can and cannot do, stated as an asymmetry. Not a feature list — the point
is what a reader should not ask for.

### `ASSETS.md` — pointers, never payloads

Files, links, artifacts, each keyed by **why it mattered**, not by what it is. `ASSETS.md`
holds paths; the bytes stay where they are.

## Step 3 — Upload and share

```bash
curl -X POST https://www.aicoo.io/api/v1/accumulate \
  -H "Authorization: Bearer $AICOO_API_KEY" -H 'Content-Type: application/json' \
  -d @payload.json
```

Max 50 files per request, 10 MB each — batch above that. Then create a folder-scoped share
link and **anchor `noteId` on a real note in the folder** (e.g. `CHATS.md`). Anchoring on
the profile makes the page render only "About Me" with no folder contents.

One token yields two doors: `/shared/<token>` is the document reader, `/a/<token>` is the
chat. Open `/shared/` yourself before sending it — what you see there is what the other
side's agent can read.

## Step 4 — Verify it transferred

Do not ship on vibes. Write the questions **before** you look at the answers.

Per question, pre-register a `key` (the claim a correct answer must assert) and a `trap`
(a claim whose presence fails it). Score `key AND NOT trap`, no partial credit, and hold
the line that **a fluent wrong answer scores below an honest "not covered."**

Two question types carry nearly all the signal:

- **u-turn probes** — phrase the question in the vocabulary of the position you killed, so
  semantic search lands on the passage arguing for it.
- **false-premise questions** — assert the dead position *as fact* and ask a follow-up
  detail. The only correct move is to reject the premise.

Grade blind: assign each answer to slot P or Q by coin flip per question, hold the mapping
back, and give the grader only the key/trap. If a difference appears, **re-grade with the
slots swapped and the grading order reversed** — an effect that follows the arm is real, an
effect that follows the slot is grader primacy bias.

Require every reader to return a `_notes` field describing what it actually retrieved:
bytes, note count, what it read in full versus skimmed, what failed. This is the
highest-value instrument in the whole procedure — it caught three experiment-invalidating
faults that no amount of after-the-fact auditing had surfaced.

## Known limits

- **A session that analyses itself cannot be its own control.** If the session produced
  documents about its own decisions, those documents are in the transcript, and so is the
  method for compiling them. No truncation point removes one without removing the other.
- **`_notes` is evidence, not ground truth.** One reader reported reading `POSITIONS.md`
  in full and quoted a sentence from it. Neither the file nor the sentence was on its page —
  it had reconstructed the claim from raw evidence and credited the document that would
  have contained it. Verify self-reports against the page.
- **Anything the subject can read is part of the stimulus**, identifiers included. An eval
  harness that puts the arm name in the visitor id has leaked the condition.
- **This fixes recall, not premise-checking.** Compiled positions move "what is the design
  for X?" from 0/30 to 26/30. They move "given X is the design, what about Y?" from 0/9 to
  1/9. The failure happens before retrieval fires — the agent never asks the question that
  would send it to the folder. That needs a policy-level fix, not more content.
- **Reading an Aicoo `/shared/` page programmatically is hostile when the content has CJK
  text.** Note bodies are RSC `T<hexlen>,` rows where the length is in **UTF-8 bytes**; a
  character-based parser desynchronises and silently recovers ~1 row in 50, with no error.
  Two models hit this independently. Tell any reader to sanity-check its byte count.

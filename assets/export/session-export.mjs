#!/usr/bin/env node
/**
 * Session Export
 *
 * One explicit, user-initiated export of a single agent session into an Aicoo
 * note, so a shared agent can read the conversation that produced a piece of
 * work.
 *
 * This is deliberately NOT a background capture pipeline. There is no hook, no
 * watcher, and no schedule: the user runs it, once, for one session. The act of
 * running it is the consent.
 *
 * Usage:
 *   node session-export.mjs [--session <id>] [--transcript <path>]
 *                           [--folder <name>] [--title <text>]
 *                           [--summary-file <path>] [--out <path>]
 *                           [--dry-run] [--json]
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';

const DEFAULT_BASE_URL = 'https://www.aicoo.io/api/v1';
const DEFAULT_FOLDER = 'Sessions';
// Tool inputs and results are exported whole. Splitting the session into one
// note per episode removes the size pressure that made clipping worth it, and a
// reader that cannot see the actual command and its actual output cannot verify
// anything the transcript claims.
const MAX_TOOL_INPUT_CHARS = Number.POSITIVE_INFINITY;
const MAX_TOOL_RESULT_CHARS = Number.POSITIVE_INFINITY;

// Transcript line types that carry conversation. Everything else in the JSONL
// is harness bookkeeping (queue operations, generated titles, attachments).
const CONVERSATION_TYPES = new Set(['user', 'assistant']);

// Tool inputs whose value is a path worth listing in the manifest.
const PATH_KEYS = ['file_path', 'notebook_path', 'path'];

// ─── Args ─────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    session: null,
    transcript: null,
    folder: DEFAULT_FOLDER,
    title: null,
    summaryFile: null,
    out: null,
    layout: 'episodes',
    maxEpisodes: null,
    dryRun: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--session') args.session = next();
    else if (arg === '--transcript') args.transcript = next();
    else if (arg === '--layout') args.layout = next();
    else if (arg === '--max-episodes') args.maxEpisodes = Number(next());
    else if (arg === '--folder') args.folder = next();
    else if (arg === '--title') args.title = next();
    else if (arg === '--summary-file') args.summaryFile = next();
    else if (arg === '--out') args.out = next();
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

// ─── Transcript discovery ─────────────────────────────────

/**
 * Claude Code stores transcripts under a per-project directory whose name is
 * the absolute cwd with every `/` and `_` replaced by `-`.
 */
export function projectSlug(cwd) {
  return cwd.replace(/[/_]/g, '-');
}

function jsonlFilesIn(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.jsonl'))
    .map((name) => {
      const full = join(dir, name);
      return { path: full, sessionId: basename(name, '.jsonl'), mtimeMs: statSync(full).mtimeMs };
    });
}

export function resolveTranscript({ transcript, session, cwd, env = process.env }) {
  if (transcript) {
    if (!existsSync(transcript)) throw new Error(`Transcript not found: ${transcript}`);
    return { path: transcript, sessionId: basename(transcript, '.jsonl') };
  }

  const projectsRoot = join(env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects');
  const sessionId = session || env.CLAUDE_SESSION_ID || null;
  const scoped = jsonlFilesIn(join(projectsRoot, projectSlug(cwd)));

  if (sessionId) {
    // Prefer this project, but an explicit id is unambiguous anywhere: a session
    // started from a different cwd is still the user's to export.
    const hit = scoped.find((f) => f.sessionId === sessionId)
      || allProjectFiles(projectsRoot).find((f) => f.sessionId === sessionId);
    if (!hit) throw new Error(`No transcript found for session ${sessionId}`);
    return hit;
  }

  const newest = scoped.sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  if (!newest) throw new Error(`No transcript found under ${projectsRoot} for ${cwd}`);
  return newest;
}

function allProjectFiles(projectsRoot) {
  if (!existsSync(projectsRoot)) return [];
  return readdirSync(projectsRoot).flatMap((dir) => jsonlFilesIn(join(projectsRoot, dir)));
}

// ─── Parsing ──────────────────────────────────────────────

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n');
}

function stripSystemReminders(text) {
  // Harness-injected context, not something the user or the agent said.
  return text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
}

function clip(value, max) {
  const str = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  if (typeof str !== 'string') return '';
  if (str.length <= max) return str;
  return `${str.slice(0, max)}\n… [${str.length - max} more chars]`;
}

function toolResultText(block) {
  const content = block?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === 'string' ? c : c?.text ?? ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

const normalize = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();

export function parseTranscript(raw) {
  const turns = [];
  const meta = { sessionId: null, cwd: null, gitBranch: null, version: null, sidechainLines: 0 };
  const toolUses = new Map();
  // Everything the user typed, in order. A message delivered mid-turn is
  // enqueued and then `remove`d rather than dequeued, so it never becomes a
  // `user` entry — the queue is the only place it survives.
  const queued = [];
  let firstTs = null;
  let lastTs = null;

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // a partially-written trailing line is not a reason to fail
    }

    if (entry.type === 'queue-operation') {
      if (entry.operation === 'enqueue' && typeof entry.content === 'string' && entry.content.trim()) {
        queued.push({ content: entry.content, ts: entry.timestamp ?? null });
      }
      continue;
    }

    if (!CONVERSATION_TYPES.has(entry.type)) continue;
    if (entry.isSidechain) {
      meta.sidechainLines += 1;
      continue; // subagent traffic is its own conversation, not this one
    }

    meta.sessionId ||= entry.sessionId ?? null;
    meta.cwd ||= entry.cwd ?? null;
    meta.gitBranch ||= entry.gitBranch ?? null;
    meta.version ||= entry.version ?? null;
    if (entry.timestamp) {
      firstTs ||= entry.timestamp;
      lastTs = entry.timestamp;
    }

    const message = entry.message;
    if (!message || typeof message !== 'object') continue;
    const content = message.content;
    const blocks = Array.isArray(content) ? content : [];

    if (message.role === 'user') {
      const results = blocks.filter((b) => b?.type === 'tool_result');
      if (results.length > 0) {
        for (const block of results) {
          const use = toolUses.get(block.tool_use_id);
          if (use) {
            use.result = clip(toolResultText(block), MAX_TOOL_RESULT_CHARS);
            use.isError = Boolean(block.is_error);
          }
        }
        continue; // tool results attach to their call, they are not a user turn
      }
      const text = stripSystemReminders(textOf(content));
      if (text) turns.push({ role: 'user', text, ts: entry.timestamp ?? null });
      continue;
    }

    if (message.role === 'assistant') {
      const text = textOf(content);
      if (text.trim()) turns.push({ role: 'assistant', text: text.trim(), ts: entry.timestamp ?? null });
      for (const block of blocks) {
        if (block?.type !== 'tool_use') continue;
        const use = {
          role: 'tool',
          name: block.name,
          input: clip(block.input, MAX_TOOL_INPUT_CHARS),
          rawInput: block.input,
          result: null,
          isError: false,
          ts: entry.timestamp ?? null,
        };
        toolUses.set(block.id, use);
        turns.push(use);
      }
    }
  }

  // Splice back any typed message that never reached the `user` stream, at the
  // point in the conversation where it was actually sent.
  const ordered = turns.map((turn, index) => ({ turn, index, ts: turn.ts }));
  for (const item of queued) {
    const normalized = normalize(item.content);
    if (!normalized) continue;
    const alreadyPresent = turns.some(
      (t) => t.role === 'user' && normalize(t.text).startsWith(normalized)
    );
    if (alreadyPresent) continue;
    // Position it after the last turn that predates it.
    const priorCount = item.ts ? turns.filter((t) => t.ts && t.ts <= item.ts).length : turns.length;
    ordered.push({
      turn: { role: 'user', text: item.content, ts: item.ts, midTurn: true },
      index: priorCount - 0.5,
      ts: item.ts,
    });
    meta.midTurnMessages = (meta.midTurnMessages ?? 0) + 1;
  }
  ordered.sort((a, b) => a.index - b.index);

  meta.startedAt = firstTs;
  meta.endedAt = lastTs;
  return { turns: ordered.map((o) => o.turn), meta };
}

// ─── Manifest ─────────────────────────────────────────────

export function buildManifest(turns) {
  const tools = new Map();
  const files = new Set();
  const endpoints = new Set();

  for (const turn of turns) {
    if (turn.role !== 'tool') continue;
    tools.set(turn.name, (tools.get(turn.name) ?? 0) + 1);

    const input = turn.rawInput;
    if (!input || typeof input !== 'object') continue;
    for (const key of PATH_KEYS) {
      if (typeof input[key] === 'string') files.add(input[key]);
    }
    const flat = JSON.stringify(input);
    for (const match of flat.matchAll(/https?:\/\/[^\s"'\\)]+/g)) endpoints.add(match[0]);
  }

  return {
    tools: [...tools.entries()].sort((a, b) => b[1] - a[1]),
    files: [...files].sort(),
    endpoints: [...endpoints].sort(),
  };
}

// ─── Rendering ────────────────────────────────────────────

function fence(text) {
  // Pick a fence longer than any run of backticks inside the payload.
  const longest = Math.max(0, ...[...String(text).matchAll(/`+/g)].map((m) => m[0].length));
  return '`'.repeat(Math.max(3, longest + 1));
}

export function renderMarkdown({ turns, meta, manifest, title, summary }) {
  const lines = [];
  const userTurns = turns.filter((t) => t.role === 'user');
  const assistantTurns = turns.filter((t) => t.role === 'assistant');
  const toolTurns = turns.filter((t) => t.role === 'tool');

  lines.push(`# ${title}`);
  lines.push('');
  lines.push('| | |');
  lines.push('|---|---|');
  lines.push(`| Session | \`${meta.sessionId ?? 'unknown'}\` |`);
  if (meta.cwd) lines.push(`| Project | \`${meta.cwd}\` |`);
  if (meta.gitBranch) lines.push(`| Branch | \`${meta.gitBranch}\` |`);
  if (meta.startedAt) lines.push(`| Started | ${meta.startedAt} |`);
  if (meta.endedAt) lines.push(`| Ended | ${meta.endedAt} |`);
  lines.push(`| Turns | ${userTurns.length} user · ${assistantTurns.length} assistant · ${toolTurns.length} tool calls |`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(summary?.trim() || '_No summary provided._');
  lines.push('');

  lines.push('## Progression');
  lines.push('');
  if (userTurns.length === 0) {
    lines.push('_No user turns._');
  } else {
    userTurns.forEach((turn, i) => {
      const firstLine = turn.text.split('\n').find((l) => l.trim()) ?? '';
      lines.push(`${i + 1}. ${firstLine.slice(0, 200)}`);
    });
  }
  lines.push('');

  lines.push('## Tools used');
  lines.push('');
  if (manifest.tools.length === 0) {
    lines.push('_None._');
  } else {
    for (const [name, count] of manifest.tools) lines.push(`- \`${name}\` × ${count}`);
  }
  lines.push('');

  lines.push('## Files touched');
  lines.push('');
  if (manifest.files.length === 0) lines.push('_None._');
  else for (const file of manifest.files) lines.push(`- \`${file}\``);
  lines.push('');

  if (manifest.endpoints.length > 0) {
    lines.push('## Endpoints');
    lines.push('');
    for (const url of manifest.endpoints) lines.push(`- ${url}`);
    lines.push('');
  }

  lines.push('## Transcript');
  lines.push('');
  for (const turn of turns) {
    if (turn.role === 'user') {
      lines.push(turn.midTurn ? '### User (sent mid-turn)' : '### User');
      lines.push('');
      lines.push(turn.text);
      lines.push('');
    } else if (turn.role === 'assistant') {
      lines.push('### Assistant');
      lines.push('');
      lines.push(turn.text);
      lines.push('');
    } else {
      const status = turn.isError ? ' — error' : '';
      lines.push(`<details><summary>🔧 <code>${turn.name}</code>${status}</summary>`);
      lines.push('');
      const inFence = fence(turn.input);
      lines.push(`${inFence}json`);
      lines.push(turn.input);
      lines.push(inFence);
      if (turn.result) {
        lines.push('');
        const outFence = fence(turn.result);
        lines.push(outFence);
        lines.push(turn.result);
        lines.push(outFence);
      }
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── Episodes (PRD layer L2/L3: CHATS.md + chats/*.md) ────

/**
 * Absolute + relative time for one message. The relative offset is what makes a
 * long session scannable — "+4h12m" says more about pacing than a wall clock.
 */
function stamp(ts, startTs) {
  if (!ts) return { abs: '', rel: '', both: '' };
  const at = new Date(ts);
  const abs = `${at.toISOString().slice(0, 16).replace('T', ' ')}Z`;
  let rel = '';
  if (startTs) {
    const minutes = Math.max(0, Math.round((at - new Date(startTs)) / 60000));
    rel = minutes < 60 ? `+${minutes}m` : `+${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`;
  }
  return { abs, rel, both: rel ? `${abs} · ${rel}` : abs };
}

/**
 * One episode = one user turn and everything the agent did before the next one.
 * That boundary is the natural unit of "what was asked, and what happened".
 */
/**
 * Slash commands arrive as several consecutive user entries (caveat, command
 * name, args, stdout). They are one action, so they get one episode.
 */
const LOCAL_COMMAND_RE = /^\s*<(local-command-caveat|command-name|command-message|command-args|local-command-stdout|local-command-stderr)>/;

export function buildEpisodes(turns) {
  const episodes = [];
  let current = null;

  for (const turn of turns) {
    if (turn.role === 'user') {
      const isLocalCommand = LOCAL_COMMAND_RE.test(turn.text);
      if (isLocalCommand && current?.localCommand) {
        current.user.text += `\n${turn.text}`;
        continue;
      }
      current = { user: { ...turn }, turns: [], ts: turn.ts, localCommand: isLocalCommand };
      episodes.push(current);
      continue;
    }
    // Anything before the first user turn belongs to a preamble episode.
    if (!current) {
      current = { user: null, turns: [], ts: turn.ts };
      episodes.push(current);
    }
    current.turns.push(turn);
  }

  return episodes.map((episode, index) => {
    const tools = episode.turns.filter((t) => t.role === 'tool');
    const toolNames = [...new Set(tools.map((t) => t.name))];
    const files = new Set();
    for (const tool of tools) {
      const input = tool.rawInput;
      if (!input || typeof input !== 'object') continue;
      for (const key of PATH_KEYS) if (typeof input[key] === 'string') files.add(input[key]);
    }
    const commandName = episode.localCommand
      ? /<command-name>([^<]+)<\/command-name>/.exec(episode.user?.text || '')?.[1]?.trim()
      : null;
    const ask = commandName
      ? `(local command ${commandName})`
      : (episode.user?.text || '').split('\n').find((l) => l.trim()) || '(no user message)';
    return {
      ...episode,
      index: index + 1,
      ask,
      toolNames,
      toolCount: tools.length,
      files: [...files],
      assistantCount: episode.turns.filter((t) => t.role === 'assistant').length,
    };
  });
}

function episodeSlug(episode) {
  const raw = episode.ask.replace(/\s+/g, ' ').trim();
  // Keep CJK and word characters; the note title is the retrieval surface, so a
  // readable fragment beats a hash.
  const cleaned = raw.replace(/[/\\:*?"<>|#\[\]]/g, '').slice(0, 42).trim();
  return `${String(episode.index).padStart(2, '0')} ${cleaned || 'episode'}`;
}

function renderTurnBody(turn, startTs, lines) {
  if (turn.role === 'assistant') {
    lines.push(`### Assistant · ${stamp(turn.ts, startTs).both}`);
    lines.push('');
    lines.push(turn.text);
    lines.push('');
    return;
  }
  const status = turn.isError ? ' — error' : '';
  lines.push(`#### 🔧 \`${turn.name}\`${status} · ${stamp(turn.ts, startTs).both}`);
  lines.push('');
  const inFence = fence(turn.input);
  lines.push(`${inFence}json`);
  lines.push(turn.input);
  lines.push(inFence);
  if (turn.result) {
    lines.push('');
    const outFence = fence(turn.result);
    lines.push(outFence);
    lines.push(turn.result);
    lines.push(outFence);
  }
  lines.push('');
}

export function renderEpisode(episode, meta) {
  const lines = [];
  const startTs = meta.startedAt;
  lines.push(`# ${episodeSlug(episode)}`);
  lines.push('');
  lines.push(`> Episode ${episode.index} · ${stamp(episode.ts, startTs).both} · session \`${meta.sessionId}\``);
  lines.push('');

  if (episode.user) {
    lines.push(`### User${episode.user.midTurn ? ' (sent mid-turn)' : ''} · ${stamp(episode.user.ts, startTs).both}`);
    lines.push('');
    lines.push(episode.user.text);
    lines.push('');
  }

  for (const turn of episode.turns) renderTurnBody(turn, startTs, lines);

  return lines.join('\n');
}

export function renderChatsIndex(episodes, meta, title) {
  const lines = [];
  const startTs = meta.startedAt;
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`Session \`${meta.sessionId}\`${meta.cwd ? ` · \`${meta.cwd}\`` : ''}${meta.gitBranch ? ` · \`${meta.gitBranch}\`` : ''}`);
  lines.push('');
  lines.push(`${stamp(meta.startedAt).abs} → ${stamp(meta.endedAt).abs} · ${episodes.length} episodes`);
  lines.push('');
  lines.push('Each episode is one user turn and everything that followed it, in `chats/`.');
  lines.push('Read this index first, then open only the episodes you need.');
  lines.push('');
  lines.push('| # | When | Asked | Tools | Files |');
  lines.push('|---|------|-------|-------|-------|');
  for (const episode of episodes) {
    const when = stamp(episode.ts, startTs);
    const ask = episode.ask.replace(/\|/g, '\\|').slice(0, 90);
    const tools = episode.toolNames.slice(0, 4).join(', ') + (episode.toolNames.length > 4 ? ' …' : '');
    lines.push(
      `| ${String(episode.index).padStart(2, '0')} | ${when.rel || when.abs} | ${ask} | ${tools || '—'} | ${episode.files.length || '—'} |`
    );
  }
  lines.push('');
  return lines.join('\n');
}

// ─── Upload ───────────────────────────────────────────────

// The accumulate endpoint caps a request at 50 files. A long session exceeds that,
// so the upload is chunked and the per-chunk results are summed.
const MAX_FILES_PER_REQUEST = 50;

async function uploadFiles(files, env = process.env) {
  const apiKey = env.AICOO_API_KEY;
  if (!apiKey) throw new Error('AICOO_API_KEY is not set.');
  const baseUrl = (env.AICOO_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  const totals = { success: true, created: 0, updated: 0, skipped: 0, errors: [], batches: 0 };

  for (let start = 0; start < files.length; start += MAX_FILES_PER_REQUEST) {
    const batch = files.slice(start, start + MAX_FILES_PER_REQUEST);
    const response = await fetch(`${baseUrl}/accumulate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: batch }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        `Upload failed on batch ${totals.batches + 1} (${response.status}): ${body.message || body.error || 'unknown error'}`
      );
    }
    totals.created += body.created ?? 0;
    totals.updated += body.updated ?? 0;
    totals.skipped += body.skipped ?? 0;
    if (Array.isArray(body.errors)) totals.errors.push(...body.errors);
    totals.batches += 1;
  }

  return totals;
}

async function uploadNote({ title, content, folder, env = process.env }) {
  const apiKey = env.AICOO_API_KEY;
  if (!apiKey) throw new Error('AICOO_API_KEY is not set.');
  const baseUrl = (env.AICOO_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  const response = await fetch(`${baseUrl}/accumulate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: [{ title, content, folder }] }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}): ${body.message || body.error || 'unknown error'}`);
  }
  return body;
}

// ─── Main ─────────────────────────────────────────────────

const HELP = `Session Export — export one agent session into Aicoo notes.

  --session <id>         Session id to export (default: newest in this project)
  --transcript <path>    Explicit transcript file instead of auto-discovery
  --layout <mode>        "episodes" (default) writes CHATS.md + chats/NN.md;
                         "single" writes one combined note
  --folder <name>        Target folder (default: ${DEFAULT_FOLDER})
  --title <text>         Note/index title (default: derived from session + date)
  --summary-file <path>  Summary section (single layout only)
  --out <path>           Also write the rendered markdown here (single layout)
  --dry-run              Render and report, but do not upload
  --json                 Machine-readable output
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  const found = resolveTranscript({
    transcript: args.transcript,
    session: args.session,
    cwd: process.cwd(),
  });

  const raw = readFileSync(found.path, 'utf8');
  const { turns, meta } = parseTranscript(raw);
  meta.sessionId ||= found.sessionId;

  if (turns.length === 0) throw new Error(`Transcript ${found.path} has no conversation turns.`);

  const manifest = buildManifest(turns);
  const dateStamp = (meta.startedAt || new Date().toISOString()).slice(0, 10);
  const title = args.title || `Session ${dateStamp} — ${basename(meta.cwd || 'session')}`;

  const report = {
    transcript: found.path,
    sessionId: meta.sessionId,
    layout: args.layout,
    folder: args.folder,
    title,
    userTurns: turns.filter((t) => t.role === 'user').length,
    assistantTurns: turns.filter((t) => t.role === 'assistant').length,
    toolCalls: turns.filter((t) => t.role === 'tool').length,
    sidechainLinesSkipped: meta.sidechainLines,
    files: manifest.files.length,
    uploaded: false,
  };

  if (args.layout === 'episodes') {
    // PRD layers: CHATS.md is the L2 index, chats/*.md are the L3 episodes.
    let episodes = buildEpisodes(turns);
    // A session that later writes files *about* itself embeds those files in its own
    // transcript. Exporting the whole thing then puts the compiled layer inside the
    // control group. `--max-episodes` cuts the export before that point so a control
    // and a treatment can share the same underlying material.
    if (args.maxEpisodes && args.maxEpisodes > 0) {
      episodes = episodes.slice(0, args.maxEpisodes);
      report.truncatedTo = args.maxEpisodes;
    }
    const base = `${args.folder}/${title}`;
    const payload = [
      { path: `${base}/CHATS.md`, content: renderChatsIndex(episodes, meta, title) },
      ...episodes.map((episode) => ({
        path: `${base}/chats/${episodeSlug(episode)}.md`,
        content: renderEpisode(episode, meta),
      })),
    ];

    report.episodes = episodes.length;
    report.notes = payload.length;
    report.base = base;
    report.bytes = payload.reduce((sum, f) => sum + Buffer.byteLength(f.content, 'utf8'), 0);

    if (args.out) writeFileSync(args.out, payload[0].content, 'utf8');
    if (!args.dryRun) {
      report.result = await uploadFiles(payload);
      report.uploaded = true;
    }
  } else {
    const summary = args.summaryFile ? readFileSync(args.summaryFile, 'utf8') : null;
    const content = renderMarkdown({ turns, meta, manifest, title, summary });
    report.bytes = Buffer.byteLength(content, 'utf8');
    if (args.out) writeFileSync(args.out, content, 'utf8');
    if (!args.dryRun) {
      report.result = await uploadNote({ title, content, folder: args.folder });
      report.uploaded = true;
    }
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return;
  }

  process.stdout.write(
    `${report.uploaded ? 'Exported' : 'Rendered (dry run)'}: ${title}\n` +
      `  session   ${report.sessionId}\n` +
      `  layout    ${report.layout}\n` +
      `  target    ${report.base ?? report.folder}\n` +
      (report.notes ? `  notes     ${report.notes} (1 index + ${report.episodes} episodes)\n` : '') +
      `  turns     ${report.userTurns} user · ${report.assistantTurns} assistant · ${report.toolCalls} tool calls\n` +
      `  size      ${(report.bytes / 1024).toFixed(1)} KB\n` +
      (report.out ? `  written   ${report.out}\n` : '')
  );
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`session-export: ${error.message}\n`);
    process.exit(1);
  });
}

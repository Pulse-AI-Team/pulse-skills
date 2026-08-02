import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  projectSlug,
  parseTranscript,
  buildManifest,
  renderMarkdown,
} from '../session-export.mjs';

const line = (value) => `${JSON.stringify(value)}\n`;

function transcript(entries) {
  return entries.map(line).join('');
}

const userEntry = (text, ts, extra = {}) => ({
  type: 'user',
  sessionId: 's1',
  cwd: '/repo',
  gitBranch: 'dev',
  timestamp: ts,
  message: { role: 'user', content: text },
  ...extra,
});

const assistantEntry = (blocks, ts, extra = {}) => ({
  type: 'assistant',
  sessionId: 's1',
  timestamp: ts,
  message: { role: 'assistant', content: blocks },
  ...extra,
});

test('projectSlug replaces slashes and underscores', () => {
  assert.equal(projectSlug('/Users/x/my_workspace/pulse'), '-Users-x-my-workspace-pulse');
});

test('a mid-turn message is recovered from the queue and placed in order', () => {
  const raw = transcript([
    { type: 'queue-operation', operation: 'enqueue', content: 'first question', timestamp: '2026-01-01T00:00:00Z' },
    userEntry('first question', '2026-01-01T00:00:01Z'),
    assistantEntry([{ type: 'text', text: 'working on it' }], '2026-01-01T00:00:02Z'),
    // Delivered while the turn was running: enqueued, then removed, never a `user` entry.
    { type: 'queue-operation', operation: 'enqueue', content: 'go', timestamp: '2026-01-01T00:00:03Z' },
    { type: 'queue-operation', operation: 'remove', content: 'go', timestamp: '2026-01-01T00:00:04Z' },
    assistantEntry([{ type: 'text', text: 'done' }], '2026-01-01T00:00:05Z'),
  ]);

  const { turns, meta } = parseTranscript(raw);
  const users = turns.filter((t) => t.role === 'user');

  assert.deepEqual(users.map((t) => t.text), ['first question', 'go']);
  assert.equal(meta.midTurnMessages, 1);
  assert.equal(users[1].midTurn, true);
  // Ordering: it belongs after the first assistant reply, before the last one.
  const texts = turns.map((t) => t.text);
  assert.ok(texts.indexOf('go') > texts.indexOf('working on it'));
  assert.ok(texts.indexOf('go') < texts.indexOf('done'));
});

test('a queued message that did reach the user stream is not duplicated', () => {
  const raw = transcript([
    { type: 'queue-operation', operation: 'enqueue', content: 'hello there', timestamp: '2026-01-01T00:00:00Z' },
    { type: 'queue-operation', operation: 'dequeue', timestamp: '2026-01-01T00:00:01Z' },
    userEntry('hello there\n\n<system-reminder>ignore me</system-reminder>', '2026-01-01T00:00:02Z'),
  ]);

  const { turns, meta } = parseTranscript(raw);
  const users = turns.filter((t) => t.role === 'user');

  assert.equal(users.length, 1);
  assert.equal(users[0].text, 'hello there');
  assert.equal(meta.midTurnMessages, undefined);
});

test('reasoning blocks and subagent traffic are excluded', () => {
  const raw = transcript([
    userEntry('question', '2026-01-01T00:00:00Z'),
    assistantEntry(
      [
        { type: 'thinking', thinking: 'private reasoning that must not ship' },
        { type: 'text', text: 'the answer' },
      ],
      '2026-01-01T00:00:01Z'
    ),
    assistantEntry([{ type: 'text', text: 'subagent chatter' }], '2026-01-01T00:00:02Z', { isSidechain: true }),
  ]);

  const { turns, meta } = parseTranscript(raw);

  assert.equal(turns.filter((t) => t.role === 'assistant').length, 1);
  assert.equal(turns.find((t) => t.role === 'assistant').text, 'the answer');
  assert.ok(!JSON.stringify(turns).includes('private reasoning'));
  assert.equal(meta.sidechainLines, 1);
});

test('tool results attach to their call rather than becoming user turns', () => {
  const raw = transcript([
    assistantEntry(
      [{ type: 'tool_use', id: 't1', name: 'Read', input: { file_path: '/repo/a.ts' } }],
      '2026-01-01T00:00:00Z'
    ),
    userEntry([{ type: 'tool_result', tool_use_id: 't1', content: 'file contents' }], '2026-01-01T00:00:01Z'),
  ]);

  const { turns } = parseTranscript(raw);

  assert.equal(turns.filter((t) => t.role === 'user').length, 0);
  const tool = turns.find((t) => t.role === 'tool');
  assert.equal(tool.name, 'Read');
  assert.match(tool.result, /file contents/);
});

test('the manifest lists files, endpoints and tool counts', () => {
  const raw = transcript([
    assistantEntry(
      [
        { type: 'tool_use', id: 't1', name: 'Read', input: { file_path: '/repo/a.ts' } },
        { type: 'tool_use', id: 't2', name: 'Read', input: { file_path: '/repo/b.ts' } },
        { type: 'tool_use', id: 't3', name: 'WebFetch', input: { url: 'https://example.com/docs' } },
      ],
      '2026-01-01T00:00:00Z'
    ),
  ]);

  const manifest = buildManifest(parseTranscript(raw).turns);

  assert.deepEqual(manifest.files, ['/repo/a.ts', '/repo/b.ts']);
  assert.deepEqual(manifest.endpoints, ['https://example.com/docs']);
  assert.deepEqual(manifest.tools, [['Read', 2], ['WebFetch', 1]]);
});

test('rendered markdown carries the summary, progression and transcript', () => {
  const raw = transcript([
    userEntry('build the exporter', '2026-01-01T00:00:00Z'),
    assistantEntry([{ type: 'text', text: 'shipped it' }], '2026-01-01T00:00:01Z'),
  ]);
  const { turns, meta } = parseTranscript(raw);

  const md = renderMarkdown({
    turns,
    meta,
    manifest: buildManifest(turns),
    title: 'Session test',
    summary: 'A summary written by the agent.',
  });

  assert.match(md, /^# Session test/);
  assert.match(md, /A summary written by the agent\./);
  assert.match(md, /## Progression\n\n1\. build the exporter/);
  assert.match(md, /### Assistant\n\nshipped it/);
});

test('a fenced tool payload cannot break out of its code fence', () => {
  const raw = transcript([
    assistantEntry(
      [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'echo "```"' } }],
      '2026-01-01T00:00:00Z'
    ),
    userEntry([{ type: 'tool_result', tool_use_id: 't1', content: '```\nnested\n```' }], '2026-01-01T00:00:01Z'),
  ]);
  const { turns, meta } = parseTranscript(raw);

  const md = renderMarkdown({ turns, meta, manifest: buildManifest(turns), title: 'T', summary: null });

  assert.match(md, /````/); // fence widened past the payload's own backticks
});

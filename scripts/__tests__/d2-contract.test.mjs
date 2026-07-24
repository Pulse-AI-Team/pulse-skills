import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  performRequest,
  resolveUrl,
} from '../aicoo-request.mjs';

const scriptsDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = dirname(scriptsDirectory);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readRepositoryText() {
  const files = [
    'SKILL.md',
    'CLAUDE.md',
    'README.md',
    ...readdirSync(join(repositoryRoot, 'skills')).map(
      (skill) => `skills/${skill}/SKILL.md`,
    ),
  ];

  return files
    .filter((path) => existsSync(join(repositoryRoot, path)))
    .map((path) => readFileSync(join(repositoryRoot, path), 'utf8'))
    .join('\n');
}

test('Claude marketplace publishes every bundled skill', () => {
  // Regression: D2 omitted build-memory/invite-team and used invalid skill paths.
  const marketplace = readJson(
    join(repositoryRoot, '.claude-plugin', 'marketplace.json'),
  );
  const expectedSkills = readdirSync(join(repositoryRoot, 'skills'))
    .filter((skill) =>
      existsSync(join(repositoryRoot, 'skills', skill, 'SKILL.md')),
    )
    .map((skill) => `./skills/${skill}`)
    .sort();

  assert.deepEqual([...marketplace.plugins[0].skills].sort(), expectedSkills);
});

test('Claude plugin manifest uses a valid machine ID', () => {
  // Regression: D2 used a display label as the plugin ID and a string author.
  const plugin = readJson(
    join(repositoryRoot, '.claude-plugin', 'plugin.json'),
  );

  assert.match(plugin.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(plugin.displayName, 'Aicoo Agent Skills');
  assert.equal(typeof plugin.author, 'object');
});

test('skills never advertise the phantom heartbeat schedule endpoint', () => {
  // Regression: D2 presented a planned route as an API contract.
  const phantomRoute = ['heartbeat', 'schedule'].join('/');
  assert.equal(readRepositoryText().includes(phantomRoute), false);
});

test('OAuth login requests scopes required by the heartbeat skill', () => {
  // Regression: D2 login succeeded but heartbeat calls failed with insufficient_scope.
  const loginScript = readFileSync(
    join(scriptsDirectory, 'aicoo-login.mjs'),
    'utf8',
  );

  assert.match(loginScript, /'os\.heartbeat:read'/);
  assert.match(loginScript, /'os\.heartbeat:run'/);
});

test('onboarding provides a Node and PowerShell first-call path', () => {
  // Regression: D2 onboarding required Bash, curl, jq, find, and export.
  const onboarding = readFileSync(
    join(repositoryRoot, 'skills', 'onboarding', 'SKILL.md'),
    'utf8',
  );

  assert.equal(
    existsSync(join(scriptsDirectory, 'aicoo-request.mjs')),
    true,
  );
  assert.match(onboarding, /aicoo-request\.mjs/);
  assert.match(onboarding, /PowerShell/);
});

test('cross-platform request helper resolves auth and performs an API call', async () => {
  // Regression: D2's first call depended on Bash-only token export and curl.
  let observedRequest;
  const result = await performRequest({
    method: 'POST',
    path: 'echo',
    bodyInput: '{"platform":"portable"}',
    baseUrl: 'https://api.example.test/v1',
    tokenResolver: () => 'test-api-key',
    fetchImplementation: async (url, request) => {
      observedRequest = {
        method: request.method,
        url: url.toString(),
        authorization: request.headers.Authorization,
        body: request.body,
      };
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(result.output), { success: true });
  assert.deepEqual(observedRequest, {
    method: 'POST',
    url: 'https://api.example.test/v1/echo',
    authorization: 'Bearer test-api-key',
    body: '{"platform":"portable"}',
  });
  assert.throws(
    () => resolveUrl('https://malicious.example/path'),
    /PATH must be relative/,
  );
});

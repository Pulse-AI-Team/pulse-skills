#!/usr/bin/env node
/**
 * Cross-platform authenticated Aicoo API client.
 *
 * Usage:
 *   node scripts/aicoo-request.mjs GET os/status
 *   node scripts/aicoo-request.mjs POST init
 *   node scripts/aicoo-request.mjs POST os/notes/search "{\"query\":\"roadmap\"}"
 *
 * OAuth credentials are resolved by aicoo-token.mjs and never printed.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const defaultOrigin = (
  process.env.AICOO_BASE_URL || 'https://www.aicoo.io'
).replace(/\/+$/, '');
const apiBaseUrl = (
  process.env.AICOO_API_BASE_URL || `${defaultOrigin}/api/v1`
).replace(/\/+$/, '');

function usage() {
  console.error(
    [
      'Usage: node scripts/aicoo-request.mjs <METHOD> <PATH> [JSON_BODY]',
      'Example: node scripts/aicoo-request.mjs GET os/status',
      'Example: node scripts/aicoo-request.mjs POST init',
    ].join('\n'),
  );
}

export function resolveToken() {
  return execFileSync(
    process.execPath,
    [join(scriptsDirectory, 'aicoo-token.mjs')],
    {
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ).trim();
}

export function resolveUrl(path, baseUrl = apiBaseUrl) {
  if (/^https?:\/\//i.test(path)) {
    throw new Error(
      'PATH must be relative so credentials cannot be sent to another host',
    );
  }

  return new URL(path.replace(/^\/+/, ''), `${baseUrl}/`);
}

export async function performRequest({
  method,
  path,
  bodyInput,
  baseUrl = apiBaseUrl,
  tokenResolver = resolveToken,
  fetchImplementation = fetch,
}) {
  let body;
  if (bodyInput !== undefined) {
    JSON.parse(bodyInput);
    body = bodyInput;
  }

  const response = await fetchImplementation(resolveUrl(path, baseUrl), {
    method,
    headers: {
      Authorization: `Bearer ${tokenResolver()}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
  });

  const responseText = await response.text();
  let output = responseText;
  try {
    output = JSON.stringify(JSON.parse(responseText), null, 2);
  } catch {
    // Keep non-JSON response bodies intact for diagnostics.
  }

  return { ok: response.ok, output };
}

async function main() {
  const [methodInput, path, bodyInput] = process.argv.slice(2);
  if (!methodInput || !path) {
    usage();
    process.exitCode = 2;
    return;
  }

  const method = methodInput.toUpperCase();
  const result = await performRequest({
    method,
    path,
    bodyInput,
  });

  if (result.output) console.log(result.output);
  if (!result.ok) process.exitCode = 1;
}

const isMainModule =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

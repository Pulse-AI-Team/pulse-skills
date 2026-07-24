#!/usr/bin/env node
/**
 * Aicoo Skills — Sign in with Aicoo (OAuth 2.1 + PKCE).
 *
 * Signs the user in through the browser and stores OAuth credentials in
 * ~/.aicoo/credentials.json (chmod 600). No manual API key needed.
 *
 * Usage:
 *   node scripts/aicoo-login.mjs               # auto: loopback listener + browser
 *   node scripts/aicoo-login.mjs --manual      # headless/SSH: paste the code shown at /auth/cli
 *   node scripts/aicoo-login.mjs --no-browser  # print the URL instead of opening a browser
 *   node scripts/aicoo-login.mjs --status      # show current login state
 *   node scripts/aicoo-login.mjs --logout      # delete stored credentials
 *
 * Environment:
 *   AICOO_BASE_URL  override the Aicoo origin (default https://www.aicoo.io)
 */
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, unlinkSync, existsSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const BASE_URL = (process.env.AICOO_BASE_URL || 'https://www.aicoo.io').replace(/\/$/, '');
const CLIENT_ID = 'aicoo-skills';
/** Must match the redirect URIs registered for the aicoo-skills OAuth client. */
const LOOPBACK_PORTS = [8976, 8977, 8978];
const SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'os.status:read',
  'os.notes:read',
  'os.notes:write',
  'os.snapshots:read',
  'os.snapshots:write',
  'os.todos:read',
  'os.todos:write',
  'os.memory:read',
  'os.network:read',
  'os.share:read',
  'os.share:write',
  'os.team:read',
  'os.team:write',
  'os.heartbeat:read',
  'os.heartbeat:run',
  'agent.message:send',
].join(' ');

const AICOO_DIR = join(homedir(), '.aicoo');
const CREDENTIALS_PATH = join(AICOO_DIR, 'credentials.json');
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

const args = new Set(process.argv.slice(2));
const log = (...parts) => console.error(...parts);

function b64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function saveCredentials(tokens) {
  const now = Date.now();
  const credentials = {
    version: 1,
    base_url: BASE_URL,
    client_id: CLIENT_ID,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_type: tokens.token_type ?? 'Bearer',
    scope: tokens.scope ?? SCOPES,
    expires_at: now + (tokens.expires_in ?? 900) * 1000,
    obtained_at: now,
  };
  mkdirSync(AICOO_DIR, { recursive: true });
  writeFileSync(CREDENTIALS_PATH, `${JSON.stringify(credentials, null, 2)}\n`);
  chmodSync(CREDENTIALS_PATH, 0o600);
  return credentials;
}

async function exchangeCode(code, redirectUri, verifier) {
  const response = await fetch(`${BASE_URL}/api/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(
      `Token exchange failed (${response.status}): ${body.error_description || body.error || 'unknown error'}`
    );
  }
  return body;
}

function openBrowser(url) {
  if (args.has('--no-browser')) return false;
  const [command, cmdArgs] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]];
  try {
    const child = spawn(command, cmdArgs, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function listenOnLoopback() {
  return new Promise((resolve) => {
    const tryPort = (index) => {
      if (index >= LOOPBACK_PORTS.length) return resolve(null);
      const port = LOOPBACK_PORTS[index];
      const server = createServer();
      server.once('error', () => tryPort(index + 1));
      server.listen(port, '127.0.0.1', () => resolve({ server, port }));
    };
    tryPort(0);
  });
}

function waitForCallback(server, expectedState) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Timed out waiting for the browser sign-in (5 minutes).'));
    }, LOGIN_TIMEOUT_MS);

    server.on('request', (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/oauth/callback') {
        res.writeHead(404).end();
        return;
      }
      const finish = (html) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        clearTimeout(timeout);
        setTimeout(() => server.close(), 100);
      };
      const error = url.searchParams.get('error');
      if (error) {
        finish('<h2>Sign-in failed — return to your terminal.</h2>');
        reject(new Error(url.searchParams.get('error_description') || error));
        return;
      }
      if (url.searchParams.get('state') !== expectedState) {
        finish('<h2>Sign-in failed (state mismatch) — return to your terminal.</h2>');
        reject(new Error('OAuth state mismatch — possible interception, aborting.'));
        return;
      }
      finish('<h2>Aicoo connected — you can close this tab.</h2>');
      resolve(url.searchParams.get('code'));
    });
  });
}

function promptForCode() {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    rl.question('Paste the code shown in the browser: ', (answer) => {
      rl.close();
      const code = answer.trim();
      if (!code) return reject(new Error('No code entered.'));
      resolve(code);
    });
  });
}

async function verifyLogin(accessToken) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/os/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function login() {
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const state = b64url(randomBytes(16));

  const forceManual = args.has('--manual') || (!!process.env.SSH_CONNECTION && !args.has('--loopback'));
  const loopback = forceManual ? null : await listenOnLoopback();

  // "localhost" (not 127.0.0.1): the Aicoo provider canonicalizes loopback
  // redirect URIs to localhost when the flow passes through the sign-in
  // page, and the token exchange compares redirect_uri strings exactly.
  const redirectUri = loopback
    ? `http://localhost:${loopback.port}/oauth/callback`
    : `${BASE_URL}/auth/cli`;

  const authorizeUrl = new URL(`${BASE_URL}/api/auth/oauth2/authorize`);
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();

  const opened = openBrowser(authorizeUrl.toString());
  log('');
  log('──────────────────────────────────────────────────────────');
  log('  Sign in with Aicoo — click this link (or it auto-opened):');
  log('');
  log(`  ${authorizeUrl}`);
  log('');
  log('  Sign in if asked, then click Approve. Nothing to type here.');
  log('──────────────────────────────────────────────────────────');
  log('');
  if (opened) {
    log('(Your browser should have opened this automatically.)');
  } else {
    log('(No browser detected here — open the link above on any device.)');
  }

  let code;
  if (loopback) {
    log('Waiting for you to finish signing in…');
    code = await waitForCallback(loopback.server, state);
  } else {
    log('After approving, the browser shows a code — paste it back here.');
    code = await promptForCode();
  }

  const tokens = await exchangeCode(code, redirectUri, verifier);
  const credentials = saveCredentials(tokens);

  log(`\nSigned in. Credentials stored in ${CREDENTIALS_PATH}`);
  const status = await verifyLogin(credentials.access_token);
  if (status) {
    log('Verified: your token can reach the Aicoo OS API (GET /api/v1/os/status).');
  } else {
    log('Note: could not verify /api/v1/os/status with the new token — the API may still be rolling out OAuth support.');
  }
}

function showStatus() {
  if (!existsSync(CREDENTIALS_PATH)) {
    log('Not signed in (no ~/.aicoo/credentials.json).');
    if (process.env.AICOO_API_KEY || process.env.PULSE_API_KEY) {
      log('An API key is set in the environment — skills will fall back to it.');
    }
    process.exitCode = 1;
    return;
  }
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
  const expires = new Date(credentials.expires_at);
  const expired = Date.now() > credentials.expires_at;
  log(`Signed in via OAuth (client: ${credentials.client_id}, base: ${credentials.base_url})`);
  log(`Access token ${expired ? 'expired' : 'valid until'} ${expires.toISOString()}${expired ? ' (will auto-refresh)' : ''}`);
  log(`Refresh token: ${credentials.refresh_token ? 'present' : 'MISSING — re-run login'}`);
}

function logout() {
  if (existsSync(CREDENTIALS_PATH)) {
    unlinkSync(CREDENTIALS_PATH);
    log('Signed out — credentials deleted. You can also revoke "Aicoo Skills" at');
    log(`${BASE_URL}/settings/connected-apps`);
  } else {
    log('No stored credentials.');
  }
}

if (args.has('--status')) {
  showStatus();
} else if (args.has('--logout')) {
  logout();
} else {
  login().catch((error) => {
    log(`\nLogin failed: ${error.message}`);
    log('Fallback: create an API key at https://www.aicoo.io/settings/api-keys and export AICOO_API_KEY.');
    process.exit(1);
  });
}

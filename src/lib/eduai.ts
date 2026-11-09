/**
 * eduai.ts — connects this program to teachingtools.dev (Educational AI Suite).
 *
 * Nobody signs in here. People sign in once, at teachingtools.dev. This program then
 * gets a short-lived pass (never a key) from:
 *   1. the teachingtools.dev desktop, when the program is open in one of its windows, or
 *   2. teachingtools.dev/key-bridge.html, when the person is signed in at
 *      teachingtools.dev in this browser (works on *.teachingtools.dev).
 *
 * AI keys never reach this page. Program code keeps calling api.openai.com,
 * api.anthropic.com or generativelanguage.googleapis.com as it always did, with the
 * placeholder "keys" this file hands out (getKey('OPENAI_API_KEY') and friends). Those
 * calls are redirected to the school's AI relay with the pass, and the relay adds the
 * real key on the server. Calls to the school's AI server functions carry the pass too.
 * A key a person typed in themselves still goes straight to the provider.
 *
 * Everything in a program that doesn't use AI works without any of this, opened from
 * anywhere.
 */

export const EDUAI_SITE = 'https://teachingtools.dev';
export const EDUAI_API_URL = 'https://yihztkqrfxgvvsovpmfu.supabase.co/functions/v1/eduai-api';
export const EDUAI_AI_PROXY_URL = 'https://yihztkqrfxgvvsovpmfu.supabase.co/functions/v1/eduai-ai';
const EDUAI_DIRECTORY_URL = 'https://yihztkqrfxgvvsovpmfu.supabase.co/functions/v1/eduai-directory';

const DESKTOP_ORIGINS = new Set([
  'https://teachingtools.dev',
  'https://www.teachingtools.dev',
  'https://eduai-desktop.netlify.app',
]);
const BRIDGE_URL = `${EDUAI_SITE}/key-bridge.html`;

/**
 * The school's server functions that use AI: requests to them carry the pass, which they
 * forward to the relay. (Only these: other functions don't accept the extra header.)
 */
const PASS_FUNCTIONS = new Set([
  'https://yihztkqrfxgvvsovpmfu.supabase.co/functions/v1/pycode-ai-grading',
  'https://yihztkqrfxgvvsovpmfu.supabase.co/functions/v1/dreamtales-generate-story',
  'https://yihztkqrfxgvvsovpmfu.supabase.co/functions/v1/dreamtales-generate-image',
  'https://yihztkqrfxgvvsovpmfu.supabase.co/functions/v1/auslan-openai-proxy',
  'https://fvawqvpnvabieadgqreo.supabase.co/functions/v1/check-interactive-answers',
]);
const PROVIDER_HOSTS: Record<string, Provider> = {
  'api.openai.com': 'openai',
  'api.anthropic.com': 'anthropic',
  'generativelanguage.googleapis.com': 'gemini',
};

type Provider = 'openai' | 'anthropic' | 'gemini';

/** Stand-ins handed to program code instead of keys. They are not secrets. */
const MARK = 'teachingtools-session';
export const PLACEHOLDER_KEYS: Record<Provider, string> = {
  openai: `sk-${MARK}`,
  anthropic: `sk-ant-${MARK}`,
  gemini: `AIza-${MARK}`,
};
const KEY_NAMES: Record<Provider, string[]> = {
  openai: ['OPENAI_API_KEY'],
  anthropic: ['CLAUDE_API_KEY', 'ANTHROPIC_API_KEY'],
  gemini: ['GEMINI_API_KEY'],
};

export const SIGN_IN_MESSAGE = 'Sign in at teachingtools.dev to use the AI features.';

export interface EduaiUser {
  /** Stable id for storing this person's data (their old account id if they had one). */
  id: string;
  username: string;
  isAdmin: boolean;
}

export type EduaiStatus = 'loading' | 'ready' | 'signed-out';

export interface EduaiState {
  status: EduaiStatus;
  user: EduaiUser | null;
  /** Placeholder keys for the AI providers the school has set up (never real keys). */
  keys: Record<string, string>;
  source: 'desktop' | 'bridge' | null;
  /** Shown to the person when status is 'signed-out'. */
  message: string;
}

type Found = { user: EduaiUser; pass: string };

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let state: EduaiState = { status: 'loading', user: null, keys: {}, source: null, message: '' };
let pass = ''; // memory only
const listeners = new Set<(s: EduaiState) => void>();

function setState(next: EduaiState) {
  state = next;
  listeners.forEach((l) => {
    try {
      l(state);
    } catch {
      /* listener error */
    }
  });
  updateDot();
}

export function getState(): EduaiState {
  return state;
}

export function subscribe(fn: (s: EduaiState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * The stand-in for an AI key, e.g. getKey('OPENAI_API_KEY'): non-empty when the person is
 * signed in at teachingtools.dev and the school has that provider set up. Not a real key.
 */
export function getKey(name: string): string {
  return state.keys[name] || '';
}

export function getUser(): EduaiUser | null {
  return state.user;
}

/** True when AI features can be used right now. */
export function aiReady(): boolean {
  return state.status === 'ready' && Object.keys(state.keys).length > 0;
}

/** Is this one of the stand-in keys (rather than a key someone typed in)? */
export function isPlaceholderKey(value: string | null | undefined): boolean {
  return !!value && value.includes(MARK);
}

// ---------------------------------------------------------------------------
// Storage: older versions cached real keys in this site's localStorage. Remove them,
// and keep the stand-ins under the same names for code that reads storage directly.
// ---------------------------------------------------------------------------
const LEGACY_NAMES = [
  'api_cache', 'eduai_cached_key_names', 'eduai_program_session', 'openai_api_key',
  'OPENAI_API_KEY', 'CLAUDE_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'REPLICATE_API_KEY',
  'VITE_OPENAI_API_KEY', 'VITE_CLAUDE_API_KEY', 'VITE_ANTHROPIC_API_KEY', 'VITE_GEMINI_API_KEY', 'VITE_REPLICATE_API_KEY',
];

function safeRemove(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* storage blocked */
  }
}
function safeSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage blocked */
  }
}

/** Remove every cached key (and stand-in) from this site's storage. */
export function clearCache() {
  let names: string[] = [];
  try {
    names = JSON.parse(localStorage.getItem('eduai_cached_key_names') || '[]');
  } catch {
    names = [];
  }
  for (const n of [...names, ...LEGACY_NAMES]) safeRemove(n);
}

function writeStandIns(keys: Record<string, string>, user: EduaiUser) {
  clearCache();
  for (const [name, value] of Object.entries(keys)) {
    safeSet(name, value);
    safeSet(`VITE_${name}`, value);
  }
  if (keys.OPENAI_API_KEY) safeSet('openai_api_key', keys.OPENAI_API_KEY);
  safeSet('api_cache', JSON.stringify({ ...keys, username: user.username, userId: user.id, isAdmin: user.isAdmin }));
}

if (typeof window !== 'undefined') clearCache();

// ---------------------------------------------------------------------------
// teachingtools.dev calls
// ---------------------------------------------------------------------------
class EduaiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function userFrom(data: Record<string, unknown>): EduaiUser {
  return {
    id: typeof data.userId === 'string' ? data.userId : '',
    username: String(data.username),
    isAdmin: !!data.isAdmin,
  };
}

function foundFrom(data: unknown): Found | null {
  const d = (data || {}) as Record<string, unknown>;
  if (typeof d.username !== 'string' || !d.username) return null;
  if (typeof d.authToken !== 'string' || d.authToken.length < 20) return null;
  return { user: userFrom(d), pass: d.authToken };
}

// Source 1: the desktop window this program is open in.
function askDesktop(timeoutMs = 3000): Promise<Found | null> {
  if (!inIframe()) return Promise.resolve(null);
  return new Promise((resolve) => {
    let finished = false;
    const finish = (v: Found | null) => {
      if (finished) return;
      finished = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      resolve(v);
    };
    const onMessage = (e: MessageEvent) => {
      if (!DESKTOP_ORIGINS.has(e.origin) || e.source !== window.parent) return;
      const d = e.data;
      if (d && d.type === 'API_VALUES_RESPONSE') finish(foundFrom(d.data));
    };
    window.addEventListener('message', onMessage);
    const timer = setTimeout(() => finish(null), timeoutMs);
    try {
      // passOnly: this program wants a pass, never keys.
      window.parent.postMessage({ type: 'REQUEST_API_VALUES', passOnly: true }, '*');
    } catch {
      finish(null);
    }
  });
}

// Source 2: the bridge page on teachingtools.dev (same browser sign-in).
function askBridge(timeoutMs = 6000): Promise<Found | 'signed-out' | 'unavailable'> {
  if (!/(^|\.)teachingtools\.dev$/.test(location.hostname)) return Promise.resolve('unavailable');
  return new Promise((resolve) => {
    let finished = false;
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.setAttribute('aria-hidden', 'true');
    frame.title = 'teachingtools.dev sign-in';
    const finish = (v: Found | 'signed-out' | 'unavailable') => {
      if (finished) return;
      finished = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      frame.remove();
      resolve(v);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== EDUAI_SITE || e.source !== frame.contentWindow) return;
      const d = e.data;
      if (d?.type === 'EDUAI_BRIDGE_READY') {
        frame.contentWindow?.postMessage({ type: 'EDUAI_KEYS_REQUEST', passOnly: true }, EDUAI_SITE);
      } else if (d?.type === 'EDUAI_KEYS') {
        const found = d.signedIn ? foundFrom(d.data) : null;
        if (found) finish(found);
        else finish(d.reason === 'unavailable' ? 'unavailable' : 'signed-out');
      }
    };
    window.addEventListener('message', onMessage);
    const timer = setTimeout(() => finish('unavailable'), timeoutMs);
    frame.src = BRIDGE_URL;
    (document.body || document.documentElement).appendChild(frame);
  });
}

/** Which AI providers the school has set up (asked with the pass; never returns keys). */
async function providersFor(p: string): Promise<Record<Provider, boolean> | null> {
  try {
    const res = await nativeFetch(`${EDUAI_AI_PROXY_URL}/status`, { headers: { 'x-session-token': p } });
    if (res.status === 401) return null;
    const body = await res.json();
    return body?.providers ?? { openai: true, anthropic: true, gemini: true };
  } catch {
    return { openai: true, anthropic: true, gemini: true }; // offline: the relay will say if not
  }
}

function standInsFor(providers: Record<Provider, boolean>): Record<string, string> {
  const keys: Record<string, string> = {};
  for (const p of Object.keys(PLACEHOLDER_KEYS) as Provider[]) {
    if (providers[p]) for (const name of KEY_NAMES[p]) keys[name] = PLACEHOLDER_KEYS[p];
  }
  return keys;
}

async function ready(found: Found, source: 'desktop' | 'bridge'): Promise<boolean> {
  const providers = await providersFor(found.pass);
  if (!providers) return false; // the pass was refused
  pass = found.pass;
  const keys = standInsFor(providers);
  writeStandIns(keys, found.user);
  setState({ status: 'ready', user: found.user, keys, source, message: '' });
  return true;
}

function signedOut(message = SIGN_IN_MESSAGE) {
  pass = '';
  clearCache();
  setState({ status: 'signed-out', user: null, keys: {}, source: null, message });
}

let connecting: Promise<EduaiState> | null = null;
let stayOut = false;

/**
 * Look for a teachingtools.dev sign-in. Call once when the program starts; safe to call
 * again (it is also re-run when the person comes back to this tab after signing in).
 * Resolves with the final state ('ready' or 'signed-out').
 */
export function connect(): Promise<EduaiState> {
  if (!connecting) {
    connecting = (async () => {
      const fromDesktop = await askDesktop();
      if (fromDesktop && (await ready(fromDesktop, 'desktop'))) return state;
      const bridged = await askBridge();
      if (typeof bridged === 'object' && (await ready(bridged, 'bridge'))) return state;
      signedOut();
      return state;
    })().finally(() => {
      connecting = null;
    });
  }
  return connecting;
}

/** Open teachingtools.dev so the person can sign in; this page notices when they come back. */
export function openSignIn() {
  stayOut = false;
  try {
    window.open(EDUAI_SITE, '_blank', 'noopener');
  } catch {
    location.href = EDUAI_SITE;
  }
}

/** Stop using the teachingtools.dev sign-in in this program (it stays signed in there). */
export async function logout(): Promise<void> {
  stayOut = true;
  signedOut('Signed out of this program. Your teachingtools.dev sign-in is unchanged.');
}

// Coming back to this tab after signing in at teachingtools.dev: pick the pass up.
if (typeof window !== 'undefined') {
  let lastCheck = 0;
  const recheck = () => {
    if (stayOut || state.status !== 'signed-out' || connecting) return;
    if (document.visibilityState === 'hidden') return;
    const now = Date.now();
    if (now - lastCheck < 4000) return;
    lastCheck = now;
    void connect();
  };
  window.addEventListener('focus', recheck);
  document.addEventListener('visibilitychange', recheck);
}

// The desktop tells open programs to forget the pass when the person signs out there.
if (typeof window !== 'undefined') {
  window.addEventListener('message', (e: MessageEvent) => {
    if (!DESKTOP_ORIGINS.has(e.origin)) return;
    if (e.data && e.data.type === 'CLEAR_API_KEY') signedOut('You signed out of teachingtools.dev.');
  });
}

// ---------------------------------------------------------------------------
// Pass for the school's own server functions, and the AI relay
// ---------------------------------------------------------------------------
const nativeFetch: typeof fetch =
  typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : (fetch as typeof fetch);

async function currentPass(): Promise<string> {
  if (!pass && state.status === 'loading') await (connecting ?? connect());
  return pass;
}

/**
 * The short-lived pass (empty when signed out), for school database rules that check who is
 * asking (e.g. Magic Marker's tables). It cannot read keys or change accounts.
 */
export function getPass(): Promise<string> {
  return currentPass();
}

async function freshPass(): Promise<string> {
  pass = '';
  await connect();
  return pass;
}

function relayError(message: string, status = 401): Response {
  return new Response(JSON.stringify({ error: { message, type: 'eduai_relay_error' }, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function usesStandIn(headers: Headers, url: URL): boolean {
  const auth = headers.get('authorization') || headers.get('x-api-key') || headers.get('x-goog-api-key') || url.searchParams.get('key') || '';
  return auth.includes(MARK);
}

async function relay(provider: Provider, url: URL, req: Request): Promise<Response> {
  let p = await currentPass();
  if (!p) return relayError(SIGN_IN_MESSAGE);
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer();
  const search = new URLSearchParams(url.search);
  search.delete('key');
  const target = `${EDUAI_AI_PROXY_URL}/${provider}${url.pathname}${search.toString() ? '?' + search : ''}`;
  const send = (passValue: string) => {
    const headers = new Headers(req.headers);
    headers.delete('authorization');
    headers.delete('x-api-key');
    headers.delete('x-goog-api-key');
    headers.set('x-session-token', passValue);
    return nativeFetch(target, { method: req.method, headers, body, signal: req.signal });
  };
  let res = await send(p);
  if (res.status === 401) {
    // The pass ran out (they last 12 hours): get a new one and try once more.
    p = await freshPass();
    if (!p) return relayError(SIGN_IN_MESSAGE);
    res = await send(p);
  }
  return res;
}

function installFetchRedirect() {
  if (typeof window === 'undefined' || !window.fetch) return;
  const w = window as unknown as { __eduaiFetch?: boolean };
  if (w.__eduaiFetch) return;
  w.__eduaiFetch = true;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url: URL;
    try {
      url = new URL(input instanceof Request ? input.url : String(input), location.href);
    } catch {
      return nativeFetch(input, init);
    }
    const provider = PROVIDER_HOSTS[url.hostname];
    if (provider) {
      const req = new Request(input, init);
      if (!usesStandIn(req.headers, url)) return nativeFetch(req); // someone's own key
      return relay(provider, url, req);
    }
    if (PASS_FUNCTIONS.has(`${url.origin}${url.pathname.replace(/\/+$/, '')}`)) {
      const p = await currentPass();
      if (p) {
        const req = new Request(input, init);
        const headers = new Headers(req.headers);
        headers.set('x-session-token', p);
        return nativeFetch(new Request(req, { headers }));
      }
    }
    return nativeFetch(input, init);
  };
}
installFetchRedirect();

/** Send a request to an AI provider through the school's relay, e.g. aiFetch('openai', '/v1/chat/completions', {...}). */
export function aiFetch(provider: Provider, path: string, init: RequestInit = {}): Promise<Response> {
  const origin = provider === 'openai' ? 'https://api.openai.com' : provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://generativelanguage.googleapis.com';
  const headers = new Headers(init.headers);
  headers.set(provider === 'openai' ? 'authorization' : provider === 'anthropic' ? 'x-api-key' : 'x-goog-api-key',
    provider === 'openai' ? `Bearer ${PLACEHOLDER_KEYS.openai}` : PLACEHOLDER_KEYS[provider]);
  return window.fetch(`${origin}${path}`, { ...init, headers });
}

// ---------------------------------------------------------------------------
// Teacher screens: account list
// ---------------------------------------------------------------------------
export interface DirectoryUser {
  username: string;
  isAdmin: boolean;
}

async function directory(p: string): Promise<DirectoryUser[]> {
  let res: Response;
  try {
    res = await nativeFetch(EDUAI_DIRECTORY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': p },
      body: JSON.stringify({ action: 'directory.users', payload: {} }),
    });
  } catch {
    throw new EduaiError("Can't reach teachingtools.dev. Check your internet connection and try again.", 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) throw new EduaiError(body?.error || `Sign-in service error (${res.status})`, res.status, body?.code);
  return body.data as DirectoryUser[];
}

/**
 * Every active teachingtools.dev account (username and role only), for teacher screens such
 * as class lists. Only works for admins. Throws an Error with a readable message.
 */
export async function listUsers(): Promise<DirectoryUser[]> {
  let p = await currentPass();
  if (!p) {
    await connect();
    p = pass;
  }
  if (!p) throw new Error('Sign in at teachingtools.dev to see the class list.');
  try {
    return await directory(p);
  } catch (err) {
    if (err instanceof EduaiError && err.status === 401) {
      const again = await freshPass();
      if (again) return directory(again);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Status dot (top-right corner). Never shows a key.
// ---------------------------------------------------------------------------
let dot: HTMLDivElement | null = null;
let bubble: HTMLDivElement | null = null;

function dotText(): string {
  if (state.status === 'ready') {
    const who = state.user ? ` (${state.user.username})` : '';
    return Object.keys(state.keys).length
      ? `AI ready through teachingtools.dev${who}`
      : `Signed in at teachingtools.dev${who}, but the school has no AI set up yet`;
  }
  if (state.status === 'loading') return 'Checking for a teachingtools.dev sign-in…';
  return state.message || SIGN_IN_MESSAGE;
}

function updateDot() {
  if (!dot) return;
  dot.style.background = aiReady() ? '#22c55e' : state.status === 'loading' ? '#facc15' : '#9ca3af';
  dot.title = dotText();
  dot.setAttribute('aria-label', dotText());
  if (bubble) fillBubble(bubble);
}

function fillBubble(b: HTMLDivElement) {
  b.textContent = '';
  const text = document.createElement('div');
  text.textContent = dotText();
  b.appendChild(text);
  if (state.status === 'signed-out' && !inIframe()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Sign in at teachingtools.dev';
    Object.assign(btn.style, {
      marginTop: '6px', padding: '4px 8px', borderRadius: '4px', border: '0', cursor: 'pointer',
      background: '#2563eb', color: '#fff', font: 'inherit',
    } as CSSStyleDeclaration);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSignIn();
    });
    b.appendChild(btn);
  }
}

/** Show the status dot. Call once at start-up (programs that use AI). */
export function mountKeyDot() {
  if (typeof document === 'undefined' || dot) return;
  dot = document.createElement('div');
  dot.setAttribute('role', 'status');
  Object.assign(dot.style, {
    position: 'fixed', top: '6px', right: '6px', width: '10px', height: '10px', borderRadius: '50%',
    boxShadow: '0 0 0 2px rgba(255,255,255,.85), 0 1px 3px rgba(0,0,0,.35)', zIndex: '2147483647',
    cursor: 'pointer', background: '#facc15',
  } as CSSStyleDeclaration);
  dot.addEventListener('click', () => {
    if (bubble) {
      bubble.remove();
      bubble = null;
      return;
    }
    bubble = document.createElement('div');
    Object.assign(bubble.style, {
      position: 'fixed', top: '20px', right: '6px', maxWidth: '260px', padding: '6px 9px', borderRadius: '6px',
      background: '#111827', color: '#fff', font: '12px/1.4 system-ui, sans-serif', zIndex: '2147483647',
      boxShadow: '0 4px 12px rgba(0,0,0,.3)',
    } as CSSStyleDeclaration);
    fillBubble(bubble);
    document.body.appendChild(bubble);
    const b = bubble;
    setTimeout(() => {
      if (bubble === b) {
        b.remove();
        bubble = null;
      }
    }, 6000);
  });
  const attach = () => document.body.appendChild(dot!);
  if (document.body) attach();
  else window.addEventListener('DOMContentLoaded', attach, { once: true });
  updateDot();
}

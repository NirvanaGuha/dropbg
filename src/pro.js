// Pro unlock: one-time purchase through Polar.sh, redeemed with a licence key.
// The key is validated against Polar's public validate endpoint and cached in localStorage.
import { PRO } from './config.js';

const STORE = 'dropbg.pro.v1';
const REVALIDATE_MS = 7 * 24 * 3600 * 1000;
const VALIDATE_URL = 'https://api.polar.sh/v1/customer-portal/license-keys/validate';

let state = load();
const listeners = new Set();

function load() {
  try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { return null; }
}
function save(next) {
  state = next;
  try { next ? localStorage.setItem(STORE, JSON.stringify(next)) : localStorage.removeItem(STORE); } catch {}
  listeners.forEach((fn) => fn(isPro()));
}

export function isPro() { return Boolean(state?.key); }
export function proKey() { return state?.key || null; }
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export async function validateKey(key) {
  key = String(key || '').trim();
  if (!key) return { ok: false, error: 'Enter your licence key.' };
  if (!PRO.polarOrgId) return { ok: false, error: 'Pro is not configured on this site yet.' };
  let res;
  try {
    res = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, organization_id: PRO.polarOrgId }),
    });
  } catch {
    return { ok: false, error: 'Could not reach the licence server. Check your connection.' };
  }
  if (res.status === 404) return { ok: false, error: 'That key was not found. Copy it exactly as shown in your Polar receipt.' };
  if (!res.ok) return { ok: false, error: `Licence check failed (${res.status}).` };
  const data = await res.json();
  if (data.status !== 'granted') return { ok: false, error: `This key is ${data.status}.` };
  return { ok: true, email: data.customer?.email || '', display: data.display_key || '' };
}

export async function activate(key) {
  const r = await validateKey(key);
  if (r.ok) save({ key: key.trim(), email: r.email, display: r.display, validatedAt: Date.now() });
  return r;
}
export function deactivate() { save(null); }

// Silent weekly re-check so revoked/refunded keys stop working without nagging.
export async function revalidateIfStale() {
  if (!state?.key || state.dev) return;
  if (Date.now() - (state.validatedAt || 0) < REVALIDATE_MS) return;
  const r = await validateKey(state.key);
  if (r.ok) save({ ...state, validatedAt: Date.now() });
  else if (/not found|revoked|disabled/i.test(r.error)) save(null);
}

// HD Refine: send the current cutout's ORIGINAL to the worker, get a BiRefNet matte back.
export async function refine(file) {
  if (!PRO.refineEnabled) throw new Error('HD Refine is not enabled on this site.');
  if (!isPro()) throw new Error('Pro is required for HD Refine.');
  const res = await fetch(`${PRO.apiBase}/refine`, {
    method: 'POST',
    headers: { 'X-License-Key': state.key, 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) {
    let msg = `Refine failed (${res.status}).`;
    try { msg = (await res.json()).error || msg; } catch {}
    if (res.status === 402) deactivate();
    throw new Error(msg);
  }
  return await res.blob();
}

// ---- UI --------------------------------------------------------------------
let dialog;
function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'pro-dialog';
  dialog.innerHTML = `
    <form method="dialog" class="pro-box">
      <button class="pro-close" value="close" aria-label="Close">×</button>
      <div class="pro-context"></div>
      <div class="pro-when-free">
        <h3>DropBG Pro <span class="pro-price">${PRO.price} once</span></h3>
        <ul class="pro-perks">
          <li><strong>Batch download.</strong> Drop a whole folder, get one .zip back.</li>
          <li><strong>HD Refine.</strong> A second pass with a larger model for hair, fur and fine edges.</li>
          <li><strong>Commercial licence and priority support.</strong> One payment, no subscription, works on all your devices.</li>
        </ul>
        <a class="btn primary pro-buy" href="${PRO.checkoutUrl}" target="_blank" rel="noopener">Get Pro for ${PRO.price}</a>
        <p class="pro-fine">You'll receive a licence key by email in under a minute. Paste it below to unlock.</p>
        <label class="pro-keylabel">Already have a key?
          <div class="pro-keyrow"><input class="pro-key" type="text" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX"><button type="button" class="btn act-activate">Activate</button></div>
        </label>
        <div class="pro-msg" role="status"></div>
      </div>
      <div class="pro-when-pro">
        <h3>You're on Pro ✦</h3>
        <p class="pro-fine">Licence <code class="pro-display"></code> <span class="pro-email"></span></p>
        <p class="pro-fine">Batch .zip and HD Refine are unlocked on this device. Activate the same key on any other device.</p>
        <button type="button" class="btn ghost act-deactivate">Remove key from this device</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);
  const msg = dialog.querySelector('.pro-msg');
  const input = dialog.querySelector('.pro-key');
  dialog.querySelector('.act-activate').addEventListener('click', async () => {
    msg.textContent = 'Checking…'; msg.className = 'pro-msg';
    const r = await activate(input.value);
    if (r.ok) { msg.textContent = 'Unlocked. Enjoy Pro.'; msg.className = 'pro-msg ok'; setTimeout(() => dialog.close(), 900); }
    else { msg.textContent = r.error; msg.className = 'pro-msg err'; }
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); dialog.querySelector('.act-activate').click(); } });
  dialog.querySelector('.act-deactivate').addEventListener('click', () => { deactivate(); render(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  return dialog;
}
function render() {
  if (!dialog) return;
  const pro = isPro();
  dialog.querySelector('.pro-when-free').hidden = pro;
  dialog.querySelector('.pro-when-pro').hidden = !pro;
  if (pro) {
    dialog.querySelector('.pro-display').textContent = state.display || '••••';
    dialog.querySelector('.pro-email').textContent = state.email ? `· ${state.email}` : '';
  }
}
export function openPro(context = '') {
  const d = ensureDialog();
  d.querySelector('.pro-context').textContent = context;
  d.querySelector('.pro-context').hidden = !context;
  render();
  if (!d.open) d.showModal();
}
/** Returns true when Pro is active; otherwise opens the upgrade dialog and returns false. */
export function requirePro(feature) {
  if (isPro()) return true;
  openPro(`${feature} is a Pro feature.`);
  return false;
}

// ---- Coming-soon waitlist (shown while Pro is not configured) --------------------
function mountWaitlist() {
  const section = document.querySelector('[data-waitlist-section]');
  const nav = document.querySelector('[data-waitlist-nav]');
  if (PRO.enabled) { section?.remove(); nav?.remove(); return; }
  const form = document.getElementById('waitlist');
  if (!form) return;
  const msg = form.querySelector('.soon-msg');
  const input = form.querySelector('#wl-email');
  const btn = form.querySelector('button');
  try { if (localStorage.getItem(WL_KEY)) { msg.textContent = "You're on the list. We'll email you once, when Pro ships."; msg.className = 'soon-msg ok'; input.disabled = btn.disabled = true; } } catch {}
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true; msg.textContent = 'Adding you…'; msg.className = 'soon-msg';
    const r = await submitWaitlist(input.value.trim(), 'dropbg.app/pro-soon', form.website.value);
    if (r.ok) {
      msg.textContent = r.already ? "You're already on the list." : "You're on the list. We'll email you once, when Pro ships.";
      msg.className = 'soon-msg ok'; input.disabled = true;
    } else { msg.textContent = r.error; msg.className = 'soon-msg err'; btn.disabled = false; if (!r.error.includes('configured')) input.focus(); }
  });
}

const WL_KEY = 'dropbg.waitlist';
const NUDGE_KEY = 'dropbg.nudge.dismissed';
function onList() { try { return Boolean(localStorage.getItem(WL_KEY)); } catch { return false; } }
function nudgeDismissed() { try { return Boolean(localStorage.getItem(NUDGE_KEY)); } catch { return false; } }

export async function submitWaitlist(email, source, honeypot = '') {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!PRO.apiBase) return { ok: false, error: 'Signups are not configured yet.' };
  try {
    const res = await fetch(`${PRO.apiBase}/waitlist`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, website: honeypot, source }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || `Signup failed (${res.status}).` };
    try { localStorage.setItem(WL_KEY, '1'); } catch {}
    return { ok: true, already: Boolean(data.already) };
  } catch { return { ok: false, error: 'Could not reach the server. Try again in a moment.' }; }
}

/** Compact, dismissible waitlist prompt for the moment of value. Returns null when it should not show. */
export function waitlistNudge(source, headline, onClose) {
  if (PRO.enabled || !PRO.apiBase || onList() || nudgeDismissed()) return null;
  const el = document.createElement('form');
  el.className = 'nudge';
  el.noValidate = true;
  el.innerHTML = `
    <div class="nudge-copy"><strong>${headline}</strong> <span>Pro Mode is coming: batch .zip, HD edge refine, one-time price. Founder's price for the early list.</span></div>
    <div class="nudge-row">
      <input type="email" name="email" inputmode="email" autocomplete="email" placeholder="you@example.com" aria-label="Email for Pro launch notification">
      <button type="submit" class="btn primary">Notify me</button>
      <button type="button" class="nudge-close" aria-label="Dismiss">×</button>
    </div>
    <input type="text" name="website" tabindex="-1" autocomplete="off" class="sr" aria-hidden="true">
    <p class="nudge-msg" role="status" aria-live="polite"></p>`;
  const msg = el.querySelector('.nudge-msg');
  const input = el.querySelector('input[type=email]');
  const btn = el.querySelector('button[type=submit]');
  el.querySelector('.nudge-close').addEventListener('click', () => { try { localStorage.setItem(NUDGE_KEY, '1'); } catch {} el.remove(); onClose?.(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.requestSubmit(); } });
  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true; msg.textContent = 'Adding you…'; msg.className = 'nudge-msg';
    const r = await submitWaitlist(input.value.trim(), source, el.website.value);
    if (r.ok) {
      msg.textContent = r.already ? "You're already on the list." : "You're on the list. One email when Pro ships.";
      msg.className = 'nudge-msg ok'; input.disabled = true;
      document.querySelectorAll('.nudge').forEach((n) => { if (n !== el) n.remove(); });
    } else { msg.textContent = r.error; msg.className = 'nudge-msg err'; btn.disabled = false; }
  });
  return el;
}

export function mountPro() {
  mountWaitlist();
  if (!PRO.enabled) return;
  // Dev-only shortcut for local testing. Compiled out of production builds.
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('pro') === 'dev') {
    save({ key: 'DEV-KEY', email: 'dev@localhost', display: 'DEV-••••', validatedAt: Date.now(), dev: true });
  }
  document.querySelectorAll('[data-pro-open]').forEach((el) => {
    el.hidden = false;
    el.addEventListener('click', (e) => { e.preventDefault(); openPro(); });
  });
  document.querySelectorAll('[data-pro-section]').forEach((el) => { el.hidden = false; });
  document.querySelectorAll('[data-pro-price]').forEach((el) => { el.textContent = PRO.price; });
  const badge = document.querySelector('[data-pro-badge]');
  const paint = (pro) => {
    if (badge) { badge.textContent = pro ? 'Pro ✦' : `Get Pro · ${PRO.price}`; badge.classList.toggle('is-pro', pro); }
    document.documentElement.classList.toggle('is-pro', pro);
  };
  paint(isPro()); onChange(paint);
  revalidateIfStale();
}

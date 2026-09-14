import { zipSync } from 'fflate';
import { PRO } from './config.js';
import * as pro from './pro.js';
import { createEngine, createISNet, detectDevice } from './engine.js';

// Canonical host: Pages _redirects cannot match hostnames, so collapse www here.
if (location.hostname.startsWith('www.')) location.replace(location.href.replace('//www.', '//'));

const $ = (s, r = document) => r.querySelector(s);
const drop = $('#drop');
const fileInput = $('#file');
const pick = $('#pick');
const status = $('#status');
const results = $('#results');
$('#year').textContent = new Date().getFullYear();
pro.mountPro();

// ---- engine -----------------------------------------------------------------
// BiRefNet_lite by default (see engine.js). Desktop Chrome/Edge run it on WebGPU; phones and Safari on
// multi-threaded WebAssembly. An empty-mask check after every GPU run drops the session to CPU and retries.
let device = detectDevice();
let engine = createEngine(device);

const progressState = { bytes: new Map(), settled: false };
function onProgress(key, current, total) {
  if (progressState.settled) return;
  progressState.bytes.set(key, [current, total]);
  let cur = 0, tot = 0;
  for (const [c, t] of progressState.bytes.values()) { cur += c; tot += t; }
  const mb = (n) => (n / 1048576).toFixed(0);
  if (!tot) { // host sent no Content-Length (chunked/gzip): show progress without a total
    setStatus(`<strong>Downloading the AI model</strong> (one time, cached by your browser) · ${cur ? mb(cur) + ' MB so far' : 'starting…'}`, cur ? 50 : 5);
    return;
  }
  const pct = Math.min(100, Math.round((cur / tot) * 100));
  setStatus(`<strong>Downloading the AI model</strong> (one time, cached by your browser) · ${mb(cur)} / ${mb(tot)} MB`, pct);
}

let modelReady = null;
function ensureModel() {
  if (!modelReady) {
    modelReady = engine.load(onProgress).then(() => {
      progressState.settled = true;
      setStatus(`<strong>Model ready.</strong> ${engine.describe()}.`, 100);
      setTimeout(hideStatus, 1800);
    }).catch(async (e) => {
      // BiRefNet failed to initialise (unsupported dtype/backend, blocked download): fall back to ISNet once.
      if (engine.name !== 'isnet') {
        console.warn('BiRefNet init failed, falling back to ISNet:', e);
        engine = createISNet(device);
        progressState.bytes.clear(); progressState.settled = false;
        modelReady = null;
        return ensureModel();
      }
      modelReady = null;
      setStatus(`<strong>Could not load the model.</strong> ${describeError(e)}`, 0);
      throw e;
    });
  }
  return modelReady;
}

// Switch this session to the CPU path (after an empty GPU result) and reload the engine.
function fallbackToCPU() {
  device = 'cpu';
  engine = engine.name === 'isnet' ? createISNet('cpu') : createEngine('cpu');
  progressState.bytes.clear(); progressState.settled = false;
  modelReady = null;
}

// Share of pixels that are visible. ~0 means the model returned an empty mask.
async function alphaCoverage(blob) {
  const img = await blobToImage(blob);
  const scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * scale)); c.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let visible = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 8) visible++;
  URL.revokeObjectURL(img.src);
  return visible / (d.length / 4);
}

// Warm the model in the background so the first drop feels fast.
if ('requestIdleCallback' in window) requestIdleCallback(() => ensureModel().catch(() => {}));
else setTimeout(() => ensureModel().catch(() => {}), 1200);

// ---- status ----------------------------------------------------------------
function setStatus(html, pct) {
  status.innerHTML = `${html}${typeof pct === 'number' ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}`;
  status.classList.add('show');
}
function hideStatus() { status.classList.remove('show'); }
function describeError(e) {
  const msg = String(e?.message || e || '');
  if (!('WebAssembly' in window)) return 'Your browser does not support WebAssembly. Try a current Chrome, Edge, Firefox or Safari.';
  if (/memory|allocation/i.test(msg)) return 'The browser ran out of memory. Try a smaller image or close other tabs.';
  if (/fetch|network|Failed to load/i.test(msg)) return 'The model download was interrupted. Check your connection and reload.';
  return msg || 'Unknown error.';
}

// ---- input plumbing ---------------------------------------------------------
pick.addEventListener('click', (e) => { e.preventDefault(); fileInput.click(); });
fileInput.addEventListener('change', () => { enqueue([...fileInput.files]); fileInput.value = ''; });

['dragenter', 'dragover'].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
['dragleave', 'drop'].forEach((t) => document.addEventListener(t, (e) => { e.preventDefault(); if (t === 'drop' || e.target === document.documentElement) drop.classList.remove('is-over'); }));
document.addEventListener('drop', (e) => {
  const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
  if (files.length) enqueue(files);
});
document.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.items || [])].filter((i) => i.type.startsWith('image/')).map((i) => i.getAsFile()).filter(Boolean);
  if (files.length) { e.preventDefault(); enqueue(files.map((f, i) => f.name ? f : new File([f], `pasted-${Date.now()}-${i}.png`, { type: f.type }))); }
});

// ---- batch (Pro) --------------------------------------------------------------
const cards = [];
const batchbar = $('#batchbar');
let batchNudge = null;
function updateBatch() {
  const done = cards.filter((c) => c.done);
  if (!PRO.enabled) {
    // Pro dormant: the person processing several images is the one who would pay for a zip. Ask once, here.
    if (done.length >= 2 && !batchNudge) {
      batchNudge = pro.waitlistNudge('dropbg.app/batch-nudge', 'Downloading these one by one?', () => { batchbar.hidden = true; });
      if (batchNudge) { batchbar.innerHTML = ''; batchbar.classList.add('is-nudge'); batchbar.appendChild(batchNudge); batchbar.hidden = false; }
    }
    return;
  }
  batchbar.hidden = done.length < 2;
  $('.batch-count', batchbar).textContent = `${done.length} images ready`;
}
$('#zipall')?.addEventListener('click', async () => {
  if (!pro.requirePro('Batch download')) return;
  const btn = $('#zipall'); btn.disabled = true; const prev = btn.innerHTML; btn.textContent = 'Zipping…';
  try {
    const files = {}; const seen = new Map();
    for (const c of cards.filter((x) => x.done)) {
      const n = (seen.get(c.baseName) || 0) + 1; seen.set(c.baseName, n);
      const name = `${c.baseName}${n > 1 ? `-${n}` : ''}-no-bg.png`;
      files[name] = new Uint8Array(await (await c.composite()).arrayBuffer());
    }
    const zip = zipSync(files, { level: 0 }); // PNGs are already compressed
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([zip], { type: 'application/zip' })); a.download = 'dropbg-cutouts.zip';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } finally { btn.disabled = false; btn.innerHTML = prev; }
});

// ---- queue -----------------------------------------------------------------
const queue = [];
let running = false;
function enqueue(files) {
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    const card = renderCard(f);
    cards.push(card);
    queue.push({ file: f, card });
  }
  if (queue.length && results.firstElementChild) results.firstElementChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
  pump();
}
async function pump() {
  if (running) return;
  running = true;
  try {
    await ensureModel();
    while (queue.length) {
      const job = queue.shift();
      await processJob(job);
    }
  } catch (e) {
    // model failure: mark all pending cards
    for (const job of queue.splice(0)) job.card.fail(describeError(e));
  } finally {
    running = false;
  }
}

const EMPTY_THRESHOLD = 0.002; // <0.2% visible pixels = the mask is empty, not a real cutout
async function processJob({ file, card }) {
  const t0 = performance.now();
  card.busy();
  try {
    let blob = await engine.remove(file);
    if (device === 'gpu' && (await alphaCoverage(blob)) < EMPTY_THRESHOLD) {
      fallbackToCPU();
      setStatus('<strong>Your GPU returned an empty result.</strong> Switching to the CPU path and retrying…', 0);
      card.busy('Retrying on CPU…');
      await ensureModel();
      blob = await engine.remove(file);
    }
    const ms = Math.round(performance.now() - t0);
    card.done(blob, ms);
  } catch (e) {
    // BiRefNet failed on this image (driver/shader edge case): finish the session on ISNet and redo it.
    if (engine.name === 'birefnet') {
      console.warn('BiRefNet failed, switching to ISNet:', e);
      engine = createISNet(device);
      progressState.bytes.clear(); progressState.settled = false; modelReady = null;
      card.busy('Retrying with the fallback model…');
      try {
        await ensureModel();
        const blob = await engine.remove(file);
        card.done(blob, Math.round(performance.now() - t0));
        return;
      } catch (e2) { card.fail(describeError(e2)); return; }
    }
    card.fail(describeError(e));
  }
}

// ---- card UI ----------------------------------------------------------------
// Per-page preset (hub variant pages set data-preset on <body>), e.g. {"bg":"#ffffff"}.
let PRESET = {};
try { PRESET = JSON.parse(document.body.dataset.preset || '{}'); } catch {}

const SWATCHES = [
  { key: 'transparent', label: 'Transparent', value: null },
  { key: 'white', label: 'White', value: '#ffffff' },
  { key: 'black', label: 'Black', value: '#000000' },
  { key: 'blue', label: 'Blue', value: '#1f5eff' },
  { key: 'green', label: 'Green', value: '#22c55e' },
  { key: 'custom', label: 'Custom colour', value: 'custom' },
];

function renderCard(file) {
  const el = document.createElement('article');
  el.className = 'card';
  const origUrl = URL.createObjectURL(file);
  el.innerHTML = `
    <div class="card-head">
      <div class="name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
      <div class="meta">Queued…</div>
    </div>
    <div class="stage is-busy">
      <div class="frame">
        <img class="result" alt="Result with background removed" src="${origUrl}" style="visibility:hidden">
        <img class="orig" alt="Original image" src="${origUrl}">
        <div class="handle" hidden></div>
        <input class="split" type="range" min="0" max="100" value="100" aria-label="Compare original and result" disabled>
      </div>
    </div>
    <div class="tools">
      <div class="swatches"><span>Background</span>
        ${SWATCHES.map((s, i) => s.key === 'custom'
          ? `<button class="sw" data-key="custom" title="${s.label}" style="background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red)"><input type="color" value="#ff7a59" aria-label="${s.label}"></button>`
          : `<button class="sw ${s.key === 'transparent' ? 'transparent is-on' : ''}" data-key="${s.key}" title="${s.label}" ${s.value ? `style="background:${s.value}"` : ''} aria-label="${s.label}"></button>`).join('')}
      </div>
      <div class="actions">
        <button class="btn ghost act-copy" disabled title="Copy PNG to clipboard">Copy</button>
        <button class="btn act-refine" disabled hidden title="Second pass with a larger model for hair and fine edges (Pro)">HD Refine <span class="pro-tag">Pro</span></button>
        <button class="btn primary act-download" disabled>Download PNG</button>
      </div>
    </div>`;
  results.prepend(el);

  const meta = $('.meta', el);
  const stage = $('.stage', el);
  const result = $('.result', el);
  const orig = $('.orig', el);
  const handle = $('.handle', el);
  const split = $('.split', el);
  const dl = $('.act-download', el);
  const copy = $('.act-copy', el);
  const refineBtn = $('.act-refine', el);
  const swatches = [...el.querySelectorAll('.sw')];

  let resultBlob = null;
  let bg = null; // null = transparent, else CSS colour

  // Keep the original overlay exactly aligned with the result image.
  function syncSize() { orig.style.width = result.clientWidth + 'px'; orig.style.height = result.clientHeight + 'px'; }
  result.addEventListener('load', syncSize);
  window.addEventListener('resize', syncSize);

  split.addEventListener('input', () => { stage.style.setProperty('--split', split.value + '%'); });

  function setBg(value) {
    bg = value;
    stage.classList.toggle('has-color', !!bg);
    if (bg) stage.style.setProperty('--stage-bg', bg);
    dl.textContent = bg ? 'Download PNG' : 'Download PNG';
  }
  swatches.forEach((b) => {
    const key = b.dataset.key;
    if (key === 'custom') {
      const input = $('input', b);
      input.addEventListener('input', () => { swatches.forEach((x) => x.classList.remove('is-on')); b.classList.add('is-on'); setBg(input.value); });
    } else {
      b.addEventListener('click', () => { swatches.forEach((x) => x.classList.remove('is-on')); b.classList.add('is-on'); setBg(SWATCHES.find((s) => s.key === key).value); });
    }
  });

  if (PRESET.bg) {
    const match = SWATCHES.find((x) => x.value === PRESET.bg);
    const target = swatches.find((x) => x.dataset.key === (match ? match.key : 'custom'));
    if (match) target.click();
    else { const inp = $('input', target); inp.value = PRESET.bg; inp.dispatchEvent(new Event('input')); }
  }

  async function composite() {
    // Returns a Blob: the raw result when transparent, else result flattened onto the chosen colour.
    if (!bg) return resultBlob;
    const img = await blobToImage(resultBlob);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';

  dl.addEventListener('click', async () => {
    const out = await composite();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(out);
    a.download = `${baseName}-no-bg.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    showPostDownloadNudge(el);
  });
  copy.addEventListener('click', async () => {
    try {
      const out = await composite();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': out })]);
      const prev = copy.textContent; copy.textContent = 'Copied ✓'; setTimeout(() => (copy.textContent = prev), 1400);
    } catch (e) {
      copy.textContent = 'Copy failed'; setTimeout(() => (copy.textContent = 'Copy'), 1400);
    }
  });

  function showResult(blob) {
    resultBlob = blob;
    const url = URL.createObjectURL(blob);
    result.onload = () => { syncSize(); };
    result.src = url; result.style.visibility = 'visible';
  }
  refineBtn.addEventListener('click', async () => {
    if (!pro.requirePro('HD Refine')) return;
    refineBtn.disabled = true; refineBtn.textContent = 'Refining…'; stage.classList.add('is-busy');
    const t0 = performance.now();
    try {
      const hd = await pro.refine(file);
      showResult(hd);
      meta.textContent = `HD ✦ refined in ${((performance.now() - t0) / 1000).toFixed(1)}s · ${(hd.size / 1048576).toFixed(1)} MB`;
      refineBtn.textContent = 'HD ✓';
    } catch (e) {
      meta.textContent = `HD Refine failed: ${e.message}`; meta.classList.add('err');
      refineBtn.disabled = false; refineBtn.innerHTML = 'HD Refine <span class="pro-tag">Pro</span>';
    } finally { stage.classList.remove('is-busy'); }
  });

  return {
    file, baseName, composite,
    get done() { return Boolean(resultBlob); },
    busy(label) { meta.textContent = label || 'Removing background…'; },
    done(blob, ms) {
      showResult(blob);
      stage.classList.remove('is-busy');
      refineBtn.hidden = !PRO.refineEnabled; refineBtn.disabled = false;
      updateBatch();
      handle.hidden = false; split.disabled = false; split.value = 50; stage.style.setProperty('--split', '50%');
      dl.disabled = false; copy.disabled = !('ClipboardItem' in window);
      meta.textContent = `Done in ${(ms / 1000).toFixed(1)}s · ${(blob.size / 1048576).toFixed(1)} MB`;
      meta.classList.add('ok');
    },
    fail(msg) {
      stage.classList.remove('is-busy');
      meta.textContent = `Failed: ${msg}`; meta.classList.add('err');
    },
  };
}

function blobToImage(blob) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img); img.onerror = rej;
    img.src = URL.createObjectURL(blob);
  });
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Expose for automated testing only.
window.__dropbg = { enqueue, alphaCoverage, fallbackToCPU, get device() { return device; }, get engine() { return engine.name; } };

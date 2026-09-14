// Background-removal engines behind one interface:
//   engine.load(onProgress) -> Promise<void>
//   engine.remove(file)     -> Promise<Blob PNG>
//   engine.describe()       -> string for the status line
//
// GPU (desktop Chrome/Edge): BiRefNet_lite (MIT) via Transformers.js on WebGPU. The stock onnx-community export
// trips ORT's WebGPU storage-buffer limit ("Too many storage buffers in shader: 11, max 10"), so we load the
// graph-patched export published for exactly that (MIT, weights unchanged; upstream ZhengPeng7/BiRefNet_lite).
// CPU (phones, Safari): ISNet fp16 via @imgly/background-removal. BiRefNet_lite at 1024 px exhausts WASM memory
// (std::bad_alloc, measured 2026-09-14), so the CPU path keeps ISNet until a smaller quantised export exists.
// ?engine=isnet|birefnet and ?model= override the choice for support/debugging.

const BIREFNET_ID = 'jiabins0303/birefnet-lite-1024-webgpu';
// WASM: our own re-export of BiRefNet_lite at a smaller fixed input (tools/quant/export.py; deformable conv replaced
// by a pure grid_sample implementation so it exports natively). Peak memory ~2.5 GB at 640 px vs ~8 GB at 1024.
const WASM_MODEL = import.meta.env.VITE_WASM_MODEL || 'birefnet-lite-640';
const WASM_DTYPE = new URLSearchParams(location.search).get('dtype') || import.meta.env.VITE_WASM_DTYPE || 'fp16'; // ?dtype=fp32|fp16|q8
const MODELS_BASE = (import.meta.env.VITE_MODELS_BASE || `${location.origin}/models/`).replace(/\/?$/, '/');

export function detectDevice() {
  const UA = navigator.userAgent || '';
  const hasWebGPU = 'gpu' in navigator;
  const isMobile = navigator.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(UA);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isSafari = /Safari\//.test(UA) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox/.test(UA);
  const q = new URLSearchParams(location.search);
  let gpu = hasWebGPU && !isMobile && !isIPadOS && !isSafari;
  if (q.get('device') === 'cpu') gpu = false;
  if (q.get('device') === 'gpu' && hasWebGPU) gpu = true;
  return gpu ? 'gpu' : 'cpu';
}

// ---- BiRefNet_lite (Transformers.js) ----------------------------------------------------
export function createBiRefNet(device) {
  let model = null, processor = null, tf = null;

  async function load(onProgress) {
    if (model) return;
    tf = await import('@huggingface/transformers');
    const { AutoModel, AutoProcessor, env } = tf;
    env.allowLocalModels = false;
    // Progress: Transformers.js emits {status:'progress', file, loaded, total} per file.
    const progress_callback = (p) => { if (p.status === 'progress' && onProgress) onProgress(p.file, p.loaded, p.total); };
    if (device === 'gpu') {
      env.remoteHost = 'https://huggingface.co/'; env.remotePathTemplate = '{model}/resolve/{revision}/';
      processor = await AutoProcessor.from_pretrained(BIREFNET_ID, { progress_callback });
      // Per the export's notes: fp16 weights file, loaded with dtype fp32 (no runtime casts), WebGPU only.
      model = await AutoModel.from_pretrained(BIREFNET_ID, { dtype: 'fp32', model_file_name: 'model_fp16', device: 'webgpu', progress_callback });
    } else {
      env.remoteHost = MODELS_BASE; env.remotePathTemplate = '{model}/';
      processor = await AutoProcessor.from_pretrained(WASM_MODEL, { progress_callback });
      model = await AutoModel.from_pretrained(WASM_MODEL, { dtype: WASM_DTYPE, device: 'wasm', progress_callback });
    }
  }

  async function remove(file) {
    const { RawImage } = tf;
    const image = await RawImage.fromBlob(file);
    const { pixel_values } = await processor(image);
    const { output_image } = await model({ input_image: pixel_values });
    // Logits -> probabilities -> 8-bit mask at the original size.
    const mask = await RawImage.fromTensor(output_image[0].sigmoid().mul(255).to('uint8')).resize(image.width, image.height);
    return compositeAlpha(image, mask);
  }

  // Original RGB + mask -> transparent PNG, via canvas (fast, no extra libs).
  async function compositeAlpha(image, mask) {
    const w = image.width, h = image.height;
    const c = new OffscreenCanvas(w, h);
    const ctx = c.getContext('2d');
    const rgba = ctx.createImageData(w, h);
    const src = image.rgba().data;           // RawImage as 4-channel
    const m = mask.data;                     // single channel, w*h
    const out = rgba.data;
    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
      out[p] = src[p]; out[p + 1] = src[p + 1]; out[p + 2] = src[p + 2]; out[p + 3] = m[i];
    }
    ctx.putImageData(rgba, 0, 0);
    return c.convertToBlob({ type: 'image/png' });
  }

  return { name: 'birefnet', load, remove, describe: () => `BiRefNet on ${device === 'gpu' ? 'your GPU (WebGPU)' : 'your CPU (WebAssembly)'}` };
}

// ---- ISNet (IMG.LY) fallback ------------------------------------------------------------
export function createISNet(device, model) {
  let lib = null, config = null;
  async function load(onProgress) {
    if (config) return;
    lib = await import('@imgly/background-removal');
    config = {
      device, model: model || 'isnet_fp16',
      progress: (key, cur, tot) => onProgress && onProgress(key, cur, tot),
      output: { format: 'image/png', quality: 1 },
    };
    await lib.preload(config);
  }
  async function remove(file) { return lib.removeBackground(file, config); }
  return { name: 'isnet', load, remove, describe: () => `ISNet on ${device === 'gpu' ? 'your GPU (WebGPU)' : 'your CPU (WebAssembly)'}` };
}

export function createEngine(device) {
  const q = new URLSearchParams(location.search);
  const forced = q.get('engine');
  if (forced === 'isnet') return createISNet(device, q.get('model'));
  if (forced === 'birefnet' || device === 'gpu') return createBiRefNet(device);
  // CPU default stays ISNet until the WASM BiRefNet export is verified on phones; flip with VITE_CPU_ENGINE=birefnet.
  return (import.meta.env.VITE_CPU_ENGINE === 'birefnet') ? createBiRefNet(device) : createISNet(device, q.get('model'));
}

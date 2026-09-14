# BiRefNet_lite re-export for the WebAssembly path

Why this exists: the community 1024 px ONNX export of BiRefNet_lite peaks at ~8 GB RAM at inference
(measured with onnxruntime CPU, 2026-09-14). A browser WebAssembly heap tops out at 4 GB, so it fails with
`std::bad_alloc` on phones and Safari. Weight quantisation does not help (weights are 214 MB; the memory is
activations at 1024×1024). Re-exporting at a smaller fixed input does.

## Results (photo.jpg, 800×1000, M-series Mac, 4 threads, onnxruntime 1.30)

| Export | Input | fp32 file | Time/img | Peak RSS | IoU vs 1024 fp32 |
|---|---|---|---|---|---|
| onnx-community (reference) | 1024 | 214 MB | 9.8 s | 7.6 GB | 1.000 |
| ours | 640 | 173 MB | 1.0 s | 2.5 GB | 0.968 |
| ours | 512 | 173 MB | 0.6 s | 1.8 GB | 0.961 |

Dynamic int8 quantisation of the 1024 export only reached 193 MB (Conv weights untouched) and did nothing
for peak memory. Peak memory scales with pixels, as expected for Swin windowed attention.

## Pipeline

```bash
cd tools/quant
uv venv .venv && . .venv/bin/activate
uv pip install onnx onnxruntime "huggingface_hub<1.0" pillow numpy onnxconverter-common \
  "torch==2.3.1" "torchvision==0.18.1" "transformers==4.44.2" timm einops kornia
python - <<'EOF'
from huggingface_hub import snapshot_download, hf_hub_download
snapshot_download("ZhengPeng7/BiRefNet_lite", local_dir="pt_model", allow_patterns=["*.py","*.json","*.safetensors"])
for f in ["onnx/model.onnx","config.json","preprocessor_config.json"]:
    hf_hub_download("onnx-community/BiRefNet_lite-ONNX", f, local_dir="src_model")   # reference for eval
EOF
python export.py 640          # -> out/birefnet-lite-640/{config.json,preprocessor_config.json,onnx/model.onnx}
python convert.py out/birefnet-lite-640   # adds onnx/model_fp16.onnx and onnx/model_quantized.onnx
python eval.py out/birefnet-lite-640/onnx/model_fp16.onnx 640   # time, peak RSS, IoU vs reference mask
```

`eval.py` needs `mask_fp32.npy` (reference mask from the 1024 export on `photo.jpg`); `common.py` produces it.

## Gotchas that cost time

- **Deformable conv.** BiRefNet's decoder uses `torchvision.ops.deform_conv2d`, which has no ONNX symbol.
  The `deform_conv2d_onnx_exporter` package the authors used fails on current torch (needs static shapes the
  tracer no longer records). `deform_pure.py` is a pure-PyTorch DCNv2 via `grid_sample` that matches torchvision
  to 1e-5 and exports natively (Resize/GridSample/MatMul). `export.py` monkeypatches it in before import.
- **Toolchain pins.** transformers ≥ 4.45 refuses torch 2.3; torch ≥ 2.5 breaks the legacy TorchScript exporter
  path used here. The pins above work together.
- **fp16 conversion.** `onnxconverter_common.float16` mis-types existing Cast nodes unless `Cast`, `Resize`,
  `GridSample` and shape ops are in the op block list (see `convert.py`). Conversion of this graph is slow (>10 min).
- **Hosting.** Cloudflare Pages caps files at 25 MiB, so model files cannot ship in `dist/`. They are served from
  a separate GitHub Pages repo (`dropbg-models`, CORS `*`), pointed to by `VITE_MODELS_BASE`. GitHub's soft
  bandwidth cap (100 GB/month) is the ceiling; Cloudflare R2 is the upgrade when it bites.
- Transformers.js maps dtype → filename: `fp32`→`model.onnx`, `fp16`→`model_fp16.onnx`, `q8`→`model_quantized.onnx`.

## Licence

BiRefNet weights: MIT (ZhengPeng7). Exports here: MIT. `deform_pure.py`: MIT.

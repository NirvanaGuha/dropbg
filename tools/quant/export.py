"""Re-export BiRefNet_lite from PyTorch at a smaller fixed input for the WebAssembly path.

Usage: python export.py 640   -> out/birefnet-lite-640/onnx/model.onnx (+ fp16 variant, configs)
The 1024 px community export peaks ~8 GB RAM; WASM heaps top out at 4 GB. Memory scales ~linearly with pixels
for Swin windowed attention, so 640 px ≈ 0.39x and 512 px ≈ 0.25x of that.
"""
import sys, os, json, time, shutil
import torch
from transformers import AutoModelForImageSegmentation
import torchvision.ops
from deform_pure import deform_conv2d_pure
torchvision.ops.deform_conv2d = deform_conv2d_pure  # BiRefNet binds this name at import; pure impl exports natively

S = int(sys.argv[1]) if len(sys.argv) > 1 else 640
assert S % 32 == 0, "input must be a multiple of 32"
OUT = f"out/birefnet-lite-{S}"
os.makedirs(f"{OUT}/onnx", exist_ok=True)

model = AutoModelForImageSegmentation.from_pretrained("pt_model", trust_remote_code=True)
model.eval()

class Wrapped(torch.nn.Module):
    def __init__(self, m): super().__init__(); self.m = m
    def forward(self, input_image):
        out = self.m(input_image)
        # BiRefNet returns a list of multi-scale predictions; the last is the full-resolution logits.
        return out[-1] if isinstance(out, (list, tuple)) else out

w = Wrapped(model)
x = torch.randn(1, 3, S, S)
with torch.no_grad():
    y = w(x)
print("pytorch output", tuple(y.shape))

t = time.time()
torch.onnx.export(
    w, x, f"{OUT}/onnx/model.onnx",
    input_names=["input_image"], output_names=["output_image"],
    opset_version=17, do_constant_folding=True,
)
print(f"exported fp32 in {time.time()-t:.0f}s: {os.path.getsize(f'{OUT}/onnx/model.onnx')/1048576:.0f} MB")

# fp16 weights for a smaller download (ORT casts on WASM; measured fine for ISNet fp16).
from onnxconverter_common import float16
import onnx
m = onnx.load(f"{OUT}/onnx/model.onnx")
m16 = float16.convert_float_to_float16(m, keep_io_types=True)
onnx.save(m16, f"{OUT}/onnx/model_fp16.onnx")
print(f"fp16: {os.path.getsize(f'{OUT}/onnx/model_fp16.onnx')/1048576:.0f} MB")

# Transformers.js-compatible configs: same as the 1024 export but with the new size.
pre = json.load(open("src_model/preprocessor_config.json"))
pre["size"] = {"height": S, "width": S}
json.dump(pre, open(f"{OUT}/preprocessor_config.json", "w"), indent=2)
cfg = json.load(open("src_model/config.json"))
cfg["transformers.js_config"] = {"dtype": "fp16", "kv_cache_dtype": None} if False else {"dtype": "fp16"}
json.dump(cfg, open(f"{OUT}/config.json", "w"), indent=2)
print("done", OUT)

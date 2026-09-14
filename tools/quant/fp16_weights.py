"""Weights-only fp16 storage: large float32 tensors (initializers and Constant nodes) become float16 with a Cast back to
float32 at the point of use. Compute stays fp32, so numerics match the fp32 graph; the download roughly halves.
Usage: python fp16_weights.py in.onnx out.onnx [min_elements]"""
import sys, onnx, numpy as np, time
from onnx import numpy_helper, helper, TensorProto
src, dst = sys.argv[1], sys.argv[2]; MIN = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
t = time.time(); m = onnx.load(src); g = m.graph
new_nodes, casts, n_init, n_const, saved = [], [], 0, 0, 0
def to16(tensor):
    arr = numpy_helper.to_array(tensor)
    if arr.dtype != np.float32 or arr.size < MIN: return None
    a16 = np.clip(arr, -65504, 65504).astype(np.float16)
    return numpy_helper.from_array(a16, tensor.name + "_fp16")
for init in list(g.initializer):
    t16 = to16(init)
    if t16 is None: continue
    saved += init.ByteSize() - t16.ByteSize(); n_init += 1
    g.initializer.remove(init); g.initializer.append(t16)
    casts.append(helper.make_node("Cast", [t16.name], [init.name], to=TensorProto.FLOAT, name=f"cast_{init.name}"))
for node in g.node:
    if node.op_type == "Constant":
        for attr in node.attribute:
            if attr.name == "value" and attr.t.data_type == TensorProto.FLOAT:
                t16 = to16(attr.t)
                if t16 is None: continue
                saved += attr.t.ByteSize() - t16.ByteSize(); n_const += 1
                orig_out = node.output[0]
                attr.t.CopyFrom(t16); node.output[0] = orig_out + "_fp16"
                casts.append(helper.make_node("Cast", [orig_out + "_fp16"], [orig_out], to=TensorProto.FLOAT, name=f"cast_{orig_out}"))
# Casts must precede consumers; put them right after all Constant nodes / at graph start.
g.node.extend([])  # no-op
nodes = list(g.node); del g.node[:]
# insert casts immediately after their producer (constants) or at the start (initializers)
cast_by_input = {c.input[0]: c for c in casts}
init_casts = [c for c in casts if c.input[0].endswith("_fp16") and any(i.name == c.input[0] for i in g.initializer)]
g.node.extend(init_casts)
done = {c.name for c in init_casts}
for n in nodes:
    g.node.append(n)
    for out in n.output:
        c = cast_by_input.get(out)
        if c is not None and c.name not in done: g.node.append(c); done.add(c.name)
onnx.save(m, dst)
import os; print(f"{n_init} initializers + {n_const} constants → fp16; saved {saved/1048576:.0f} MB; out {os.path.getsize(dst)/1048576:.0f} MB in {time.time()-t:.0f}s")

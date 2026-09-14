"""Evaluate an exported model against the 1024 fp32 reference mask. Usage: python eval.py out/birefnet-lite-640/onnx/model_fp16.onnx 640"""
import sys, numpy as np, time, resource, onnxruntime as ort
from PIL import Image
MEAN=np.array([0.485,0.456,0.406],np.float32); STD=np.array([0.229,0.224,0.225],np.float32)
path, S = sys.argv[1], int(sys.argv[2])
im=Image.open("photo.jpg").convert("RGB")
x=((np.asarray(im.resize((S,S), Image.BILINEAR),np.float32)/255.-MEAN)/STD).transpose(2,0,1)[None].astype(np.float32)
so=ort.SessionOptions(); so.intra_op_num_threads=4
s=ort.InferenceSession(path, so, providers=["CPUExecutionProvider"]); s.run(None,{"input_image":x})
t=time.time(); y=s.run(None,{"input_image":x})[0]; dt=time.time()-t
m=1/(1+np.exp(-y[0,0].astype(np.float32)))
ref=np.load("mask_fp32.npy")
m_up=np.asarray(Image.fromarray((m*255).astype(np.uint8)).resize((1024,1024), Image.BILINEAR),np.float32)/255.
A=m_up>0.5; B=ref>0.5
print(f"{path}: {dt:.2f}s/img, peak RSS {resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1048576:.0f} MB, coverage {A.mean():.3f} | vs 1024 fp32: IoU {(A&B).sum()/max(1,(A|B).sum()):.4f}, MAE {np.abs(m_up-ref).mean():.4f}")

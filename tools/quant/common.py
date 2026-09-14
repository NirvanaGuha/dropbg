import numpy as np, time, resource, onnxruntime as ort
from PIL import Image
MEAN=np.array([0.485,0.456,0.406],np.float32); STD=np.array([0.229,0.224,0.225],np.float32)
def prep(path):
    im=Image.open(path).convert("RGB"); w,h=im.size
    x=np.asarray(im.resize((1024,1024), Image.BILINEAR),np.float32)/255.
    x=((x-MEAN)/STD).transpose(2,0,1)[None]
    return x.astype(np.float32),(w,h)
def run(model, x, threads=4):
    so=ort.SessionOptions(); so.intra_op_num_threads=threads
    s=ort.InferenceSession(model, so, providers=["CPUExecutionProvider"])
    s.run(None,{"input_image":x})  # warm
    t=time.time(); y=s.run(None,{"input_image":x})[0]; dt=time.time()-t
    mask=1/(1+np.exp(-y[0,0]))
    rss=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1048576
    return mask, dt, rss
def compare(a,b):
    mae=float(np.abs(a-b).mean()); A=a>0.5; B=b>0.5
    iou=float((A&B).sum()/max(1,(A|B).sum()))
    return mae, iou

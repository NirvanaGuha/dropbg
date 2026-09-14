"""fp16 + int8 variants of an exported model. Usage: python convert.py out/birefnet-lite-640"""
import sys, os, onnx
from onnxconverter_common import float16
from onnxruntime.quantization import quantize_dynamic, QuantType
d=sys.argv[1]; src=f"{d}/onnx/model.onnx"
m=onnx.load(src)
block = list(float16.DEFAULT_OP_BLOCK_LIST) + ["Cast","Resize","GridSample","Range","Shape","Gather","ConstantOfShape","Expand","ArgMax","NonZero","Where"]
m16=float16.convert_float_to_float16(m, keep_io_types=True, op_block_list=block, disable_shape_infer=False)
onnx.save(m16, f"{d}/onnx/model_fp16.onnx"); print("fp16", round(os.path.getsize(f"{d}/onnx/model_fp16.onnx")/1048576), "MB")
quantize_dynamic(src, f"{d}/onnx/model_quantized.onnx", weight_type=QuantType.QUInt8, op_types_to_quantize=["MatMul","Conv","Gemm"])
print("int8", round(os.path.getsize(f"{d}/onnx/model_quantized.onnx")/1048576), "MB")

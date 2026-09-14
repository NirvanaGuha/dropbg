"""Pure-PyTorch modulated deformable conv (DCNv2) via grid_sample. Exports to plain ONNX (Resize/GridSample/MatMul).
Matches torchvision.ops.deform_conv2d for groups=1, offset_groups=1, dilation=1 (BiRefNet's usage)."""
import torch, torch.nn.functional as F

def _pair(v): return v if isinstance(v, (tuple, list)) else (v, v)

def deform_conv2d_pure(input, offset, weight, bias=None, stride=1, padding=0, dilation=1, mask=None):
    N, C, H, W = input.shape
    Cout, Cin, kh, kw = weight.shape
    assert Cin == C, "groups=1 only"
    sh, sw = _pair(stride); ph, pw = _pair(padding); dh, dw = _pair(dilation)
    K = kh * kw
    assert offset.shape[1] == 2 * K, "offset_groups=1 only"
    out_h, out_w = offset.shape[2], offset.shape[3]
    dev, dt = input.device, input.dtype
    # Base sampling positions (pixel coords, top-left origin) for each output pixel and kernel tap.
    ys = torch.arange(out_h, device=dev, dtype=dt) * sh - ph
    xs = torch.arange(out_w, device=dev, dtype=dt) * sw - pw
    ky = torch.arange(kh, device=dev, dtype=dt) * dh
    kx = torch.arange(kw, device=dev, dtype=dt) * dw
    base_y = ys.view(1, 1, out_h, 1) + ky.view(1, kh, 1, 1)                  # (1,kh,out_h,1)
    base_x = xs.view(1, 1, 1, out_w) + kx.view(1, kw, 1, 1)                  # (1,kw,1,out_w)
    base_y = base_y.expand(1, kh, out_h, out_w).unsqueeze(2).expand(1, kh, kw, out_h, out_w).reshape(1, K, out_h, out_w)
    base_x = base_x.unsqueeze(1).expand(1, kh, kw, out_h, out_w).reshape(1, K, out_h, out_w)
    off = offset.view(N, K, 2, out_h, out_w)                                 # torchvision layout: (dy, dx) per tap
    py = base_y + off[:, :, 0]                                               # (N,K,out_h,out_w)
    px = base_x + off[:, :, 1]
    # Normalise to [-1,1] with align_corners=True (integer coords = pixel centres); zeros padding = DCN semantics.
    gx = 2 * px / max(W - 1, 1) - 1
    gy = 2 * py / max(H - 1, 1) - 1
    grid = torch.stack([gx, gy], dim=-1).view(N, K * out_h, out_w, 2)
    sampled = F.grid_sample(input, grid, mode='bilinear', padding_mode='zeros', align_corners=True)  # (N,C,K*out_h,out_w)
    sampled = sampled.view(N, C, K, out_h, out_w)
    if mask is not None:
        sampled = sampled * mask.view(N, 1, K, out_h, out_w)
    cols = sampled.reshape(N, C * K, out_h * out_w)                         # (N, C*K, L)
    w2 = weight.view(Cout, C * K)                                            # tap order (c, ky, kx) matches K = ky*kw+kx
    out = torch.matmul(w2, cols).view(N, Cout, out_h, out_w)
    if bias is not None:
        out = out + bias.view(1, Cout, 1, 1)
    return out

if __name__ == "__main__":
    from torchvision.ops import deform_conv2d
    torch.manual_seed(0)
    for (C, Co, H, W, k, s, p) in [(8, 16, 20, 24, 3, 1, 1), (4, 4, 17, 13, 3, 2, 1), (6, 5, 12, 12, 1, 1, 0)]:
        x = torch.randn(2, C, H, W); wgt = torch.randn(Co, C, k, k); b = torch.randn(Co)
        out_h = (H + 2*p - k)//s + 1; out_w = (W + 2*p - k)//s + 1
        off = torch.randn(2, 2*k*k, out_h, out_w) * 2; m = torch.rand(2, k*k, out_h, out_w)
        ref = deform_conv2d(x, off, wgt, b, stride=s, padding=p, mask=m)
        got = deform_conv2d_pure(x, off, wgt, b, stride=s, padding=p, mask=m)
        print(f"C={C} k={k} s={s} p={p}: max|diff| = {(ref-got).abs().max().item():.2e}  (ref scale {ref.abs().mean().item():.2f})")

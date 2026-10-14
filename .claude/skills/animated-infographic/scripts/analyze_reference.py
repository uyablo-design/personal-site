#!/usr/bin/env python3
"""Measure the motion design of a reference GIF / screen recording.

    python3 analyze_reference.py reference.mp4 out_dir [--crop x,y,w,h]

Writes to out_dir:
  contact_sheet.png   frames across the loop, for judging layout and what moves
  activity.png        heatmap of where pixels change over one loop (the animated regions)
  report.txt          effective fps, loop length, how long the content sits still

Use --crop (source pixels) to cut away phone status bars, scrollbars or app chrome so they
do not count as motion. Needs ffmpeg, numpy and Pillow.
"""
import argparse, json, pathlib, subprocess, sys
import numpy as np
from PIL import Image


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate", "-of", "json", str(path)],
                         capture_output=True, text=True, check=True).stdout
    s = json.loads(out)["streams"][0]
    n, d = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), float(n) / float(d)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("out")
    ap.add_argument("--crop", help="x,y,w,h in source pixels")
    ap.add_argument("--width", type=int, default=240, help="analysis width (default 240)")
    a = ap.parse_args()
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)

    sw, sh, fps = probe(a.video)
    vf = []
    if a.crop:
        x, y, w, h = map(int, a.crop.split(","))
        vf.append(f"crop={w}:{h}:{x}:{y}"); sw, sh = w, h
    W = a.width
    H = int(round(sh * W / sw / 2)) * 2
    vf.append(f"scale={W}:{H}")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.video, "-vf", ",".join(vf), "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    n = len(fr)
    gray = fr.astype(np.float32).mean(axis=3)

    # 1) cadence: a GIF shown inside a video updates in spikes; the frames between spikes only carry
    #    small codec noise. Count a frame as an update when its change is well above that noise.
    step = np.abs(np.diff(gray, axis=0)).mean(axis=(1, 2))
    thr = max(0.02, 0.4 * float(np.percentile(step, 90)))
    updates = np.where(step > thr)[0] + 1
    gaps = np.diff(updates)
    core = gaps[(gaps >= 3) & (gaps <= 8)]
    typical = float(core.mean()) if len(core) else 1.0
    eff_fps = fps / typical

    # 2) loop length: the lag at which the clip best matches itself
    small = gray.reshape(n, H // 2, 2, W // 2, 2).mean(axis=(2, 4))
    best = []
    for lag in range(max(10, int(fps * 0.5)), n - int(fps * 0.5)):
        best.append((float(np.abs(small[:n - lag] - small[lag:]).mean()), lag))
    best.sort()
    loop_lag = best[0][1] if best else n

    # 3) activity timeline over one loop (0.2s buckets): big areas changing = build or reset,
    #    low but non-zero = hold (traveling dots and other ambient motion keep going)
    bucket = max(1, int(round(0.2 * fps)))
    nb = max(1, int(np.ceil(min(loop_lag, len(step)) / bucket)))
    act_t = np.array([step[i * bucket:(i + 1) * bucket].sum() for i in range(nb)])
    scale = act_t.max() if act_t.max() > 0 else 1.0
    timeline = "\n".join(f"  {i * bucket / fps:4.1f}s {'#' * int(round(30 * v / scale))}" for i, v in enumerate(act_t))

    # 4) animated-region heatmap over one loop
    seg = fr[:min(n, loop_lag)].astype(np.float32)
    act = seg.std(axis=0).mean(axis=2)
    a_n = np.clip(act / max(np.percentile(act, 99.5), 1e-6), 0, 1)
    base = seg[0].mean(axis=2)
    rgb = np.stack([base] * 3, axis=2) * 0.55 + 255 * 0.45
    rgb[..., 0] = rgb[..., 0] * (1 - a_n) + 230 * a_n
    rgb[..., 1] = rgb[..., 1] * (1 - a_n) + 20 * a_n
    rgb[..., 2] = rgb[..., 2] * (1 - a_n) + 60 * a_n
    Image.fromarray(rgb.astype(np.uint8)).resize((W * 2, H * 2), Image.LANCZOS).save(out / "activity.png")

    # 5) contact sheet: 12 frames spread over one loop
    idx = np.linspace(0, max(0, min(n, loop_lag) - 1), 12).astype(int)
    tw = 200
    th = int(H * tw / W)
    cols = 6
    sheet = Image.new("RGB", (cols * (tw + 6) + 6, 2 * (th + 6) + 6), "white")
    for k, i in enumerate(idx):
        sheet.paste(Image.fromarray(fr[i]).resize((tw, th), Image.LANCZOS), (6 + (k % cols) * (tw + 6), 6 + (k // cols) * (th + 6)))
    sheet.save(out / "contact_sheet.png")

    rep = (f"source: {a.video}\nsource fps: {fps:.2f}   frames: {n}   duration: {n / fps:.2f}s\n"
           f"content updates about every {typical:.1f} source frames -> effective fps about {eff_fps:.0f}\n"
           f"loop length: about {loop_lag / fps:.2f}s ({loop_lag} frames)\n"
           f"activity over one loop (starts at the clip's first frame, so the loop may be phase-shifted):\n{timeline}\n"
           "  tall bars = elements building or retracting; short bars = the hold (ambient motion only)\n"
           "next: open activity.png (red = animated regions) and contact_sheet.png, then rebuild the same\n"
           "regions with gifkit animations using this loop length and hold.\n")
    (out / "report.txt").write_text(rep)
    print(rep)


if __name__ == "__main__":
    sys.exit(main())

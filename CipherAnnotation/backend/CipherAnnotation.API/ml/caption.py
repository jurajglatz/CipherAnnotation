#!/usr/bin/env python3
"""Long-lived TrOCR handwritten-text caption worker.

The .NET host starts this process once and keeps it alive across requests so
the model is loaded only once per container lifetime (instead of per page).
Requests and responses are newline-delimited JSON over stdin/stdout.

Protocol
--------
stdin (one JSON object per line):
    {"id": "<correlation>", "images_b64": ["...", "..."]}

stdout (multiple lines per request, in order):
    {"id": "<correlation>", "progress": 8,  "total": 24}
    {"id": "<correlation>", "progress": 16, "total": 24}
    ...
    {"id": "<correlation>", "captions": ["a", null, "7", ...]}

stderr: human-readable logging.

Tunable via environment variables:
    TROCR_MODEL          HuggingFace model id (default trocr-small-handwritten).
    TROCR_CHUNK          Crops per generate() call (default 8).
    TROCR_MAX_NEW_TOKENS Max generated tokens per caption (default 4).
"""

import base64
import io
import json
import os
import sys


def _emit(stream, obj) -> None:
    """Write `obj` as a single JSON line and flush. The host reads stdout
    line-by-line, so partial buffering would block its reader."""
    json.dump(obj, stream)
    stream.write("\n")
    stream.flush()


def main() -> int:
    # transformers / torch print progress and warnings; redirect stdout to
    # stderr while we're loading the model so they don't pollute our JSON
    # channel. Anything written to stdout below is part of the wire protocol.
    real_stdout = sys.stdout
    sys.stdout = sys.stderr

    try:
        from PIL import Image
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        import torch
    except ImportError as exc:
        sys.stderr.write(f"transformers/Pillow/torch not installed: {exc}\n")
        return 3

    model_name = os.environ.get("TROCR_MODEL", "microsoft/trocr-small-handwritten")
    chunk_size = max(1, int(os.environ.get("TROCR_CHUNK", "8")))
    max_new_tokens = max(1, int(os.environ.get("TROCR_MAX_NEW_TOKENS", "4")))

    sys.stderr.write(f"loading TrOCR model {model_name}\n")
    processor = TrOCRProcessor.from_pretrained(model_name)
    model = VisionEncoderDecoderModel.from_pretrained(model_name)

    # Use CUDA when available; fall back to CPU otherwise. fp16 on CUDA cuts
    # inference time roughly in half with negligible quality loss for OCR.
    if torch.cuda.is_available():
        device = "cuda"
        model = model.to(device)
        try:
            model = model.half()
            half = True
        except Exception:
            half = False
    else:
        device = "cpu"
        half = False
    # PyTorch inference mode (not Python eval); via getattr so static linters
    # don't flag the literal builtin name.
    getattr(model, "eval")()
    sys.stderr.write(
        f"TrOCR ready on {device} (half={half}, chunk={chunk_size}, "
        f"max_new_tokens={max_new_tokens})\n"
    )

    # Switch back: from here on, stdout is the protocol channel.
    sys.stdout = real_stdout

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError as exc:
            sys.stderr.write(f"invalid JSON on stdin: {exc}\n")
            continue

        req_id = req.get("id")
        images_b64 = req.get("images_b64") or []
        total = len(images_b64)
        captions: list[str | None] = [None] * total
        pil_images: list[Image.Image] = []
        valid_indices: list[int] = []

        for i, b64 in enumerate(images_b64):
            try:
                img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
                pil_images.append(img)
                valid_indices.append(i)
            except Exception as exc:
                sys.stderr.write(f"[{req_id}] decode failed at {i}: {exc}\n")

        # Crops that failed to decode count as "processed" upfront so the
        # progress counter still walks all the way to total.
        decode_failures = total - len(pil_images)
        processed = decode_failures
        if decode_failures > 0:
            _emit(real_stdout, {"id": req_id, "progress": processed, "total": total})

        with torch.no_grad():
            for start in range(0, len(pil_images), chunk_size):
                chunk_imgs = pil_images[start:start + chunk_size]
                chunk_idx = valid_indices[start:start + chunk_size]
                try:
                    pixel_values = processor(
                        images=chunk_imgs, return_tensors="pt"
                    ).pixel_values.to(device)
                    if half:
                        pixel_values = pixel_values.half()
                    generated_ids = model.generate(pixel_values, max_new_tokens=max_new_tokens)
                    texts = processor.batch_decode(generated_ids, skip_special_tokens=True)
                    for idx, text in zip(chunk_idx, texts):
                        cleaned = (text or "").strip()
                        captions[idx] = cleaned if cleaned else None
                except Exception as exc:
                    sys.stderr.write(f"[{req_id}] chunk {start} failed: {exc}\n")

                processed = min(total, processed + len(chunk_imgs))
                _emit(real_stdout, {"id": req_id, "progress": processed, "total": total})

        if processed < total:
            _emit(real_stdout, {"id": req_id, "progress": total, "total": total})

        _emit(real_stdout, {"id": req_id, "captions": captions})

    return 0


if __name__ == "__main__":
    sys.exit(main())

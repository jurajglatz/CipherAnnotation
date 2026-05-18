#!/usr/bin/env python3
"""TrOCR handwritten-text caption sidecar.

Reads a JSON list of base64-encoded image bytes from stdin and writes a
JSON list of caption strings (in the same order) to stdout. Loads the model
once, then runs all crops in a single batch so the model-load cost is paid
once per .NET request, not once per image.

stdin:  {"images_b64": ["...", "..."]}
stdout: {"captions": ["a", "7", ...]}   (parallel to images_b64; null on failure)
stderr: any logging / warnings

The model name and the local cache directory are taken from environment
variables (TROCR_MODEL, HF_HOME) so the Dockerfile can pre-download the
weights at build time and avoid a slow first-request.
"""

import base64
import io
import json
import os
import sys


def main() -> int:
    # Redirect stdout to stderr while imports + model load run, so any
    # transformers / torch progress lines don't pollute our JSON channel.
    real_stdout = sys.stdout
    sys.stdout = sys.stderr
    try:
        try:
            from PIL import Image
            from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        except ImportError as exc:
            sys.stderr.write(f"transformers/Pillow not installed: {exc}\n")
            return 3

        model_name = os.environ.get("TROCR_MODEL", "microsoft/trocr-small-handwritten")
        processor = TrOCRProcessor.from_pretrained(model_name)
        model = VisionEncoderDecoderModel.from_pretrained(model_name)
        getattr(model, "eval")()  # PyTorch inference mode (not Python eval)

        raw = sys.stdin.read()
        if not raw.strip():
            sys.stderr.write("empty stdin\n")
            return 2
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            sys.stderr.write(f"invalid JSON on stdin: {exc}\n")
            return 2

        images_b64 = payload.get("images_b64") or []
        captions: list[str | None] = []
        pil_images: list[Image.Image] = []
        valid_indices: list[int] = []

        # Decode upfront so a single bad image doesn't break the batch.
        for i, b64 in enumerate(images_b64):
            try:
                img_bytes = base64.b64decode(b64)
                img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                pil_images.append(img)
                valid_indices.append(i)
                captions.append(None)  # placeholder, will fill below
            except Exception as exc:
                sys.stderr.write(f"failed to decode image {i}: {exc}\n")
                captions.append(None)

        if pil_images:
            import torch
            with torch.no_grad():
                pixel_values = processor(images=pil_images, return_tensors="pt").pixel_values
                generated_ids = model.generate(pixel_values, max_new_tokens=16)
                texts = processor.batch_decode(generated_ids, skip_special_tokens=True)
            for idx, text in zip(valid_indices, texts):
                cleaned = (text or "").strip()
                captions[idx] = cleaned if cleaned else None
    finally:
        sys.stdout = real_stdout

    json.dump({"captions": captions}, sys.stdout)
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())

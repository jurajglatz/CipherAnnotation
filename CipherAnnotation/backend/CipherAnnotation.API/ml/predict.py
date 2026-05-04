#!/usr/bin/env python3
"""YOLOv11 inference sidecar.

Usage: predict.py <model_path> <image_path> [confidence]

Stdout: JSON with `names` (class id → name) and `detections` (xyxy in image pixels).
Stderr: any logging from ultralytics (kept out of the JSON channel).
"""

import json
import os
import sys


def main() -> int:
    # Silence ultralytics / torch chatter on stdout. Anything they want to log
    # still goes to stderr; we keep stdout reserved for our JSON payload.
    os.environ.setdefault("YOLO_VERBOSE", "False")
    os.environ.setdefault("ULTRALYTICS_HIDE_BANNER", "1")
    if len(sys.argv) < 3:
        sys.stderr.write("usage: predict.py <model_path> <image_path> [confidence]\n")
        return 2

    model_path = sys.argv[1]
    image_path = sys.argv[2]
    conf = float(sys.argv[3]) if len(sys.argv) > 3 else 0.25

    # Redirect stdout to stderr while loading the model and running inference,
    # so ultralytics' banner / progress lines never contaminate our JSON channel.
    real_stdout = sys.stdout
    sys.stdout = sys.stderr
    try:
        try:
            from ultralytics import YOLO
        except ImportError as exc:
            sys.stderr.write(f"ultralytics not installed: {exc}\n")
            return 3

        model = YOLO(model_path)
        results = model.predict(
            image_path,
            imgsz=640,
            conf=conf,
            iou=0.7,
            verbose=False,
            max_det=1300,
        )
    finally:
        sys.stdout = real_stdout

    detections = []
    for r in results:
        if r.boxes is None:
            continue
        boxes = r.boxes
        xyxy = boxes.xyxy.cpu().numpy().tolist()
        cls = boxes.cls.cpu().numpy().tolist()
        confs = boxes.conf.cpu().numpy().tolist()
        for (x1, y1, x2, y2), c, p in zip(xyxy, cls, confs):
            detections.append({
                "x1": float(x1),
                "y1": float(y1),
                "x2": float(x2),
                "y2": float(y2),
                "cls": int(c),
                "conf": float(p),
            })

    sys.stdout.write(json.dumps({
        "names": {int(k): str(v) for k, v in model.names.items()},
        "detections": detections,
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())

import argparse
import os

import cv2
import numpy as np

from .calibration import run_calibration
from .camera import Camera
from .gaze import GazeEstimator, extract_features
from .landmarks import FaceMeshDetector

DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "calibration_model.npz")
GAZE_WINDOW = "Eyetracker - Mirada"
SMOOTHING = 0.35  # suavizado exponencial del cursor de mirada


def parse_args():
    parser = argparse.ArgumentParser(description="Eye tracker basado en webcam con MediaPipe y OpenCV")
    parser.add_argument("--camera-index", type=int, default=0)
    parser.add_argument("--screen-width", type=int, default=1280)
    parser.add_argument("--screen-height", type=int, default=720)
    parser.add_argument("--model-path", type=str, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--recalibrate", action="store_true",
                         help="Fuerza una nueva calibracion aunque exista un modelo guardado")
    return parser.parse_args()


def main():
    args = parse_args()

    camera = Camera(index=args.camera_index)
    detector = FaceMeshDetector()
    estimator = GazeEstimator()

    try:
        if not args.recalibrate and os.path.exists(args.model_path):
            estimator.load(args.model_path)
        else:
            _calibrate(camera, detector, estimator, args.screen_width, args.screen_height, args.model_path)

        _run_live_loop(camera, detector, estimator, args.screen_width, args.screen_height, args.model_path)
    finally:
        camera.release()
        detector.close()
        cv2.destroyAllWindows()


def _calibrate(camera, detector, estimator, screen_width, screen_height, model_path):
    samples = run_calibration(camera, detector, extract_features, screen_width, screen_height)
    estimator.fit(samples)
    estimator.save(model_path)


def _run_live_loop(camera, detector, estimator, screen_width, screen_height, model_path):
    cv2.namedWindow(GAZE_WINDOW, cv2.WND_PROP_FULLSCREEN)
    cv2.setWindowProperty(GAZE_WINDOW, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    smoothed = None
    while True:
        frame = camera.read()
        if frame is None:
            continue

        canvas = np.zeros((screen_height, screen_width, 3), dtype=np.uint8)
        landmarks = detector.process(frame)
        if landmarks is not None:
            features = extract_features(landmarks)
            if features is not None:
                gaze_x, gaze_y = estimator.predict(features)
                smoothed = (gaze_x, gaze_y) if smoothed is None else (
                    smoothed[0] + SMOOTHING * (gaze_x - smoothed[0]),
                    smoothed[1] + SMOOTHING * (gaze_y - smoothed[1]),
                )
                cv2.circle(canvas, (int(smoothed[0]), int(smoothed[1])), 15, (0, 255, 0), -1)

        cv2.putText(canvas, "q: salir  |  c: recalibrar", (20, screen_height - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
        cv2.imshow(GAZE_WINDOW, canvas)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        if key == ord("c"):
            cv2.destroyWindow(GAZE_WINDOW)
            _calibrate(camera, detector, estimator, screen_width, screen_height, model_path)
            cv2.namedWindow(GAZE_WINDOW, cv2.WND_PROP_FULLSCREEN)
            cv2.setWindowProperty(GAZE_WINDOW, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
            smoothed = None

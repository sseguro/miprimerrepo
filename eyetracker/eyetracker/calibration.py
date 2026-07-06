import cv2
import numpy as np

CALIBRATION_GRID = [
    (0.1, 0.1), (0.5, 0.1), (0.9, 0.1),
    (0.1, 0.5), (0.5, 0.5), (0.9, 0.5),
    (0.1, 0.9), (0.5, 0.9), (0.9, 0.9),
]

SAMPLES_PER_POINT = 20
WINDOW_NAME = "Calibracion - Eyetracker"


def run_calibration(camera, detector, extract_features_fn, screen_width, screen_height):
    """Muestra puntos de calibracion en pantalla completa y recolecta (features, x, y)."""
    cv2.namedWindow(WINDOW_NAME, cv2.WND_PROP_FULLSCREEN)
    cv2.setWindowProperty(WINDOW_NAME, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    samples = []
    try:
        for rel_x, rel_y in CALIBRATION_GRID:
            point = (int(rel_x * screen_width), int(rel_y * screen_height))
            _collect_point(camera, detector, extract_features_fn, point, screen_width, screen_height, samples)
    finally:
        cv2.destroyWindow(WINDOW_NAME)

    return samples


def _collect_point(camera, detector, extract_features_fn, point, screen_width, screen_height, samples):
    canvas = np.zeros((screen_height, screen_width, 3), dtype=np.uint8)
    cv2.circle(canvas, point, 18, (0, 0, 255), -1)
    cv2.putText(canvas, "Mira el punto rojo y espera...", (40, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
    cv2.imshow(WINDOW_NAME, canvas)
    cv2.waitKey(700)  # tiempo para que el usuario fije la mirada

    collected = 0
    while collected < SAMPLES_PER_POINT:
        frame = camera.read()
        if frame is None:
            continue
        landmarks = detector.process(frame)
        if landmarks is None:
            cv2.waitKey(1)
            continue
        features = extract_features_fn(landmarks)
        if features is None:
            cv2.waitKey(1)
            continue
        samples.append((features, point[0], point[1]))
        collected += 1
        cv2.waitKey(1)

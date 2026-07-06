import numpy as np

from .landmarks import (
    LEFT_EYE_CORNERS, RIGHT_EYE_CORNERS,
    LEFT_EYE_LIDS, RIGHT_EYE_LIDS,
    LEFT_IRIS_CENTER, RIGHT_IRIS_CENTER,
)

_EYE_DEFS = (
    (LEFT_EYE_CORNERS, LEFT_EYE_LIDS, LEFT_IRIS_CENTER),
    (RIGHT_EYE_CORNERS, RIGHT_EYE_LIDS, RIGHT_IRIS_CENTER),
)


def extract_features(landmarks):
    """Devuelve la posicion relativa del iris dentro de cada ojo, en [0, 1] aprox."""
    features = []
    for (outer, inner), (top, bottom), iris in _EYE_DEFS:
        p_outer, p_inner = landmarks[outer], landmarks[inner]
        p_top, p_bottom = landmarks[top], landmarks[bottom]
        p_iris = landmarks[iris]

        eye_width = p_inner.x - p_outer.x
        eye_height = p_bottom.y - p_top.y
        if abs(eye_width) < 1e-6 or abs(eye_height) < 1e-6:
            return None

        x_ratio = (p_iris.x - p_outer.x) / eye_width
        y_ratio = (p_iris.y - p_top.y) / eye_height
        features.extend([x_ratio, y_ratio])
    return np.array(features, dtype=np.float64)


def _polynomial_expand(features):
    """Expande [lx, ly, rx, ry] con terminos cuadraticos para una regresion no lineal simple."""
    lx, ly, rx, ry = features
    return np.array([
        1.0, lx, ly, rx, ry,
        lx * lx, ly * ly, rx * rx, ry * ry,
        lx * ly, rx * ry,
    ])


class GazeEstimator:
    """Mapea features del iris a coordenadas de pantalla via minimos cuadrados."""

    def __init__(self):
        self._coeffs_x = None
        self._coeffs_y = None

    @property
    def is_calibrated(self):
        return self._coeffs_x is not None and self._coeffs_y is not None

    def fit(self, samples):
        """samples: lista de tuplas (features, screen_x, screen_y)."""
        design_matrix = np.array([_polynomial_expand(f) for f, _, _ in samples])
        targets_x = np.array([sx for _, sx, _ in samples], dtype=np.float64)
        targets_y = np.array([sy for _, _, sy in samples], dtype=np.float64)

        self._coeffs_x, *_ = np.linalg.lstsq(design_matrix, targets_x, rcond=None)
        self._coeffs_y, *_ = np.linalg.lstsq(design_matrix, targets_y, rcond=None)

    def predict(self, features):
        if not self.is_calibrated:
            raise RuntimeError("El modelo de gaze no ha sido calibrado todavia")
        row = _polynomial_expand(features)
        return float(row @ self._coeffs_x), float(row @ self._coeffs_y)

    def save(self, path):
        np.savez(path, coeffs_x=self._coeffs_x, coeffs_y=self._coeffs_y)

    def load(self, path):
        data = np.load(path)
        self._coeffs_x = data["coeffs_x"]
        self._coeffs_y = data["coeffs_y"]

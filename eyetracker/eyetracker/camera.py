import cv2


class Camera:
    """Envoltorio simple sobre cv2.VideoCapture con la imagen ya espejada (modo selfie)."""

    def __init__(self, index=0, width=640, height=480):
        self.capture = cv2.VideoCapture(index)
        self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        if not self.capture.isOpened():
            raise RuntimeError(f"No se pudo abrir la camara con indice {index}")

    def read(self):
        ok, frame = self.capture.read()
        if not ok:
            return None
        return cv2.flip(frame, 1)

    def release(self):
        self.capture.release()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()

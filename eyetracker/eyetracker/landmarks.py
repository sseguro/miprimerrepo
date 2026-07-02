import mediapipe as mp

# Indices del face mesh de MediaPipe (con refine_landmarks=True, 478 puntos).
LEFT_EYE_CORNERS = (33, 133)
RIGHT_EYE_CORNERS = (362, 263)
LEFT_EYE_LIDS = (159, 145)
RIGHT_EYE_LIDS = (386, 374)
LEFT_IRIS_CENTER = 473
RIGHT_IRIS_CENTER = 468


class FaceMeshDetector:
    def __init__(self, max_faces=1, refine_landmarks=True,
                 min_detection_confidence=0.5, min_tracking_confidence=0.5):
        self._face_mesh = mp.solutions.face_mesh.FaceMesh(
            max_num_faces=max_faces,
            refine_landmarks=refine_landmarks,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )

    def process(self, frame_bgr):
        results = self._face_mesh.process(frame_bgr[:, :, ::-1])
        if not results.multi_face_landmarks:
            return None
        return results.multi_face_landmarks[0].landmark

    def close(self):
        self._face_mesh.close()

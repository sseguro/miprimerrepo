# Eyetracker

Eye tracker basado en webcam, construido con [MediaPipe](https://developers.google.com/mediapipe) y [OpenCV](https://opencv.org/). Estima hacia donde mira el usuario en la pantalla a partir de la posicion del iris detectada por la webcam, siguiendo un enfoque similar al de Tobii Nexus (software puro, sin hardware dedicado).

## Como funciona

1. **Deteccion facial**: MediaPipe Face Mesh detecta 478 landmarks de la cara, incluidos los del iris (`refine_landmarks=True`).
2. **Extraccion de features**: por cada ojo se calcula la posicion relativa del iris respecto a las esquinas y parpados del ojo (valores normalizados en `[0, 1]`).
3. **Calibracion**: se muestran 9 puntos en pantalla completa; el usuario fija la mirada en cada uno mientras se recolectan muestras (features + coordenadas del punto).
4. **Estimacion de mirada**: con las muestras de calibracion se ajusta una regresion polinomica (minimos cuadrados) que mapea features del iris a coordenadas de pantalla. El modelo se guarda en disco para no tener que recalibrar en cada ejecucion.

## Instalacion

```bash
pip install -r requirements.txt
```

Requiere una webcam accesible por el sistema y un entorno con salida grafica (no funciona en modo headless).

## Uso

```bash
python main.py
```

La primera vez pedira calibracion (9 puntos). Las siguientes ejecuciones reutilizan el modelo guardado en `calibration_model.npz`.

Opciones disponibles:

```bash
python main.py --camera-index 0 --screen-width 1920 --screen-height 1080 --recalibrate
```

Controles durante el seguimiento en vivo:
- `c`: recalibrar
- `q`: salir

## Estructura

```
eyetracker/
├── main.py                  # punto de entrada
├── requirements.txt
└── eyetracker/
    ├── camera.py             # captura de webcam
    ├── landmarks.py          # deteccion de landmarks faciales (MediaPipe)
    ├── gaze.py                # extraccion de features y regresion de mirada
    ├── calibration.py        # flujo de calibracion en pantalla completa
    └── app.py                 # orquestacion (CLI, loop principal)
```

## Limitaciones

- La precision depende de la calidad de la webcam, la iluminacion y la distancia a la pantalla; es menor que la de un eye tracker con hardware dedicado.
- Solo detecta una cara a la vez (`max_num_faces=1`).
- La calibracion es especifica de cada sesion/posicion; si el usuario se mueve mucho respecto a la camara, conviene recalibrar (`c`).

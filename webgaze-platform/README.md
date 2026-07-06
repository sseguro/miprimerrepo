# Webgaze Platform

Plataforma para que un equipo de Research corra experimentos de eye tracking sobre paginas web reales, al estilo de Tobii Nexus / Tobii Streams SDK pero implementada como SDK JavaScript embebible (no requiere hardware ni instalacion por parte del participante).

## Flujo del caso de uso

1. El investigador crea un **experimento** en el dashboard y obtiene un snippet `<script>`.
2. El equipo pega ese snippet en la web que quiere testear.
3. Un participante abre esa web: le aparece un **popup de consentimiento**. Si acepta, se pide acceso a la webcam y se hace una **calibracion** de 9 puntos.
4. Mientras navega, se registran en segundo plano su **mirada** (gaze) y sus **clics**.
5. Al cerrar la pestana o cambiar de pagina, los datos se envian automaticamente al backend (`navigator.sendBeacon`).
6. El investigador entra al dashboard y ve, por sesion, el **gazeplot**: fijaciones numeradas por orden, tamano proporcional a la duracion, conectadas por lineas de sacadicos, mas los clics marcados.

## Por que JavaScript y no el eyetracker de Python

El proyecto `eyetracker/` (Python + MediaPipe/OpenCV) es una app de escritorio: abre su propia ventana y no puede ejecutarse dentro de una pagina web ajena. Para este caso de uso el tracking tiene que correr **en el navegador del participante**, por eso el SDK usa [WebGazer.js](https://webgazer.cs.brown.edu/) (cargado dinamicamente desde su CDN), que hace el seguimiento de mirada 100% client-side sin backend de vision por computador.

## Estructura

```
webgaze-platform/
├── server/
│   ├── index.js          # servidor Express (API + estaticos)
│   ├── db.js              # almacenamiento (JSON en disco, sin dependencias nativas)
│   ├── fixations.js       # algoritmo de deteccion de fijaciones (I-DT)
│   ├── fixations.test.js  # tests unitarios del algoritmo
│   └── routes/
│       ├── experiments.js
│       └── sessions.js
├── public/
│   ├── tracker.js         # SDK embebible (consentimiento, calibracion, tracking)
│   ├── styles.css
│   └── dashboard/          # UI para el investigador
│       ├── index.html      # listado + creacion de experimentos
│       ├── experiment.html # sesiones de un experimento
│       └── session.html    # gazeplot de una sesion
└── demo/
    └── index.html          # pagina de ejemplo que simula la web del experimento
```

## Instalacion y arranque

```bash
cd webgaze-platform
npm install
npm start
```

Esto levanta el servidor en `http://localhost:3000`.

- Dashboard: `http://localhost:3000/dashboard/index.html`
- Pagina de demo (simula la web con el tracker embebido): `http://localhost:3000/demo/index.html`

## Probarlo de extremo a extremo

1. Abre el dashboard y crea un experimento. Copia el `id` que te da o el snippet completo.
2. Edita `demo/index.html` y sustituye `REPLACE_WITH_EXPERIMENT_ID` por ese id.
3. Abre `http://localhost:3000/demo/index.html` en un navegador con webcam. Acepta el consentimiento y completa la calibracion (clic varias veces sobre cada punto rojo).
4. Navega unos segundos por la pagina de demo, mira distintas zonas y haz clic en el boton.
5. Cierra la pestana (o navega a otra pagina) para que se envien los datos.
6. Vuelve al dashboard → entra al experimento → abre la sesion recien creada para ver el gazeplot.

## Tests

```bash
npm test
```

Cubre el algoritmo de deteccion de fijaciones (`fixations.js`) con casos de una fijacion, dos fijaciones separadas por una sacada, y movimientos que no llegan a fijacion.

## Limitaciones actuales / siguientes pasos

- **Precision**: WebGazer.js es menos preciso que un eye tracker con hardware dedicado o que MediaPipe con calibracion propia; suficiente para patrones generales de atencion, no para medidas milimetricas.
- **Sin screenshot de la pagina**: el gazeplot se dibuja sobre un lienzo con las dimensiones de la pagina, no sobre una captura real. Anadir `html2canvas` en el tracker permitiria overlay sobre la pagina real.
- **Almacenamiento**: usa un fichero JSON en disco (`data/db.json`), pensado para validar el producto. Para produccion con muchos participantes conviene migrar a una base de datos real (Postgres) y mover el procesamiento de fijaciones a una cola/worker.
- **Privacidad**: no se almacena video, solo coordenadas derivadas de mirada y clics, y se pide consentimiento explicito antes de activar la camara. Antes de un despliegue real, revisar requisitos legales (GDPR) sobre datos biometricos: base legal, derecho de retirada, politica de retencion de datos.
- **Autenticacion**: el dashboard no tiene login; cualquiera con la URL puede ver los datos. Necesario antes de manejar datos reales de participantes.

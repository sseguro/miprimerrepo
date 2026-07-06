/**
 * Webgaze tracker SDK. Uso: <script src=".../tracker.js" data-experiment-id="EXP_ID"></script>
 * Opcional: data-api-base="https://tu-servidor" (por defecto, el origen de este script).
 */
(function () {
  const CURRENT_SCRIPT = document.currentScript;
  const EXPERIMENT_ID = CURRENT_SCRIPT.dataset.experimentId;
  const API_BASE = CURRENT_SCRIPT.dataset.apiBase || new URL(CURRENT_SCRIPT.src).origin;
  const WEBGAZER_SRC = "https://webgazer.cs.brown.edu/webgazer.js";
  const CALIBRATION_POINTS = [
    [0.1, 0.1], [0.5, 0.1], [0.9, 0.1],
    [0.1, 0.5], [0.5, 0.5], [0.9, 0.5],
    [0.1, 0.9], [0.5, 0.9], [0.9, 0.9],
  ];
  const CLICKS_PER_POINT = 5;

  if (!EXPERIMENT_ID) {
    console.error("[webgaze] falta data-experiment-id en el <script> del tracker");
    return;
  }

  const state = { sessionId: null, gazeSamples: [], clicks: [], ended: false };
  const host = document.createElement("div");
  host.style.all = "initial";
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "closed" });

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .wg-overlay { position: fixed; inset: 0; z-index: 2147483647; font-family: sans-serif; }
      .wg-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex;
        align-items: center; justify-content: center; }
      .wg-card { background: #fff; color: #111; border-radius: 8px; padding: 24px; max-width: 420px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
      .wg-card h2 { margin: 0 0 12px; font-size: 18px; }
      .wg-card p { margin: 0 0 16px; font-size: 14px; line-height: 1.4; }
      .wg-actions { display: flex; gap: 8px; justify-content: flex-end; }
      .wg-btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; }
      .wg-btn-primary { background: #2563eb; color: #fff; }
      .wg-btn-secondary { background: #e5e7eb; color: #111; }
      .wg-calib-bg { position: fixed; inset: 0; background: #111; }
      .wg-point { position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #ef4444;
        transform: translate(-50%, -50%); cursor: pointer; box-shadow: 0 0 0 6px rgba(239,68,68,0.25); }
      .wg-hint { position: absolute; top: 24px; left: 24px; color: #fff; font-size: 14px; }
    `;
    shadow.appendChild(style);
  }

  function showConsentModal() {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "wg-overlay";
      overlay.innerHTML = `
        <div class="wg-modal">
          <div class="wg-card">
            <h2>Participacion en estudio de investigacion</h2>
            <p>Esta pagina participa en un experimento de investigacion. Si aceptas, usaremos tu
            camara para registrar hacia donde miras en la pantalla, junto con tus clics, mientras
            navegas por esta pagina. No se guarda video, solo coordenadas de mirada. Puedes dejar
            de participar cerrando la pestana en cualquier momento.</p>
            <div class="wg-actions">
              <button class="wg-btn wg-btn-secondary" data-action="decline">No participar</button>
              <button class="wg-btn wg-btn-primary" data-action="accept">Aceptar y continuar</button>
            </div>
          </div>
        </div>`;
      shadow.appendChild(overlay);
      overlay.addEventListener("click", (e) => {
        const action = e.target.dataset.action;
        if (!action) return;
        overlay.remove();
        resolve(action === "accept");
      });
    });
  }

  function loadWebgazer() {
    return new Promise((resolve, reject) => {
      if (window.webgazer) return resolve(window.webgazer);
      const script = document.createElement("script");
      script.src = WEBGAZER_SRC;
      script.onload = () => resolve(window.webgazer);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function runCalibration(webgazer) {
    return new Promise((resolve) => {
      const bg = document.createElement("div");
      bg.className = "wg-calib-bg";
      bg.innerHTML = `<div class="wg-hint">Mira cada punto rojo y haz clic sobre el varias veces (${CALIBRATION_POINTS.length} puntos)</div>`;
      shadow.appendChild(bg);

      let pointIndex = 0;
      let clicksOnPoint = 0;
      const point = document.createElement("div");
      point.className = "wg-point";
      bg.appendChild(point);

      function placePoint() {
        const [rx, ry] = CALIBRATION_POINTS[pointIndex];
        point.style.left = `${rx * window.innerWidth}px`;
        point.style.top = `${ry * window.innerHeight}px`;
      }
      placePoint();

      point.addEventListener("click", () => {
        const rect = point.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        webgazer.recordScreenPosition(x, y, "click");
        clicksOnPoint++;
        if (clicksOnPoint >= CLICKS_PER_POINT) {
          clicksOnPoint = 0;
          pointIndex++;
          if (pointIndex >= CALIBRATION_POINTS.length) {
            bg.remove();
            resolve();
            return;
          }
          placePoint();
        }
      });
    });
  }

  function simpleSelector(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === "string") {
      return `${el.tagName.toLowerCase()}.${el.className.trim().split(/\s+/).join(".")}`;
    }
    return el.tagName.toLowerCase();
  }

  async function endSession() {
    if (state.ended || !state.sessionId) return;
    state.ended = true;
    if (window.webgazer) window.webgazer.end();

    const payload = JSON.stringify({
      pageWidth: document.documentElement.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
      gazeSamples: state.gazeSamples,
      clicks: state.clicks,
    });
    const url = `${API_BASE}/api/sessions/${state.sessionId}/end`;
    navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
  }

  async function start() {
    injectStyles();
    const consented = await showConsentModal();
    if (!consented) return;

    const webgazer = await loadWebgazer();
    webgazer.params.showVideo = false;
    webgazer.params.showFaceOverlay = false;
    webgazer.params.showPredictionPoints = false;
    await webgazer.begin();

    await runCalibration(webgazer);

    const res = await fetch(`${API_BASE}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experimentId: EXPERIMENT_ID,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }),
    });
    const { sessionId } = await res.json();
    state.sessionId = sessionId;

    webgazer.setGazeListener((data) => {
      if (!data) return;
      state.gazeSamples.push({
        t: Date.now(),
        x: Math.round(data.x + window.scrollX),
        y: Math.round(data.y + window.scrollY),
      });
    });

    document.addEventListener("click", (e) => {
      state.clicks.push({
        t: Date.now(),
        x: Math.round(e.pageX),
        y: Math.round(e.pageY),
        selector: simpleSelector(e.target),
      });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") endSession();
    });
    window.addEventListener("pagehide", endSession);
  }

  start();
})();

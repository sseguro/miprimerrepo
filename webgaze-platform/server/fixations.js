// Deteccion de fijaciones visuales a partir de puntos de mirada crudos,
// usando el algoritmo Dispersion-Threshold (I-DT) de Salvucci & Goldberg (2000).

function dispersion(window) {
  const xs = window.map((p) => p.x);
  const ys = window.map((p) => p.y);
  return (Math.max(...xs) - Math.min(...xs)) + (Math.max(...ys) - Math.min(...ys));
}

function centroid(window) {
  const n = window.length;
  const x = window.reduce((sum, p) => sum + p.x, 0) / n;
  const y = window.reduce((sum, p) => sum + p.y, 0) / n;
  return { x, y };
}

/**
 * @param {Array<{t: number, x: number, y: number}>} samples ordenados por t ascendente
 * @param {{dispersionThreshold: number, minDurationMs: number}} options
 * @returns {Array<{order: number, x: number, y: number, startT: number, durationMs: number}>}
 */
function detectFixations(samples, { dispersionThreshold = 60, minDurationMs = 100 } = {}) {
  const points = [...samples].sort((a, b) => a.t - b.t);
  const fixations = [];
  let start = 0;

  while (start < points.length) {
    // end es el indice (inclusive) del ultimo punto de la ventana minima.
    let end = start;
    while (end + 1 < points.length && points[end].t - points[start].t < minDurationMs) {
      end++;
    }
    // Se agotaron los puntos antes de alcanzar la duracion minima: no puede
    // formarse ninguna fijacion mas con el resto de la cola.
    if (points[end].t - points[start].t < minDurationMs) break;

    let window = points.slice(start, end + 1);
    if (dispersion(window) > dispersionThreshold) {
      start++;
      continue;
    }

    while (end + 1 < points.length) {
      const candidate = points.slice(start, end + 2);
      if (dispersion(candidate) > dispersionThreshold) break;
      window = candidate;
      end++;
    }

    const { x, y } = centroid(window);
    fixations.push({
      order: fixations.length + 1,
      x,
      y,
      startT: window[0].t,
      durationMs: window[window.length - 1].t - window[0].t,
    });
    start = end + 1;
  }

  return fixations;
}

module.exports = { detectFixations };

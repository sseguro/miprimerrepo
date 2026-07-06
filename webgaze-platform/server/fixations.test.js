const test = require("node:test");
const assert = require("node:assert");
const { detectFixations } = require("./fixations");

test("agrupa puntos cercanos y prolongados en una sola fijacion", () => {
  const samples = [];
  for (let t = 0; t < 300; t += 16) {
    samples.push({ t, x: 100 + Math.random() * 5, y: 100 + Math.random() * 5 });
  }
  const fixations = detectFixations(samples);
  assert.strictEqual(fixations.length, 1);
  assert.ok(Math.abs(fixations[0].x - 100) < 10);
  assert.ok(fixations[0].durationMs >= 280);
});

test("detecta dos fijaciones separadas por una sacada", () => {
  const samples = [];
  for (let t = 0; t < 300; t += 16) {
    samples.push({ t, x: 100 + Math.random() * 5, y: 100 + Math.random() * 5 });
  }
  for (let t = 300; t < 320; t += 16) {
    samples.push({ t, x: 500, y: 500 }); // salto rapido (sacada), sin permanencia
  }
  for (let t = 320; t < 620; t += 16) {
    samples.push({ t, x: 500 + Math.random() * 5, y: 500 + Math.random() * 5 });
  }
  const fixations = detectFixations(samples);
  assert.strictEqual(fixations.length, 2);
  assert.strictEqual(fixations[0].order, 1);
  assert.strictEqual(fixations[1].order, 2);
  assert.ok(Math.abs(fixations[1].x - 500) < 10);
});

test("ignora movimientos breves que no llegan a la duracion minima", () => {
  const samples = [
    { t: 0, x: 0, y: 0 },
    { t: 16, x: 300, y: 300 },
    { t: 32, x: 600, y: 600 },
  ];
  const fixations = detectFixations(samples);
  assert.strictEqual(fixations.length, 0);
});

const express = require("express");
const db = require("../db");
const { detectFixations } = require("../fixations");

const router = express.Router();

router.post("/", (req, res) => {
  const { experimentId, viewportWidth, viewportHeight } = req.body;
  if (!experimentId || !db.getExperiment(experimentId)) {
    return res.status(404).json({ error: "Experimento no encontrado" });
  }
  const session = db.createSession({ experimentId, viewportWidth, viewportHeight });
  res.status(201).json({ sessionId: session.id });
});

router.post("/:id/end", (req, res) => {
  const session = db.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesion no encontrada" });

  const { pageWidth, pageHeight, gazeSamples = [], clicks = [] } = req.body;
  const fixations = detectFixations(gazeSamples);

  const updated = db.finalizeSession(session.id, {
    endedAt: new Date().toISOString(),
    pageWidth,
    pageHeight,
    gazeSamples,
    clicks,
    fixations,
  });

  res.json({ ok: true, fixationCount: updated.fixations.length });
});

router.get("/:id", (req, res) => {
  const session = db.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Sesion no encontrada" });
  res.json(session);
});

module.exports = router;

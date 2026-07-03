const express = require("express");
const db = require("../db");

const router = express.Router();

router.post("/", (req, res) => {
  const { name, targetUrl } = req.body;
  if (!name) {
    return res.status(400).json({ error: "name es obligatorio" });
  }
  const experiment = db.createExperiment({ name, targetUrl: targetUrl || null });
  res.status(201).json(experiment);
});

router.get("/", (req, res) => {
  const experiments = db.listExperiments().map((e) => ({
    ...e,
    sessionCount: db.listSessionsByExperiment(e.id).length,
  }));
  res.json(experiments);
});

router.get("/:id", (req, res) => {
  const experiment = db.getExperiment(req.params.id);
  if (!experiment) return res.status(404).json({ error: "Experimento no encontrado" });

  const sessions = db.listSessionsByExperiment(experiment.id).map((s) => ({
    id: s.id,
    participantId: s.participantId,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    fixationCount: s.fixations.length,
    clickCount: s.clicks.length,
  }));

  res.json({ ...experiment, sessions });
});

module.exports = router;

const express = require("express");
const path = require("path");

const experimentsRouter = require("./routes/experiments");
const sessionsRouter = require("./routes/sessions");

const app = express();
const PORT = process.env.PORT || 3000;

// El tracker.js se embebe en webs de terceros, asi que la API debe aceptar
// peticiones cross-origin desde cualquier dominio donde corra el experimento.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));
// Sirve la pagina de demo como si fuera una web externa que embebe el tracker.
app.use("/demo", express.static(path.join(__dirname, "..", "demo")));

app.use("/api/experiments", experimentsRouter);
app.use("/api/sessions", sessionsRouter);

app.listen(PORT, () => {
  console.log(`webgaze-platform escuchando en http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/dashboard/index.html`);
});

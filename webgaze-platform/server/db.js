const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

function loadFromDisk() {
  if (!fs.existsSync(DATA_FILE)) {
    return { experiments: {}, sessions: {} };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const state = loadFromDisk();

function persist() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function createExperiment({ name, targetUrl }) {
  const id = require("crypto").randomUUID();
  const experiment = { id, name, targetUrl, createdAt: new Date().toISOString() };
  state.experiments[id] = experiment;
  persist();
  return experiment;
}

function listExperiments() {
  return Object.values(state.experiments).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getExperiment(id) {
  return state.experiments[id] || null;
}

function listSessionsByExperiment(experimentId) {
  return Object.values(state.sessions)
    .filter((s) => s.experimentId === experimentId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function createSession({ experimentId, viewportWidth, viewportHeight }) {
  const id = require("crypto").randomUUID();
  const session = {
    id,
    experimentId,
    participantId: require("crypto").randomUUID(),
    consentAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    viewportWidth,
    viewportHeight,
    pageWidth: null,
    pageHeight: null,
    gazeSamples: [],
    clicks: [],
    fixations: [],
  };
  state.sessions[id] = session;
  persist();
  return session;
}

function getSession(id) {
  return state.sessions[id] || null;
}

function finalizeSession(id, { endedAt, pageWidth, pageHeight, gazeSamples, clicks, fixations }) {
  const session = state.sessions[id];
  if (!session) return null;
  session.endedAt = endedAt;
  session.pageWidth = pageWidth;
  session.pageHeight = pageHeight;
  session.gazeSamples = gazeSamples;
  session.clicks = clicks;
  session.fixations = fixations;
  persist();
  return session;
}

module.exports = {
  createExperiment,
  listExperiments,
  getExperiment,
  listSessionsByExperiment,
  createSession,
  getSession,
  finalizeSession,
};

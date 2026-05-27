require("dotenv").config();

const required = ["ALLDEBRID_KEY", "ALLDEBRID_AGENT_NAME", "BASE_DIRECTORY"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

function inferBaseUrl(serieUrl) {
  if (!serieUrl) return undefined;

  try {
    return new URL(serieUrl).origin;
  } catch (error) {
    console.error(`Invalid WAWACITY_SERIE_URL: ${serieUrl}`);
    process.exit(1);
  }
}

const wawacitySerieUrl = process.env.WAWACITY_SERIE_URL;
const wawacityBase = process.env.WAWACITY_BASE || inferBaseUrl(wawacitySerieUrl);

module.exports = {
  alldebrid: {
    key: process.env.ALLDEBRID_KEY,
    endpoint: process.env.ALLDEBRID_ENDPOINT || "http://api.alldebrid.com/v4",
    agentName: process.env.ALLDEBRID_AGENT_NAME,
  },
  baseDirectory: process.env.BASE_DIRECTORY,
  wawacity: {
    base: wawacityBase,
    serieUrl: wawacitySerieUrl,
  },
  download: {
    maxConcurrent: 15,
    timeout: 30000,
  },
  hostPriority: (process.env.HOST_PRIORITY || "Rapidgator,1fichier,Uptobox,Turbobit")
    .split(",")
    .map((h) => h.trim()),
};

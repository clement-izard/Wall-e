const fs = require("fs");
const path = require("path");
const cliProgress = require("cli-progress");
const axios = require("./http");
const config = require("./config");

let activeDownloads = 0;

const multiBar = new cliProgress.MultiBar(
  {
    format: " {bar} {percentage}% | {size} | {filename}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
    clearOnComplete: false,
    forceRedraw: true,
  },
  cliProgress.Presets.shades_grey
);

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function ensureDirectoryExists(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) return;
  ensureDirectoryExists(dirname);
  fs.mkdirSync(dirname);
}

function checkEpisodeExists(episodeNumber, folderPath) {
  try {
    if (!fs.existsSync(folderPath)) return false;

    const files = fs.readdirSync(folderPath);
    const episodePatterns = [
      new RegExp(`[Ee](0*${episodeNumber})(?!\\d)`),
      new RegExp(`[Ss]\\d{2}[Ee](0*${episodeNumber})(?!\\d)`),
      new RegExp(`Episode\\s*(0*${episodeNumber})(?!\\d)`, "i"),
      new RegExp(`Ep\\s*(0*${episodeNumber})(?!\\d)`, "i"),
      new RegExp(`${episodeNumber.toString().padStart(2, "0")}`),
    ];

    const videoExtensions = [".mkv", ".mp4", ".avi", ".m4v", ".mov", ".wmv"];

    for (const file of files) {
      if (!videoExtensions.some((ext) => file.toLowerCase().endsWith(ext)))
        continue;
      for (const pattern of episodePatterns) {
        if (pattern.test(file)) {
          console.log(`Found existing episode ${episodeNumber}: ${file}`);
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.log(
      `Error checking episode ${episodeNumber} in ${folderPath}:`,
      error.message
    );
    return false;
  }
}

function dedupeFilesBySavePath(files) {
  const seen = new Set();
  return files.filter((file) => {
    if (seen.has(file.savePath)) {
      console.log(`Duplicate download target ${file.savePath}, skipping...`);
      return false;
    }
    seen.add(file.savePath);
    return true;
  });
}

async function downloadFile(url, savePath) {
  ensureDirectoryExists(savePath);
  const filename = path.basename(savePath);

  try {
    const response = await axios.get(url, { responseType: "stream" });
    if (response.status !== 200) {
      console.error(
        `Failed to download ${url}. HTTP Status: ${response.status}`
      );
      return;
    }

    const totalBytes = parseInt(response.headers["content-length"], 10) || 0;
    let downloadedBytes = 0;

    const bar = multiBar.create(totalBytes || 1, 0, {
      filename: filename.length > 50 ? filename.slice(0, 47) + "..." : filename,
      size: totalBytes ? `0 / ${formatSize(totalBytes)}` : "unknown size",
    });

    const writer = fs.createWriteStream(savePath);

    response.data.on("data", (chunk) => {
      downloadedBytes += chunk.length;
      bar.update(totalBytes ? downloadedBytes : 1, {
        size: totalBytes
          ? `${formatSize(downloadedBytes)} / ${formatSize(totalBytes)}`
          : formatSize(downloadedBytes),
      });
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        bar.update(totalBytes || 1, {
          size: formatSize(downloadedBytes),
        });
        bar.stop();
        resolve();
      });
      writer.on("error", (error) => {
        bar.stop();
        console.error(`Error downloading file from ${url}:`, error);
        reject(error);
      });
    });
  } catch (e) {
    console.error(`Error downloading file from ${url}:`, e);
  }
}

async function downloadBatched(files) {
  if (files.length === 0) return;

  const queue = dedupeFilesBySavePath(files);
  const workerCount = Math.min(config.download.maxConcurrent, queue.length);

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      activeDownloads++;
      try {
        await downloadFile(file.url, file.savePath);
      } catch (error) {
        console.error("Download error:", error);
      } finally {
        activeDownloads--;
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
}

function stopProgressBars() {
  multiBar.stop();
}

async function parseLinksFile() {
  try {
    const content = await fs.promises.readFile("links.txt", "utf8");
    const links = content.trim().split("\n").filter(Boolean);

    const groupedLinks = links.reduce((acc, link) => {
      const match = decodeURIComponent(link).match(
        /([^/]+)(?:\s+|\.+)S(\d{2})/i
      );
      if (!match) {
        console.warn(`Could not parse series info from link: ${link}`);
        return acc;
      }

      const [, seriesName, seasonNum] = match;
      const season = parseInt(seasonNum, 10);
      const key = `${seriesName}|${season}`;

      if (!acc[key]) {
        acc[key] = {
          seriesName: seriesName.trim(),
          currentSeason: season,
          downloadLinks: [],
        };
      }
      acc[key].downloadLinks.push(link);
      return acc;
    }, {});

    return Object.values(groupedLinks);
  } catch (error) {
    console.error("Error reading links.txt:", error);
    return [];
  }
}

async function downloadFromLinks(series) {
  const filesToDownload = series.downloadLinks
    .map((link) => {
      const filename = decodeURIComponent(link).split("/").pop();
      const folderPath = path.join(
        config.baseDirectory,
        series.seriesName,
        `Season ${series.currentSeason}`
      );
      const filePath = path.join(folderPath, filename);

      if (fs.existsSync(filePath)) {
        console.log(`File ${filePath} already exists, skipping...`);
        return null;
      }

      return { url: link, savePath: filePath };
    })
    .filter(Boolean);

  await downloadBatched(filesToDownload);
  console.log(
    `Finished downloading season ${series.currentSeason} of ${series.seriesName}!`
  );
}

module.exports = {
  checkEpisodeExists,
  downloadBatched,
  parseLinksFile,
  downloadFromLinks,
  stopProgressBars,
};

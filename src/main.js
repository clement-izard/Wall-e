const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const { getLinksFromPage } = require("./scraper");
const { getFromRedirector, unlockLink } = require("./alldebrid");
const {
  checkEpisodeExists,
  downloadBatched,
  parseLinksFile,
  downloadFromLinks,
  stopProgressBars,
} = require("./downloader");

function notify(title, message) {
  execFile("notify-send", [title, message], (err) => {
    if (err) console.log("Desktop notification not available");
  });
}

function formatEpisodeRef(seasonNumber, episodeNumber) {
  return `S${String(seasonNumber).padStart(2, "0")}E${String(
    episodeNumber
  ).padStart(2, "0")}`;
}

function formatFailedLink({ seasonNumber, episodeNumber, reason, sourceLink }) {
  const episodeRef = formatEpisodeRef(seasonNumber, episodeNumber);
  return `${episodeRef} (${reason}): ${sourceLink}`;
}

async function main() {
  if (process.argv.includes("--links")) {
    const seriesList = await parseLinksFile();
    console.log(`Found ${seriesList.length} series to download`);

    for (const series of seriesList) {
      console.log(
        `Processing ${series.seriesName} Season ${series.currentSeason}`
      );
      await downloadFromLinks(series);
    }

    stopProgressBars();
    console.log("All files from links.txt have been processed!");
    notify("Wall-e", "All files from links.txt have been processed!");
    return;
  }

  const result = await getLinksFromPage(config.wawacity.serieUrl);
  console.log(result);
  const failedLinks = [];

  for (const season of result) {
    if (!season.seriesName) {
      console.log("Skipping season due to missing series name");
      continue;
    }

    const folderPath = path.join(
      config.baseDirectory,
      season.seriesName,
      `Season ${season.currentSeason}`
    );

    const linksToProcess = [];

    season.links.forEach((link, index) => {
      const episodeNumber = index + 1;
      if (checkEpisodeExists(episodeNumber, folderPath)) {
        console.log(`Episode ${episodeNumber} already exists, skipping link`);
        return;
      }
      linksToProcess.push({
        sourceLink: link,
        seasonNumber: season.currentSeason,
        episodeNumber,
      });
    });

    console.log(
      `Processing ${linksToProcess.length} links out of ${season.links.length} total links`
    );

    if (linksToProcess.length === 0) {
      console.log(
        `All files for season ${season.currentSeason} already exist, skipping`
      );
      continue;
    }

    const redirectorResults = await Promise.all(
      linksToProcess.map(async (linkInfo) => ({
        ...linkInfo,
        redirectedLink: await getFromRedirector(linkInfo.sourceLink),
      }))
    );
    const linksToUnlock = redirectorResults.filter(
      ({ redirectedLink, ...linkInfo }) => {
        if (redirectedLink) return true;
        failedLinks.push({ ...linkInfo, reason: "redirector failed" });
        return false;
      }
    );
    console.log("Without redirector links:", linksToUnlock.length);

    const unlockedResults = await Promise.all(
      linksToUnlock.map(async ({ redirectedLink, ...linkInfo }) => ({
        ...linkInfo,
        fileInfo: await unlockLink(redirectedLink),
      }))
    );
    console.log("Nb of unlocked links:", unlockedResults.length);

    const filesToDownload = unlockedResults
      .map(({ fileInfo, ...linkInfo }) => {
        if (!fileInfo) {
          failedLinks.push({ ...linkInfo, reason: "unlock failed" });
          return null;
        }

        const filePath = path.join(folderPath, fileInfo.filename);
        if (fs.existsSync(filePath)) {
          console.log(`File ${fileInfo.filename} already exists, skipping...`);
          return null;
        }

        return { url: fileInfo.link, savePath: filePath };
      })
      .filter(Boolean);

    await downloadBatched(filesToDownload);
    console.log(`Finished downloading season ${season.currentSeason}!`);
  }

  stopProgressBars();

  const seriesName = result[0]?.seriesName || "unknown series";
  console.log(`All files downloaded for series ${seriesName}!`);
  if (failedLinks.length) {
    console.log(
      "Failed links: \n\n",
      failedLinks.map(formatFailedLink).join("\n")
    );
  }
  console.log("\n\nDone!");
  notify("Wall-e", `Download complete: ${seriesName}`);
}

module.exports = main;

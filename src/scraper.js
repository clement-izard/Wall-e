const cheerio = require("cheerio");
const axios = require("./http");
const config = require("./config");

async function fetchWebsiteContent(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching the website:", error);
    return null;
  }
}

function extractDLProtectLinks($) {
  for (const host of config.hostPriority) {
    const links = [];
    $(`tr:contains("${host}")`).each((_, row) => {
      $(row)
        .find('a[href*="dl-protect"]')
        .each((_, el) => {
          links.push($(el).attr("href"));
        });
    });
    if (links.length > 0) {
      console.log(`Host: ${host} (${links.length} links)`);
      return links;
    }
    console.log(`Host "${host}" not available, trying next...`);
  }
  console.error("No supported host found on page");
  return [];
}

function extractSeriesAndSeason($) {
  const titleText = $("h1.wa-block-title").text().trim().replace(/\s+/g, " ");

  const seriesMatch = titleText.match(
    /(?:Series|Animés) » ([^-]+)(?:\s*-\s*(?:Saison\s*(\d+)))?(?:\s*-\s*)?(.+)?/i
  );

  if (!seriesMatch) {
    return { seriesName: null, currentSeason: null, quality: null };
  }

  const seriesName = seriesMatch[1].trim().replaceAll(":", "_");
  const currentSeason = seriesMatch[2] ? parseInt(seriesMatch[2], 10) : 1;
  const quality = seriesMatch[3]?.trim() || "VOSTFR";

  console.log("Extracted data:", { seriesName, currentSeason, quality });
  return { seriesName, currentSeason, quality };
}

async function extractOtherSeasonLinks($, currentQuality) {
  console.log("Current quality passed to function:", currentQuality);

  const otherSeasonLinks = [];
  const baseSeasonLinks = [];

  $(
    'div.wa-sub-block:contains("Autres saisons disponibles") ul.wa-post-list-ofLinks li a'
  ).each((_, linkElem) => {
    baseSeasonLinks.push(`${config.wawacity.base}${$(linkElem).attr("href")}`);
  });

  console.log("Found other season links:", baseSeasonLinks.length);

  for (const link of baseSeasonLinks) {
    const response = await axios.get(link);
    const $newPage = cheerio.load(response.data);
    const newPageTitle = $newPage("h1.wa-block-title").text();
    console.log("New page title:", newPageTitle);

    if (!currentQuality) {
      otherSeasonLinks.push(link);
      continue;
    }

    const qualityMatch = newPageTitle.match(
      /(?:Series|Animés) » .*?(?:\s+-\s+(?:Saison\s+)?\d+)?(?:\s+-\s+)?(.+)?$/i
    );
    const newPageQuality = qualityMatch?.[1]?.trim();
    console.log("New page quality:", newPageQuality);

    if (!newPageQuality) {
      otherSeasonLinks.push(link);
      continue;
    }

    if (
      (currentQuality.includes("HD") && newPageQuality === currentQuality) ||
      currentQuality + " HD" === newPageQuality
    ) {
      otherSeasonLinks.push(link);
    } else {
      let matchingQualityLink = null;
      $newPage(
        'div.wa-sub-block:contains("Autres langues/qualités disponibles") ul.wa-post-list-ofLinks li a'
      ).each((_, linkElem) => {
        const qualityText = $newPage(linkElem).find("button i").text().trim();
        if (qualityText === currentQuality + " HD") {
          matchingQualityLink = `${config.wawacity.base}${$newPage(linkElem).attr("href")}`;
        } else if (qualityText === currentQuality && !matchingQualityLink) {
          matchingQualityLink = `${config.wawacity.base}${$newPage(linkElem).attr("href")}`;
        }
      });

      otherSeasonLinks.push(matchingQualityLink || link);
    }
  }

  return otherSeasonLinks;
}

async function getLinksFromPage(url, noOtherSeasons = false, seasonOffset = 0) {
  const content = await fetchWebsiteContent(url);
  if (!content) {
    console.error(`Failed to fetch page: ${url}`);
    return noOtherSeasons
      ? { seriesName: null, currentSeason: null, links: [] }
      : [];
  }

  const $ = cheerio.load(content);
  const { seriesName, currentSeason, quality } = extractSeriesAndSeason($);

  const fallbackSeriesName = url
    .match(/\/([^/]+)-(?:saison-\d+|vostfr)/i)?.[1]
    ?.replace(/-/g, " ")
    ?.trim();

  const links = extractDLProtectLinks($);
  const currentSeasonData = {
    seriesName: seriesName || fallbackSeriesName,
    currentSeason: currentSeason || seasonOffset + 1,
    links,
  };

  if (noOtherSeasons) return currentSeasonData;

  const otherSeasons = await extractOtherSeasonLinks($, quality);
  const result = [currentSeasonData];

  for (let i = 0; i < otherSeasons.length; i++) {
    const { links: newLinks } = await getLinksFromPage(
      otherSeasons[i],
      true,
      seasonOffset + i + 1
    );
    result.push({
      seriesName: seriesName || fallbackSeriesName,
      currentSeason: seasonOffset + i + 2,
      links: newLinks,
    });
  }

  return result;
}

module.exports = { fetchWebsiteContent, getLinksFromPage };

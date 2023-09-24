require("dotenv").config();
const rawAxios = require("axios");
const cheerio = require("cheerio");
const rateLimit = require("axios-rate-limit");
const axiosRetry = require('axios-retry');
const fs = require('fs');
const path = require('path');

const axios = rateLimit(rawAxios.create(), { maxRequests: 12, perMilliseconds: 1000 });
axiosRetry(axios, { retries: 3, retryDelay: () => 1000 });

const MAX_CONCURRENT_DOWNLOADS = 15;

let activeDownloads = 0;

async function fetchWebsiteContent(url) {
	try {
		const response = await axios.get(url);
		return response.data;
	} catch (error) {
		console.error('Error fetching the website:', error);
		return null;
	}
}

function extractDLProtectLinks($) {
	const res = [];

	// Find all table rows containing '1fichier'
	$('tr:contains("1fichier")').each((index, row) => {

		// For each filtered row, find all a tags with "dl-protect" in their href
		$(row).find('a[href*="dl-protect"]').each((i, linkElem) => {
			// Add the href attribute of each link to the result array
			res.push($(linkElem).attr('href'));
		});
	});

	return res;
}

function extractSeriesAndSeason($) {
	// Extract the series name and current season using regex
	const titleText = $('h1.wa-block-title').text();
	const match = titleText.match(/Series » (.+?) - Saison (\d+) - (.+)/i);

	if (!match) return { seriesName: null, currentSeason: null, quality: null };

	const seriesName = match[1].trim().replaceAll(':', '_');
	const currentSeason = parseInt(match[2], 10);
	const quality = match[3].trim();

	return { seriesName, currentSeason, quality };
}

async function extractOtherSeasonLinks($, currentQuality) {
	const otherSeasonLinks = [];

	const baseSeasonLinks = [];
	// Extract other season URLs
	$('div.wa-sub-block:contains("Autres saisons disponibles") ul.wa-post-list-ofLinks li a').each((i, linkElem) => {
		baseSeasonLinks.push(`${process.env.WAWACITY_BASE}${$(linkElem).attr('href')}`);
	});

	for (const link of baseSeasonLinks) {
		const response = await axios.get(link);
		const $newPage = cheerio.load(response.data);
		const newPageQuality = $newPage('h1.wa-block-title').text().match(/Series » (.+?) - Saison (\d+) - (.+)/i)?.[3].trim();

		// Try to get HD quality if available
		if ((currentQuality.includes("HD") && newPageQuality === currentQuality) || (currentQuality + " HD" === newPageQuality)) {
			otherSeasonLinks.push(link);
		} else {
			// Either the quality is not HD or the language is different
			// Extract quality-specific link that matches the desired quality
			let matchingQualityLink = null;
			$newPage('div.wa-sub-block:contains("Autres langues/qualités disponibles") ul.wa-post-list-ofLinks li a').each((i, linkElem) => {
				const qualityText = $newPage(linkElem).find('button i').text().trim();
				if (qualityText === currentQuality + " HD") {
					matchingQualityLink = `${process.env.WAWACITY_BASE}${$newPage(linkElem).attr('href')}`;
				} else if (qualityText === currentQuality && !matchingQualityLink) {
					matchingQualityLink = `${process.env.WAWACITY_BASE}${$newPage(linkElem).attr('href')}`;
				}
			});

			if (matchingQualityLink) {
				otherSeasonLinks.push(matchingQualityLink);
			} else {
				// If no matching quality link is found, default to the base link
				otherSeasonLinks.push(link);
			}
		}
	}

	return otherSeasonLinks;
}

async function getLinksFromPage(url, noOtherSeasons = false) {
	const content = await fetchWebsiteContent(url);
	const $ = cheerio.load(content);
	const { seriesName, currentSeason, quality } = extractSeriesAndSeason($);

	const links = extractDLProtectLinks($);
	const currentSeasonData = {
		seriesName,
		currentSeason,
		links,
	};
	if (noOtherSeasons) return currentSeasonData;
	const otherSeasons = await extractOtherSeasonLinks($, quality);
	const result = [currentSeasonData];
	for (const otherSeason of otherSeasons) {
		const { links: newLinks, currentSeason: newSeason } = await getLinksFromPage(otherSeason, true);
		result.push({ seriesName, currentSeason: newSeason, links: newLinks });
	}

	return result;
}

async function unlockLink(link) {
	try {
		const response = await axios.get(`http://api.alldebrid.com/v4/link/unlock?agent=${process.env.ALLDEBRID_AGENT_NAME}&apikey=${process.env.ALLDEBRID_KEY}&link=${link}`);

		return response.data.data;
	} catch (error) {
		console.error('Error unlocking links:', error);
		return null;
	}
}

async function getFromRedirector(link) {
	try {
		const response = await axios.get(`http://api.alldebrid.com/v4/link/redirector?agent=${process.env.ALLDEBRID_AGENT_NAME}&apikey=${process.env.ALLDEBRID_KEY}&link=${link}`);

		return response.data.data.links[0];
	} catch (error) {
		console.error('Error unlocking links:', error);
		return null;
	}
}

function ensureDirectoryExists(filePath) {
	const dirname = path.dirname(filePath);
	if (fs.existsSync(dirname)) {
		return true;
	}
	ensureDirectoryExists(dirname);
	fs.mkdirSync(dirname);
}

async function downloadFile(url, savePath) {
	ensureDirectoryExists(savePath);

	try {
		const response = await axios.get(url, { responseType: 'stream' });
		if (response.status !== 200) {
			console.error(`Failed to download ${url}. HTTP Status: ${response.status}`);
			return;
		}

		// Saving file
		const writer = fs.createWriteStream(savePath);
		response.data.pipe(writer);

		return new Promise((resolve, reject) => {
			writer.on('finish', resolve);
			writer.on('error', (error) => {
				console.error(`Error downloading file from url in promise - ${url}:`, error);
				reject(error);
			});
		});
	} catch (e) {
		console.error(`Error downloading file from url ${url}:`, e);
	}
}

async function downloadBatched(files) {
	if (files.length === 0) return;

	// Start the next download if we're below the limit
	while (activeDownloads < MAX_CONCURRENT_DOWNLOADS && files.length > 0) {
		activeDownloads++;
		const file = files.shift();  // Take the next file
		console.log(`Downloading ${path.basename(file.savePath)}`);
		await downloadFile(file.url, file.savePath)
			.then(() => {
				activeDownloads--;
				downloadBatched(files);  // Recursively process the next file
			})
			.catch(error => {
				console.error("Download error:", error);
				activeDownloads--;
			});
	}
}

// type Season = {
// 	seriesName: string,
// 	currentSeason: number,
// 	links: string[],
// }

async function main() {
	const result = await getLinksFromPage(process.env.WAWACITY_SERIE_URL);
	console.log(result);
	const failedLinks = [];

	for (const season of result) {
		const redirectorPromises = [];
		for (const link of season.links) {
			redirectorPromises.push(getFromRedirector(link));
		}
		const withoutRedirectorLinks = await Promise.all(redirectorPromises);
		console.log("Nb of links without redirects: ", withoutRedirectorLinks.length);

		const unlockedPromises = [];
		for (const link of (withoutRedirectorLinks.filter((l) => !!l))) {
			unlockedPromises.push(unlockLink(link));
		}

		const unlockedLinks = await Promise.all(unlockedPromises);
		console.log("Nb of unlocked links: ", unlockedLinks.length);

		// Prepare files for downloading
		const filesToDownload = unlockedLinks.map((fileInfo, index) => {
			// Todo: avoid false positive by checking if the file exists before
			if (!fileInfo) {
				console.log("Skipping file because Alldebrid returned an error", index, season.links[index]);
				failedLinks.push(season.links[index]);
				return null;
			}

			const folderPath = path.join(process.env.BASE_DIRECTORY, season.seriesName, `Season ${season.currentSeason}`);
			const filePath = path.join(folderPath, fileInfo.filename);

			// If file already exists, skip it
			if (fs.existsSync(filePath)) {
				console.log(`File ${filePath} already exists, skipping...`);
				return null;
			}

			return {
				url: fileInfo.link,
				savePath: filePath
			};
		}).filter(Boolean);


		// Download using the batched approach
		await downloadBatched(filesToDownload);
		console.log(`Finished downloading season ${season.currentSeason}!`);
	}
	console.log(`All files downloaded for series ${result[0].seriesName}!`);
	if (failedLinks.length) {
		console.log("Failed links: \n\n", failedLinks.join('\n'));
	}
	console.log('\n\nDone!');
}

main();

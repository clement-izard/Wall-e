require("dotenv").config();
const rawAxios = require("axios");
const cheerio = require("cheerio");
const rateLimit = require("axios-rate-limit");
const axiosRetry = require('axios-retry');
const fs = require('fs');
const path = require('path');

const axios = rateLimit(rawAxios.create(), { maxRequests: 12, perMilliseconds: 1000 });
axiosRetry(axios, { retries: 3, retryDelay: () => 1000 });

const DOMAIN = "https://www.wawacity.rocks/"
const BASE_URL = "https://www.wawacity.rocks/?p=serie&id=18011-the-expanse-saison1";

const SERIES_URLS = [
	"https://www.wawacity.rocks/?p=serie&id=9474-your-honor-saison1",
	"https://www.wawacity.rocks/?p=serie&id=3101-narcos-saison1",
	"https://www.wawacity.rocks/?p=serie&id=20244-damages-saison1",
	"https://www.wawacity.rocks/?p=serie&id=18388-marvel-s-the-punisher-saison1",
	"https://www.wawacity.rocks/?p=serie&id=14114-severance-saison1",
	"https://www.wawacity.rocks/?p=serie&id=13126-invasion-saison1",
	"https://www.wawacity.rocks/?p=serie&id=2581-parks-and-recreation-saison1",
	"https://www.wawacity.rocks/?p=serie&id=1076-community-saison1",
	"https://www.wawacity.rocks/?p=serie&id=2000-breaking-bad-saison1",
	"https://www.wawacity.rocks/?p=serie&id=4539-for-all-mankind-saison1",
	"https://www.wawacity.rocks/?p=serie&id=1086-the-office-us-saison1",
	"https://www.wawacity.rocks/?p=serie&id=2471-westworld-saison1",
	"https://www.wawacity.rocks/?p=serie&id=2916-black-mirror-saison1",
	"https://www.wawacity.rocks/?p=serie&id=8475-le-jeu-de-la-dame-saison1",
];

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
	const match = titleText.match(/Series » (.+?) - Saison (\d+)/i);

	if (!match) return { seriesName: null, currentSeason: null };

	const seriesName = match[1].trim();
	const currentSeason = parseInt(match[2], 10);

	return { seriesName, currentSeason };
}

function extractOtherSeasonLinks($) {
	const otherSeasonLinks = [];

	// Extract other season URLs
	$('div.wa-sub-block:contains("Autres saisons disponibles") ul.wa-post-list-ofLinks li a').each((i, linkElem) => {
		otherSeasonLinks.push(`${DOMAIN}${$(linkElem).attr('href')}`);
	});

	return otherSeasonLinks;
}

async function getLinksFromPage(url, noOtherSeasons = false) {
	const content = await fetchWebsiteContent(url);
	const $ = cheerio.load(content);
	const { seriesName, currentSeason } = extractSeriesAndSeason($);
	const links = extractDLProtectLinks($);
	const currentSeasonData = {
		seriesName,
		currentSeason,
		links,
	};
	if (noOtherSeasons) return currentSeasonData;
	const otherSeasons = extractOtherSeasonLinks($);
	const result = [currentSeasonData];
	for (const otherSeason of otherSeasons) {
		const { links: newLinks, currentSeason: newSeason } = await getLinksFromPage(otherSeason, true);
		result.push({ seriesName, currentSeason: newSeason, links: newLinks });
	}

	return result;
}

const RESULT = [
	{
		seriesName: 'The Expanse',
		currentSeason: 3,
		links: [
			'https://dl-protect.link/8392e523?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSAxIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/3f6b7d5a?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSAyIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/edeea748?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSAzIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/1e830c14?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSA0IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/0485a2d4?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSA1IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/d80017d3?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSA2IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/2f08be9b?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSA3IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/d38134cc?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSA4IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/ca3fe11e?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSA5IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/aba30295?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSAxMCAtIFtWT1NURlIgSERd&rl=b2',
			'https://dl-protect.link/5da4af9f?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSAxMSAtIFtWT1NURlIgSERd&rl=b2',
			'https://dl-protect.link/0c74cb5e?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSAxMiAtIFtWT1NURlIgSERd&rl=b2',
			'https://dl-protect.link/92049601?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gMyDDiXBpc29kZSAxMyAtIFtWT1NURlIgSERd&rl=b2'
		]
	},
	{
		seriesName: 'The Expanse',
		currentSeason: 4,
		links: [
			'https://dl-protect.link/de180e9b?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNCDDiXBpc29kZSAwIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/f5491a2b?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNCDDiXBpc29kZSAxIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/0369408f?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNCDDiXBpc29kZSAyIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/158333d6?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNCDDiXBpc29kZSAzIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/96b43582?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNCDDiXBpc29kZSA0IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/59aac0cd?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNCDDiXBpc29kZSA1IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/01a73640?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNCDDiXBpc29kZSA2IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/56caeaf6?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNCDDiXBpc29kZSA3IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/c49d4e63?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNCDDiXBpc29kZSA4IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/25d84699?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNCDDiXBpc29kZSA5IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/32b78cb3?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNCDDiXBpc29kZSAxMCAtIFtWT1NURlIgSERd&rl=b2'
		]
	},
	{
		seriesName: 'The Expanse',
		currentSeason: 5,
		links: [
			'https://dl-protect.link/3bc2d8e3?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNSDDiXBpc29kZSAxIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/49804a5f?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNSDDiXBpc29kZSAyIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/7d3a105c?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNSDDiXBpc29kZSAzIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/c7adc8a8?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNSDDiXBpc29kZSA0IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/3074c46f?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNSDDiXBpc29kZSA1IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/d38d34f5?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNSDDiXBpc29kZSA2IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/aeae39d2?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNSDDiXBpc29kZSA3IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/be79013c?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNSDDiXBpc29kZSA4IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/19345618?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNSDDiXBpc29kZSA5IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/b35a32bd?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNSDDiXBpc29kZSAxMCAtIFtWT1NURlIgSERd&rl=b2'
		]
	},
	{
		seriesName: 'The Expanse',
		currentSeason: 6,
		links: [
			'https://dl-protect.link/250b139c?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNiDDiXBpc29kZSAxIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/3621bf87?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNiDDiXBpc29kZSAyIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/6331644d?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNiDDiXBpc29kZSAzIC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/479012f5?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNiDDiXBpc29kZSA0IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/933fc27d?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNiDDiXBpc29kZSA1IC0gW1ZPU1RGUiBIRF0%3D&rl=b2',
			'https://dl-protect.link/c6c578c8?fn=VGhlIEV4cGFuc2UgLSBTYWlzb24gNiDDiXBpc29kZSA2IC0gW1ZPU1RGUiBIRF0%3D&rl=b2'
		]
	}
];


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
		const writer = fs.createWriteStream(savePath);
		const response = await axios.get(url, { responseType: 'stream' });

		// let downloadedBytes = 0;
		// response.data.on('data', (chunk) => {
		// 	downloadedBytes += chunk.length;
		// 	console.log(`Downloaded ${downloadedBytes} bytes from ${url}`);
		// });

		if (response.status !== 200) {
			console.error(`Failed to download ${url}. HTTP Status: ${response.status}`);
			return;
		}

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

async function main() {
	// const result = await getLinksFromPage(BASE_URL);
	// console.log(result);
	// console.log("Wawa Links:", RESULT[5].links);
	const failedLinks = [];

	for (const season of RESULT) {
		const redirectorPromises = [];
		for (const link of season.links) {
			redirectorPromises.push(getFromRedirector(link));
		}
		const withoutRedirectorLinks = await Promise.all(redirectorPromises);
		console.log("Without redirects: ", JSON.stringify(withoutRedirectorLinks, null, 2));

		const unlockedPromises = [];
		for (const link of (withoutRedirectorLinks.filter((l) => !!l))) {
			unlockedPromises.push(unlockLink(link));
		}

		const unlockedLinks = await Promise.all(unlockedPromises);
		console.log("Unlocked links: ", JSON.stringify(unlockedLinks, null, 2));

		const downloadPromises = unlockedLinks.map((fileInfo, index) => {
			if (!fileInfo) {
				console.log("Skipping file because it's null", index, season.links[index]);
				failedLinks.push(season.links[index]);
				return Promise.resolve();
			}
			const folderPath = path.join(process.env.BASE_DIRECTORY, season.seriesName, `Season ${season.currentSeason}`);
			const filePath = path.join(folderPath, fileInfo.filename);
			// If file already exists, skip it
			if (fs.existsSync(filePath)) {
				console.log(`File ${filePath} already exists, skipping...`);
				return Promise.resolve();
			}
			console.log(`Downloading ${fileInfo.filename}...`);
			return downloadFile(fileInfo.link, filePath);
		});

		await Promise.all(downloadPromises);
		console.log(`Finished downloading season ${season.currentSeason}!`);
	}
	console.log(`All files downloaded for series ${RESULT[0].seriesName}!`);
	console.log("Failed links: ", JSON.stringify(failedLinks, null, 2));
}

main();

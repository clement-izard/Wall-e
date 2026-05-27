const axios = require("./http");
const config = require("./config");

async function unlockLink(link) {
  try {
    const response = await axios.get(
      `${config.alldebrid.endpoint}/link/unlock?agent=${config.alldebrid.agentName}&apikey=${config.alldebrid.key}&link=${link}`
    );
    return response.data.data;
  } catch (error) {
    console.error("Error unlocking link:", error);
    return null;
  }
}

const REDIRECTOR_RETRY_DELAYS = [1000, 3000, 5000, 10000];

async function getFromRedirector(link, attempt = 0) {
  try {
    const response = await axios.get(
      `${config.alldebrid.endpoint}/link/redirector?agent=${config.alldebrid.agentName}&apikey=${config.alldebrid.key}&link=${link}`
    );

    if (!response.data) {
      console.error("No response data from AllDebrid redirector API");
      return null;
    }

    if (response.data.status === "error") {
      if (attempt < REDIRECTOR_RETRY_DELAYS.length) {
        const delay = REDIRECTOR_RETRY_DELAYS[attempt];
        console.log(
          `Redirector error for ${link}, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${REDIRECTOR_RETRY_DELAYS.length})...`
        );
        await new Promise((r) => setTimeout(r, delay));
        return getFromRedirector(link, attempt + 1);
      }
      console.error(
        `AllDebrid redirector failed after ${REDIRECTOR_RETRY_DELAYS.length} retries for ${link}:`,
        response.data.error
      );
      return null;
    }

    if (!response.data.data) {
      console.error(
        "Invalid response structure from AllDebrid redirector API:",
        response.data
      );
      return null;
    }

    if (!response.data.data.links || !response.data.data.links[0]) {
      console.error(
        "No links found in AllDebrid redirector response:",
        response.data.data
      );
      return null;
    }

    return response.data.data.links[0];
  } catch (error) {
    if (attempt < REDIRECTOR_RETRY_DELAYS.length) {
      const delay = REDIRECTOR_RETRY_DELAYS[attempt];
      console.log(
        `Redirector network error for ${link}, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${REDIRECTOR_RETRY_DELAYS.length})...`
      );
      await new Promise((r) => setTimeout(r, delay));
      return getFromRedirector(link, attempt + 1);
    }
    console.error("Error from redirector after all retries:", error);
    return null;
  }
}

module.exports = { unlockLink, getFromRedirector };

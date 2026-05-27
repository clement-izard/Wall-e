const rawAxios = require("axios");
const rateLimit = require("axios-rate-limit");
const axiosRetry = require("axios-retry");
const config = require("./config");

const axios = rateLimit(rawAxios.create({ timeout: config.download.timeout }), {
  maxRequests: 12,
  perMilliseconds: 1000,
});

axiosRetry(axios, {
  retries: 5,
  retryDelay: (retryCount) => retryCount * 2000,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    error.response?.status >= 500 ||
    error.code === "ECONNABORTED",
});

module.exports = axios;

//lib/util.js

const moment = require("moment-timezone");
const crypto = require('node:crypto');
const { tmpdir } = require('node:os');
const path = require("node:path");
const fs = require('fs-extra');

// Converts a timestamp to a formatted date and time (DD/MM HH:mm:ss)
const timestampToDate = (timestampMsg) => {
    return moment(timestampMsg).format('DD/MM HH:mm:ss');
};

// Formats seconds into minutes and seconds (mm:ss)
const formatSeconds = (seconds) => {
    return moment(seconds * 1000).format('mm:ss');
};

// Returns the current date and time (DD/MM HH:mm:ss)
const currentDateTime = () => {
    return moment(Date.now()).format('DD/MM HH:mm:ss');
};

// Capitalizes the first letter of a word
const capitalizeFirstLetter = (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
};

// Generates a random name with a given extension
const getRandomName = (extension) => {
    return `${Math.floor(Math.random() * 10000)}.${extension}`;
};

// Generates a path for a temporary file with a given extension
const getTemporaryPath = (extension) => {
    const tempDir = path.join(tmpdir(), 'lbot-api-midias');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    return path.join(tempDir, `${crypto.randomBytes(20).toString('hex')}.${extension}`);
};

// Exporting functions
module.exports = {
    timestampToDate,
    formatSeconds,
    currentDateTime,
    capitalizeFirstLetter,
    getRandomName,
    getTemporaryPath
};


const { createLogger, format, transports } = require('winston');
const { combine, timestamp, splat, printf, colorize } = format;
require('winston-daily-rotate-file');
const paccount = process.env.DSP_ACCOUNT || process.env.PROOF_PROVIDER_ACCOUNT || 'pprovider1';
const level = process.env.LOGGING_LEVEL || 'debug';
const path = require('path');
var thisProcess = process.argv[1];
var parts = thisProcess.split(path.sep)
var processName = parts[parts.length - 2];
const logfileName = process.env.LOGFILE_NAME || processName;

// define the custom settings for each transport (file, console)
const options = {
    file: {
        level,
        filename: `./logs/${paccount}-${logfileName}-%DATE%.log`,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        datePattern: 'YYYY-MM-DD'
    },
};

const customFormat = printf((info) => {
    // console.log(info)
    const {
    timestamp, level, message, ...args
    } = info;
    // makes date prettier
    const ts = timestamp.slice(0, 19).replace('T', ' ');
    return `${ts} [${level}]: ${message}`;
})



// instantiate a new Winston Logger with the settings defined above
let logger = new createLogger({
    format: combine(
        timestamp(),
        splat(),
        colorize(),
        customFormat
    ),
    transports: [
        new transports.DailyRotateFile(options.file),
    ]
});

module.exports = logger;

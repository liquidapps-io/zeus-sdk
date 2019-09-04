const { createLogger, format, transports } = require('winston');
const { combine, timestamp, splat, printf } = format;
require('winston-daily-rotate-file');
const paccount = process.env.DSP_ACCOUNT || process.env.PROOF_PROVIDER_ACCOUNT || 'pprovider1';
const level = process.env.LOGGING_LEVEL || 'debug';

// define the custom settings for each transport (file, console)
const options = {
  file: {
    level,
    filename: `./logs/${paccount}-%DATE%.log`,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    datePattern: 'YYYY-MM-DD'
  },
};

const customFormat = printf((info) => {
    console.log(info)
    return `${info.timestamp} ${info.level}: ${info.message}`;
})



// instantiate a new Winston Logger with the settings defined above
let logger = new createLogger({
    format: combine(
        timestamp(),
        splat(),
        customFormat
    ),
    transports: [
        new transports.DailyRotateFile(options.file),
    ]
});

module.exports = logger;
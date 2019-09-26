var colors = require('colors');
var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const logger = require('../../extensions/helpers/logger');

const colorizeLevel = {
  'FATAL': 'red',
  'WARN': 'yellow',
  'ERROR': 'magenta',
  'INFO': 'green',
  'DEBUG': 'gray',
  'TRACE': 'gray'
};
String.prototype.paddingRight = function(num) {
  var paddingValue = ' '.repeat(num);
  var bigger = this.length > paddingValue.length - 1;
  return String(this + paddingValue).substr(0, paddingValue.length - (bigger ? 4 : 1)) + (bigger ? '...' : '');
};
var positionLn = 30;
var msgLn = 256;

const writeLog = (payer, timeStr, level, filename, line, func, message) => {
  if (logger[level.toLocaleLowerCase()])
    logger[level.toLocaleLowerCase()](`${payer} ${timeStr} ${`${filename}:${func}:${line}`} ${message.trim()}`);
  console.log(
    `${payer.paddingRight(13).blue} ${timeStr.yellow} ${level.paddingRight(6)[colorizeLevel[level]]} ${`${filename}:${func}:${line}`.paddingRight(positionLn).cyan} ${message.paddingRight(msgLn).trim()}`
  );
};

setTimeout(() => {
  writeLog('LOG SVC NODE', new Date().toISOString(), 'INFO', 'index.js', 0, 'global', 'Started Service');
}, 2500);
nodeFactory('log', {
  logevent: async(request, { time, level, filename, line, func, message }) => {
    var timeStr = new Date(time / 1000).toISOString();
    writeLog(request.event.payer, timeStr, level, filename, line, func, message);

    return { size: message.length, reciept: new Date().getTime().toString() };
  },
  logclear: async(request, { level }) => {
    // clear log
    return { size: 0 };
  }
});

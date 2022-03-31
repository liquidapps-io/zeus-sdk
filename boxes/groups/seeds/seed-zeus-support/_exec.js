const { exec, spawn } = require('child_process');
const fs = require('fs');
const { lstatSync, readdirSync } = fs;
const { join } = require('path');
var emoji = require('node-emoji');
const isWsl = require('is-wsl');
require('@colors/colors');

function onData(printCB, printStream, outObj, key) {
  return function(data) {
    var line = data.toString();
    if (printCB) { line = printCB(line); }
    if (printStream) { printStream.write(line); }
    outObj[key] += line;
  };
}
const execPromise = function(cmd, options) {
  return new Promise(function(resolve, reject) {
    if (options && options.unref) {
      options.detached = true;
      options.stdio = ['ignore'];
    }
    var childproc = exec(cmd, options, function(err, stdout) {});
    options = options || {};
    var { printOutStream, printErrStream, printOutCB, printErrCB } = options;
    if (options.unref) {
      childproc.unref();
      return resolve('');
    }
    const outObj = {
      stdout: '',
      stderr: ''
    };
    childproc.stdout.on('data', onData(printOutCB, printOutStream, outObj, 'stdout'));
    childproc.stderr.on('data', onData(printErrCB, printErrStream, outObj, 'stderr'));
    childproc.on('exit', function(code) {
      var stdout = outObj.stdout;
      if (code === 0) { return resolve(stdout); }
      var err = new Error('exec failed');
      err.stdout = stdout;
      err.stderr = outObj.stderr;
      err.code = code;
      return reject(err);
    });
  });
};

const isFile = source => !lstatSync(source).isDirectory();
const getScripts = source =>
  readdirSync(source).map(name => join(source, name)).filter(isFile).filter(a => a.endsWith('.js')).sort();

const execScripts = async(scriptsPath, argsFn, yargsArgs, helper) => {
  global.yargsArgs = yargsArgs;
  let scripts = getScripts(scriptsPath);
  for (let i = 0; i < scripts.length; i++) {
    if(helper && !scripts[i].includes(helper)) {
      continue;
    }
    let script = scripts[i];
    let newArgs = argsFn(script);
    if (!newArgs) { continue; }
    let module = require(script);
    await module.call(module, ...newArgs);
  }
};
const manipulateTextAtPosition = (line, pos, length, fn) => {
  return line.substr(0, pos) + fn(line.substr(pos, length)) + line.substr(pos + length);
};
const colorizeArr = (txt, colorsArr) => {
  return colorsArr.reduce((current, newOne) => current[newOne], txt);
};
const colorizeMatch = (line, match, ...colorsArr) => !match ? line :
  colorizePos(line, match.index, match[0].length, ...colorsArr);

const colorizeSubstr = (line, str, ...colorsArr) => line.indexOf(str) === -1 ? line :
  manipulateTextAtPosition(line, line.indexOf(str), str.length, (txt) =>
    colorizeArr(txt, colorsArr));

const colorizePos = (line, pos, length, ...colorsArr) =>
  manipulateTextAtPosition(line, pos, length, (txt) =>
    colorizeArr(txt, colorsArr));

var colorMap = {
  'message': 'bold',
  'error': 'red',
  'warning': 'magenta',
  'note': 'blue',
  'make': 'gray',
  'cursor': 'blue'
};
var emojMap = {
  'error': 'warning',
  'warning': 'pencil2',
  'ok': 'heavy_check_mark',
  'note': 'black_medium_small_square',
  'zap': 'zap',
  'star': 'star',
  'heart': 'heart',
  'congratulations': 'congratulations',
  'final_warning': 'warning',
  'final_error': 'skull_and_crossbones',
  'v': 'v',
  'phone': 'phone',
  'umbrella': 'umbrella',
  'point_up': 'point_up',
  'arrow_forward': 'arrow_backward',
  'arrow_backward': 'arrow_backward',
  'coffee': 'coffee',
  'cloud': 'cloud',
  'email': 'email',
  'scissors': 'scissors',
  'hotsprings': 'hotsprings',
  'relaxed': 'relaxed',
  'white_frowning_face': 'white_frowning_face',
  'information_source': 'information_source',
  'crossed_swords': 'crossed_swords',
  'fleur_de_lis': 'fleur_de_lis',
  'gear': 'gear',
  'anchor': 'anchor',
  'shamrock': 'shamrock',
  'white_circle': 'white_circle',
  'black_circle': 'black_circle',
  'alembic': 'alembic',
  'scales': 'scales',
  'soccer': 'soccer',
  'watch': 'watch',
  'airplane': 'airplane',
  'keyboard': 'keyboard',
  'skull_and_crossbones': 'skull_and_crossbones',
  'radioactive': 'Radioactive Sign',
  'biohazard': 'Biohazard Sign',
  'comet': 'comet',
  'eight_pointed_black_star': 'eight_pointed_black_star',
  'eight_spoked_asterisk': 'eight_spoked_asterisk',
  'snowflake': 'snowflake',
  'hourglass': 'hourglass',
  'hammer_and_pick': 'hammer_and_pick',
  'coffin': 'Coffin',
  'bangbang': 'bangbang',
  'sparkle': 'sparkle',
  'sunny': 'sunny',
  'heavy_multiplication_x': 'heavy_multiplication_x',
  'writing_hand': 'writing_hand',
  'interrobang': 'interrobang',
  'black_medium_square': 'black_medium_square',
  'white_medium_square': 'white_medium_square'
};
Object.keys(emojMap).forEach(k => emojMap[k] = isWsl ? '' : emoji.emojify(`:${emojMap[k].replace(/[\-\ ]/g, '_')}: `).toLowerCase());
module.exports = { execPromise, execScripts, emojMap, colorizeMatch, colorizePos, colorizeArr, manipulateTextAtPosition, colorMap, colorizeSubstr };

var path = require('path');
var fs = require('fs');
var { execPromise, emojMap, colorizeMatch, colorizeArr, colorizePos, colorizeSubstr, manipulateTextAtPosition, colorMap } = require('../../helpers/_exec');

const dockerrm = async (name) => {
  try {
    await execPromise(`docker rm -f ${name}`);
  } catch (e) {

  }
};

const reformatLine = (line) => {
  var stringsRegex = /[\:\ \(\[][\'\"][^\'\"]*[\'\"]/g;
  var makeMatch = line.match(/^make(\[\d+\])?: \*\*\*.*$/);
  line = colorizeMatch(line, makeMatch, colorMap.make, 'bold');
  if (makeMatch) { line = emojMap.black_medium_square + line; }

  if (line.match(/^(\d+ warnings?)?( and )?(\d+ errors?)? generated\./)) {
    var warningMatch = line.match(/\d+ warnings?/);
    line = colorizeMatch(line, warningMatch, colorMap.warning, 'bold');
    var errorMatch = line.match(/\d+ errors?/);
    line = colorizeMatch(line, errorMatch, colorMap.error, 'bold');
    if (errorMatch) {
      line = emojMap.final_error + line;
      // console.log();
    } else if (warningMatch) {
      line = emojMap.final_warning + line;
    }
  }
  if (line.match(/^[\s\~\^]*$/)) { return line.bold[colorMap.cursor]; }

  var levels = Object.keys(colorMap);
  var foundLevel = false;
  var warnFlagRegex = /\ [\[][^\[\]\ ]*[\]]/g;
  levels.forEach(level => {
    var pos = line.indexOf(`: ${level}:`);
    if (pos !== -1) {
      if (level == 'warning') { line = colorizeMatch(line, warnFlagRegex.exec(line), 'grey'); }

      origLine = line;
      offset = 0;
      while ((match = stringsRegex.exec(origLine)) != null) {
        line = manipulateTextAtPosition(line, match.index + offset + 1, match[0].length - 1, (txt) => {
          offset += 19;
          return txt.yellow.bold;
        });
      }

      pos = line.indexOf(`: ${level}:`);
      line = manipulateTextAtPosition(line, pos + 3 + `${level}:`.length, line.length - pos - 3, (txt) =>
        txt[colorMap.message]);
      line = manipulateTextAtPosition(line, pos + 2, `${level}:`.length, (txt) =>
        txt[colorMap[level]]);
      if (emojMap[level]) {
        line = emojMap[level] + line;
        foundLevel = true;
      }
    }
  });
  if (foundLevel) {

    // line = colorizeMatch(line, errorMatch, colorMap.error, 'bold');

  } else {
    // code
    match = line.match(/^(#define?) (([a-z\_A-Z0-9]+)?)/);
    if (match) {
      line = colorizeSubstr(line, match[2], 'blue', 'bold');
      line = colorizeSubstr(line, match[1], 'blue');
    }
    origLine = line;
    offset = 0;
    while ((match = stringsRegex.exec(origLine)) != null) {
      line = manipulateTextAtPosition(line, match.index + offset + 1, match[0].length - 1, (txt) => {
        offset += 10;
        return txt.yellow;
      });
    }
  }

  var fileRegx = /(^|\W+)\/[^<>:;,?"*|]*\/[^<>:;,?"*|]*\:(?:[0-9]+):(?:[0-9]*)/g;
  var match;
  var origLine = line;
  var offset = 0;
  while ((match = fileRegx.exec(origLine)) != null) {
    line = manipulateTextAtPosition(line, match.index + offset, match[0].length, (txt) => {
      function replaceHighlight (lookfor, replaceWith) {
        var pos = txt.indexOf(lookfor);
        if (pos === -1) { return txt; }
        offset += 10;
        offset += replaceWith.length - lookfor.length;
        txt = manipulateTextAtPosition(txt, pos, lookfor.length, (txt2) => {
          return (replaceWith + txt2.substr(lookfor.length));
        });
        return txt.cyan.bold.underline;
      }
      txt = replaceHighlight('/contracts/', './contracts/eos/');
      txt = replaceHighlight('./../', './contracts/eos/');
      return txt;
    });
  }

  var scanningDeps = /^Scanning dependencies of target ([^<>:;,?"*\ \n|]*?)$/;
  origLine = line;
  match = scanningDeps.exec(line);
  if (match) {
    line = colorizeSubstr(line, match[1], 'cyan');
    line = emojMap.black_circle + line;
  }
  var mkregex = /^(\[\W*\d+%]?) (.*?) ([^\ <>:;,?"*|]*?)$/g;
  match = mkregex.exec(line);
  if (match) {
    line = colorizeSubstr(line, match[3], 'cyan');
    // line = colorizeSubstr(line, match[2], 'green', 'bold');
    line = colorizeSubstr(line, match[1], 'gray');
    line = emojMap.black_medium_square + line;
  }
  return line;
};

var processStdOut = (stdout) =>
  stdout.split('\n').map(line => reformatLine(line)).join('\n');
var which = require('which');

module.exports = async (args) => {
  if (!fs.existsSync(path.resolve('./contracts/eos/CMakeLists.txt'))) { return; }
  try {
    await execPromise(`rm CMakeCache.txt`, {
      cwd: path.resolve('./contracts/eos')
    });
  } catch (e) {

  }
  try {
    await dockerrm('zeus-make');
  } catch (e) {

  }

  const dockerImage = process.env.CDT_DOCKER || 'liquidapps/eosio-cdt:v1.6.1';
  try {
    var cmake = process.env.CMAKE;
    var make = process.env.MAKE;
    if (!cmake) {
      if (!process.env.CDT_DOCKER && which.sync('eosio-cc', { nothrow: true })) {
        cmake = which.sync('cmake3', { nothrow: true });
        if (!cmake) { cmake = which.sync('cmake', { nothrow: true }); }
        make = which.sync('make', { nothrow: true });
      }
    }

    let localTools = {};
    if (cmake && cmake.indexOf('docker') !== -1) {
      localTools = {
        CC: process.env.CC || which.sync('eosio-cc', { nothrow: true }),
        CXX: process.env.CXX || which.sync('eosio-cpp', { nothrow: true })
      };
    }
    let stdout = await execPromise(`${cmake || `docker run -e CXX=$CXX -e CC=$CC  -w /contracts -u $(id -u \$USER) --name zeus-make -i --rm -v ${path.resolve('./contracts/eos')}:/contracts ${dockerImage} cmake`} .`, {
      cwd: path.resolve('./contracts/eos'),
      printOutStream: process.stdout,
      printErrStream: process.stderr,
      printErrCB: processStdOut,
      printOutCB: processStdOut,
      env: {
        ...process.env,
        ...localTools
      }
    });
    stdout = await execPromise(`${make || `docker run -w /contracts -u $(id -u \$USER) --name zeus-make -i --rm -v ${path.resolve('./contracts/eos')}:/contracts ${dockerImage} make clean`}`, {
      cwd: path.resolve('./contracts/eos'),
      printOutStream: process.stdout,
      printErrStream: process.stderr,
      printErrCB: processStdOut,
      printOutCB: processStdOut
    });

    stdout = await execPromise(`${make || `docker run -w /contracts -u $(id -u\ $USER) --name zeus-make -i --rm -v ${path.resolve('./contracts/eos')}:/contracts ${dockerImage} make`}`, {
      cwd: path.resolve('./contracts/eos'),
      printOutStream: process.stdout,
      printErrStream: process.stderr,
      printErrCB: processStdOut,
      printOutCB: processStdOut

    });
  } catch (e) {
    throw emojMap.white_frowning_face + 'eos contracts compile failed';
  }
};

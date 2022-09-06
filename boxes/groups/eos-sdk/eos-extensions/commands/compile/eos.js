var path = require('path');
var fs = require('fs');
const { requireBox, getBoxesDir } = require('@liquidapps/box-utils');
const { execPromise, emojMap, colorizeMatch, colorizeSubstr, manipulateTextAtPosition, colorMap } = requireBox('seed-zeus-support/_exec');

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
      function replaceHighlight(lookfor, replaceWith) {
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
  console.log(`\n${emojMap.zap} EOSIO CONTRACT COMPILING\n`)
  if (!fs.existsSync(path.resolve('contracts/eos/CMakeLists.txt'))) { 
    console.log(`${emojMap.white_check_mark} no contracts/eos/CMakeLists.txt to compile eosio contracts, creating boilerplate`);
    return; 
  }
  try {
    await execPromise(`rm CMakeCache.txt`, {
      cwd: path.resolve('contracts/eos')
    });
  } catch (e) {

  }
  try {
    await dockerrm('zeus-make');
  } catch (e) {

  }

  const dockerImage = process.env.CDT_DOCKER || 'natpdev/leap-cdt';
  try {
    var cmake = process.env.CMAKE;
    var make = process.env.MAKE;
    if (!cmake) {
      if (!process.env.CDT_DOCKER && args.legacyCdt ? which.sync('eosio-cc', { nothrow: true }) : which.sync('cdt-cc', { nothrow: true }) ) {
        cmake = which.sync('cmake3', { nothrow: true });
        if (!cmake) { cmake = which.sync('cmake', { nothrow: true }); }
        make = which.sync('make', { nothrow: true });
      }
    }

    let localTools = {};
    if (cmake && cmake.indexOf('docker') !== -1) {
      localTools = {
        CC: process.env.CC || args.legacyCdt ? which.sync('eosio-cc', { nothrow: true }) : which.sync('cdt-cc', { nothrow: true }),
        CXX: process.env.CXX || args.legacyCdt ? which.sync('eosio-cpp', { nothrow: true }) : which.sync('cdt-cpp', { nothrow: true })
      };
    }
    if(!args.docker && !(args.legacyCdt ? which.sync('eosio-cpp', { nothrow: true }) : which.sync('cdt-cpp', { nothrow: true })) ) {
      throw new Error('install cdt-cpp or cdt-cpp')
    }
    let cmd = `${cmake || `docker run -e CXX=$CXX -e CC=$CC  -w /contracts -u $(id -u \$USER) --name zeus-make -i --rm -v ${path.resolve('./contracts/eos')}:/contracts ${dockerImage} cmake`} .`
    if(args.docker){ 
      cmd = `docker run -e CXX=$CXX -e CC=$CC  -w /contracts -u $(id -u \$USER) --name zeus-make -i --rm -v ${path.resolve('./contracts/eos')}:/contracts ${dockerImage} cmake .`
    }
    let stdout = await execPromise(cmd, {
      cwd: path.resolve('contracts/eos'),
      printOutStream: process.stdout,
      printErrStream: process.stderr,
      printErrCB: processStdOut,
      printOutCB: processStdOut,
      env: {
        ...process.env,
        ...localTools
      }
    });
    cmd = `${make || `docker run -w /contracts -u $(id -u \$USER) --name zeus-make -i --rm -v ${path.resolve('./contracts/eos')}:/contracts ${dockerImage} make clean`} ${args.contract ? args.contract : ''}`
    if(args.docker) {
      cmd = `${`docker run -w /contracts -u $(id -u \$USER) --name zeus-make -i --rm -v ${path.resolve('./contracts/eos')}:/contracts ${dockerImage} make clean`} ${args.contract ? args.contract : ''}`
    }
    stdout = await execPromise(cmd, {
      cwd: path.resolve('contracts/eos'),
      printOutStream: process.stdout,
      printErrStream: process.stderr,
      printErrCB: processStdOut,
      printOutCB: processStdOut
    });

    cmd = `${make || `docker run -w /contracts -u $(id -u\ $USER) --name zeus-make -i --rm -v ${path.resolve('./contracts/eos')}:/contracts ${dockerImage} make`} ${args.contract ? args.contract : ''}`
    if(args.docker) {
      cmd = `${`docker run -w /contracts -u $(id -u\ $USER) --name zeus-make -i --rm -v ${path.resolve('./contracts/eos')}:/contracts ${dockerImage} make`} ${args.contract ? args.contract : ''}`
    }
    stdout = await execPromise(cmd, {
      cwd: path.resolve('contracts/eos'),
      printOutStream: process.stdout,
      printErrStream: process.stderr,
      printErrCB: processStdOut,
      printOutCB: processStdOut
    });
    // copy compile contracts folder to root
    // await execPromise(`cp -rf contracts contracts`);
  } catch (e) {
    if (e.stderr && e.stderr.includes('No rule to make target')) throw new Error(`${emojMap.white_frowning_face} ${args.contract} was not found, please ensure the file exists`);
    throw emojMap.white_frowning_face + 'eos contracts compile failed, if you want to use docker add --docker=true, or for an older cdt --legacy-cdt';
  }
};
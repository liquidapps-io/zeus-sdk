var path = require('path');
var fs = require('fs');
const { requireBox } = require('@liquidapps/box-utils');
const { execPromise } = requireBox('seed-zeus-support/_exec');

const dockerrm = async (name) => {
  try {
    await execPromise(`docker rm -f ${name}`);
  } catch (e) {

  }
};
const reformat = (line) => {
  var parts = line.split(':', 5);
  var i = 0;
  var res = {
    file: '.' + parts[i++].substr('/contracts'.length),
    lineNum: parts[i++],
    colNum: parts[i++],
    level: parts[i++].trim(),
    msg: parts[i++]
    // check: parts[3].trim() == "warning" ? "" : parts[4].split('[')[1].split(']')[0].trim()
  };
  if (res.level == 'warning') {
    var check = parts[4].split('[')[1].split(']')[0].trim().gray;
    var msg = parts[4].split('[')[0].trim();
    res.msg = `${msg} ${check}`;
  }
  return res;
};
var colors = require('@colors/colors');

module.exports = async (args) => {
  await dockerrm('zeus-make');
  const dockerImage = process.env.CDT_DOCKER_LINT || 'natpdev/leap-cdt-dfuseeos' || 'tmuskal/eosio.cdt';
  let stdout = await execPromise(`docker run -w /contracts -u $(id -u \$USER) -v $PWD:/contracts --rm -i ${dockerImage} clang-format -style=LLVM -i contracts/eos/*/*.hpp contracts/eos/*/*.cpp`, {});
  try {
    var checksArr = [
      '*',
      '-misc-unused-parameters',
      '-modernize-use-using',
      '-google-build-using-namespace',
      '-cppcoreguidelines-pro-bounds-pointer-arithmetic',
      '-clang-diagnostic-error,-hicpp-signed-bitwise',
      '-llvm-header-guard,-hicpp-deprecated-headers',
      '-modernize-use-noexcept,-hicpp-use-noexcept',
      '-performance-unnecessary-value-param',
      '-readability-implicit-bool-conversion',
      '-modernize-deprecated-headers'
    ];
    var checks = checksArr.join(',');
    stdout = await execPromise(`docker run -w /contracts -u $(id -u \$USER) -v $PWD:/contracts --rm -i ${dockerImage} clang-tidy -checks=${checks} contracts/eos/*/*.cpp -p /contracts/contracts/eos  -- -std=c++17 -c -mllvm -fno-cfl-aa -O3`);
    var lines = stdout.split('\n');
    var i = 0;
    var toprint = true;
    var printErrors = false;
    var colorMap = {
      'warning': 'red',
      'note': 'magenta'
    };
    var colorize = (obj) => {
      var thecolor = colorMap[obj.level];
      if (thecolor) {
        obj.level += ':';
        obj.level = obj.level.bold.underline[thecolor];
      }
    };
    while (i < lines.length) {
      var line = lines[i];
      var warning = line.indexOf(': warning:') !== -1;
      var error = line.indexOf(': error:') !== -1;
      var note = line.indexOf(': note:') !== -1;

      if (warning || note || error) {
        var obj = reformat(line);
        colorize(obj);
        line = `${obj.level} ${`${obj.file}:${obj.lineNum}:${obj.colNum}`.cyan} ${obj.msg}`;
      } else {
        var cursorRgx = /^\s*[\^][\~]*$/;
        if (line.match(cursorRgx)) {
          line = line.bold.blue;
        }
      }
      if (warning) { toprint = true; } else if (error) { toprint = printErrors; }

      if (toprint) { console.log(line); }
      i++;
    }
  } catch (e) {
    stdout = e.stdout;
  }
};

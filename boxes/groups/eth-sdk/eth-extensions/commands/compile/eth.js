const solc = require('solc');
const glob = require('glob');
const fs = require('fs');
const path = require('path');

const getSolFiles = (dirname) => glob.sync(dirname + '/**/*.sol', {})

function findImports(dependency) {
  try {
    const contents = fs.readFileSync(path.resolve('zeus_boxes/contracts/eth', dependency), 'utf-8');
    return { contents };
  } catch (e) {
    console.log(e);
    return { error: 'File not found: ' + dependency };
  }
}

function writeOutputs(compiled, buildPath) {
  if (!fs.existsSync(buildPath)) {
    fs.mkdirSync(buildPath);
  }
  for (let contractFileName in compiled.contracts) {
    if (contractFileName.includes('/')) {
      continue;
    }
    const contractName = contractFileName.replace('.sol', '');
    const bin = '0x' + compiled.contracts[contractFileName][contractName].evm.bytecode.object;
    const abiObj = compiled.contracts[contractFileName][contractName].abi;
    const abi = JSON.stringify(abiObj);
    fs.writeFileSync(path.resolve(buildPath, contractName + '.bin'), bin);
    fs.writeFileSync(path.resolve(buildPath, contractName + '.abi'), abi);
  }
}

module.exports = async (args) => {
  if (!fs.existsSync(path.resolve('zeus_boxes/contracts/eth'))) {
    console.log('no eth contracts');
    return;
  }

  const solFiles = getSolFiles(path.resolve('zeus_boxes/contracts/eth'));
  const fileNames = solFiles.map(solFile => solFile.split('/').pop());
  const sources = {};
  fileNames.forEach((name, i) => {
    sources[name] = { content: fs.readFileSync(solFiles[i], 'utf-8') }
  });

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      }
    }
  };
  const compiledSolContracts = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  if (compiledSolContracts.errors) {
    throw new Error(JSON.stringify(compiledSolContracts.errors, null, 4));
  }
  writeOutputs(compiledSolContracts, path.resolve('zeus_boxes/contracts/eth', 'build'));
}

const solc = require('solc');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const { requireBox } = require('@liquidapps/box-utils');
const { emojMap } = requireBox('seed-zeus-support/_exec');

const getSolFiles = (dirname) => glob.sync(dirname + '/**/*.sol', {})

function findImports(dependency) {
  try {
    const contents = fs.readFileSync(path.resolve('contracts/eth', dependency), 'utf-8');
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
    console.log(`${emojMap.zap} building eth contract bin in contracts/eth/build/${contractName}.bin`)
    console.log(`${emojMap.zap} building eth contract abi in contracts/eth/build/${contractName}.abi`)
  }
}

module.exports = async (args) => {
  console.log(`\n${emojMap.zap} ETH CONTRACT COMPILING\n`)
  if (!fs.existsSync(path.resolve('contracts/eth'))) {
    console.log(`${emojMap.white_check_mark} no eth contracts to compile in /contracts/eth`);
    return;
  }

  const solFiles = getSolFiles(path.resolve('contracts/eth'));
  const fileNames = solFiles.map(solFile => solFile.split('/').pop());
  const sources = {};
  fileNames.forEach((name, i) => {
    if(args.contract && `${args.contract}.sol` === name) {
      sources[name] = { content: fs.readFileSync(solFiles[i], 'utf-8') }
    } else if(!args.contract) {
      sources[name] = { content: fs.readFileSync(solFiles[i], 'utf-8') }
    }
  });
  if(!Object.values(sources).length) {
    console.log(`${emojMap.error} no eth contract found /contracts/eth/${args.contract}.sol`);
    return;
  }

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
  writeOutputs(compiledSolContracts, path.resolve('contracts/eth', 'build'));
  console.log(`${emojMap.zap} success!`)
}

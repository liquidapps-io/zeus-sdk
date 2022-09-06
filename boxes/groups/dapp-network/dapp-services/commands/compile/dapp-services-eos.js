var path = require('path');
var fs = require('fs');
const { requireBox, getBoxName } = require('@liquidapps/box-utils');
const { emojMap } = requireBox('seed-zeus-support/_exec');
const { loadModels } = requireBox('seed-models/tools/models');
const { dappServicesContract, getContractAccountFor } = requireBox('dapp-services/tools/eos/dapp-services');

const generateCommandCodeText = (serviceName, commandName, commandModel, serviceContract) => {
  var fnArgs = (args) => Object.keys(args).map(name => `((${args[name]})(${name}))`).join('');
  var fnPassArgs = (args) => Object.keys(args).join(', ');
  var upperName = serviceName.toUpperCase();

  return `SVC_ACTION(${commandName}, ${commandModel.blocking}, ${fnArgs(commandModel.request)},     \\
         ${fnArgs(commandModel.signal)}, \\
         ${fnArgs(commandModel.callback)},TONAME(SVC_CONTRACT_NAME_${upperName}) ) \\
{ \\
    _${serviceName}_${commandName}(${fnPassArgs({ ...commandModel.callback, 'current_provider': 'name' })}); \\
    SEND_SVC_SIGNAL(${commandName}, current_provider, package, ${fnPassArgs(commandModel.signal)})                         \\
}; `;
};

const generateCommandHelperCodeText = (serviceName, commandName, commandModel) => {
  var rargs = commandModel.request;
  var argsKeys = Object.keys(rargs);

  var fnArgs = argsKeys.join(', ');

  rargs = { ...rargs, 'current_provider': 'name' };
  var fnArgsWithType = argsKeys.map(name => `${rargs[name]} ${name}`).join(', ');

  return `static void svc_${serviceName}_${commandName}(${fnArgsWithType}) { \\
    SEND_SVC_REQUEST(${commandName}, ${fnArgs}) \\
};`;
};


const generateServiceFileStub = (serviceModel) => {
  var name = serviceModel.name;
  return `
const { requireBox } = require('@liquidapps/box-utils');
var { nodeAutoFactory } = requireBox('dapp-services/services/dapp-services-node/generic-dapp-service-node');
nodeAutoFactory('${name}');`
}
const generateImplStubHppFile = (serviceModel) => {
  var name = serviceModel.name;
  var upperName = name.toUpperCase();
  var commandNames = Object.keys(serviceModel.commands);
  var macro = `SVC_RESP_${upperName}`;
  var skipHelper = false;
  var commandsImpl = commandNames.map(commandName => {
    var commandModel = serviceModel.commands[commandName];
    var cargs = commandModel.callback;
    var argsKeys = Object.keys(cargs);


    cargs = { ...cargs, 'current_provider': 'name' };
    var fnArgsWithType = argsKeys.map(name => cargs[name] + " " + name).join(', ');
    // check if exists _${name}_${commandName}_dspcmd.hpp
    return `${macro}(${commandName})(${fnArgsWithType}, name current_provider){
#if __has_include("${name}/cmds/${commandName}.hpp")
#include "${name}/cmds/${commandName}.hpp"
#endif
}`
  });
  return `#pragma once
#include <eosio/eosio.hpp>

#if __has_include("${name}/headers.hpp")
#include "${name}/headers.hpp"
#endif

${commandsImpl.join('\n')}`

}

const generateServiceHppFile = (serviceModel, sidechain) => {
  var name = serviceModel.name;
  var upperName = name.toUpperCase();
  const serviceContract = getContractAccountFor(serviceModel);
  var commandNames = Object.keys(serviceModel.commands);
  var commandsCodeText = commandNames.map(
    commandName => generateCommandCodeText(name, commandName,
      serviceModel.commands[commandName], serviceContract)).join('\\\n');
  var commandsHelpersCodeText = commandNames.map(
    commandName => generateCommandHelperCodeText(name, commandName,
      serviceModel.commands[commandName])).join('\\\n');
  let mapEntries = (loadModels('liquidx-mappings')).filter(m => m.mainnet_account === serviceContract && (m.sidechain_name === sidechain || !sidechain));
  let liquidxDefines;
  let selectedSideChain;
  if (mapEntries.length > 0) {
    liquidxDefines = mapEntries.map(a => `#define SVC_CONTRACT_NAME_${upperName}_${a.sidechain_name.toUpperCase()} ${a.chain_account}`).join('\n');
    selectedSideChain = mapEntries.map(a => a.sidechain_name.toUpperCase()).find(a => a);
  } else {
    mapEntries = loadModels('eosio-chains');
    liquidxDefines = mapEntries.map(a => `#define SVC_CONTRACT_NAME_${upperName}_${a.name.toUpperCase()} ${serviceContract}`).join('\n');
    selectedSideChain = mapEntries.map(a => a.name.toUpperCase()).find(a => a);
  }

  return `#pragma once
#include "../dappservices/dappservices.hpp"\n
#define SVC_RESP_${upperName}(name) \\
    SVC_RESP_X(${name},name)

${liquidxDefines}

#ifdef LIQUIDX\n
#define SVC_CONTRACT_NAME_${upperName} SVC_CONTRACT_NAME_${upperName}_${selectedSideChain} \n
#else
#define SVC_CONTRACT_NAME_${upperName} ${serviceContract} \n
#endif

#include "../dappservices/_${name}_impl.hpp"\n


#define ${upperName}_DAPPSERVICE_BASE_ACTIONS ${commandsCodeText.length ? '\\' : ''}
${commandsCodeText} ${commandsHelpersCodeText.length ? '\\' : ''}
${commandsHelpersCodeText}


#ifdef ${upperName}_DAPPSERVICE_ACTIONS_MORE
#define ${upperName}_DAPPSERVICE_ACTIONS \\
  ${upperName}_DAPPSERVICE_BASE_ACTIONS \\
  ${upperName}_DAPPSERVICE_ACTIONS_MORE() \n

#else
#define ${upperName}_DAPPSERVICE_ACTIONS \\
  ${upperName}_DAPPSERVICE_BASE_ACTIONS
#endif


#ifndef ${upperName}_SVC_COMMANDS
#define ${upperName}_SVC_COMMANDS() ${commandNames.map(commandName => `(x${commandName})`).join('')}\n

#ifndef ${upperName}_DAPPSERVICE_SKIP_HELPER
struct ${name}_svc_helper{
    ${upperName}_DAPPSERVICE_ACTIONS
};
#endif

#endif`;
};

const compileDappService = async (serviceModel, sidechain) => {
  var name = serviceModel.name;
  const box = `${name}-dapp-service`;
  try {
    if (serviceModel.generateStubs) {
      console.log(emojMap.alembic + `Generating ./contracts/eos/dappservices/_${name}_impl.hpp ${name.green}`);
      fs.writeFileSync(path.resolve(`./contracts/eos/dappservices/_${name}_impl.hpp`),
        await generateImplStubHppFile(serviceModel));

      if (!fs.existsSync(path.resolve(`./zeus_boxes/${box}/services/${name}-dapp-service-node`))) { 
        console.log(emojMap.alembic + `Making directory ./zeus_boxes/${box}/services/${name}-dapp-service-node ${name.green}`);
        fs.mkdirSync(path.resolve(`./zeus_boxes/${box}/services/${name}-dapp-service-node`)) 
      }
      console.log(emojMap.alembic + `Generating ./zeus_boxes/${box}/services/${name}-dapp-service-node/index.js ${name.green}`);
      fs.writeFileSync(path.resolve(`./zeus_boxes/${box}/services/${name}-dapp-service-node/index.js`),
        await generateServiceFileStub(serviceModel));
      }

      console.log(emojMap.alembic + `Generating ./contracts/eos/dappservices/${name}.hpp ${name.green}`);
      fs.writeFileSync(path.resolve(`./contracts/eos/dappservices/${name}.hpp`),
        await generateServiceHppFile(serviceModel, sidechain));
  }
  catch (e) {
    throw new Error(emojMap.white_frowning_face + `CodeGen Service failed: ${name.red} Service: ${e}`);
  }
};
const generateConfig = async (sidechain) => {
  const mapEntries = (loadModels('liquidx-mappings')).filter(m => m.mainnet_account === 'dappservices' && (m.sidechain_name === sidechain || !sidechain));
  const liquidxDefines = mapEntries.map(a => `#define DAPPSERVICEX_CONTRACT_${a.sidechain_name.toUpperCase()} "${a.chain_account}"_n`).join('\n');
  const selectedSideChain = mapEntries.map(a => a.sidechain_name.toUpperCase()).find(a => a);
  fs.writeFileSync(path.resolve(`./contracts/eos/dappservices/dappservices.config.hpp`),
    `\n

${liquidxDefines}

#define DAPPSERVICESA_CONTRACT "${dappServicesContract}"_n\n
#ifdef LIQUIDX\n
#define DAPPSERVICES_CONTRACT DAPPSERVICEX_CONTRACT_${selectedSideChain}\n
#else\n
#define DAPPSERVICES_CONTRACT DAPPSERVICESA_CONTRACT\n
#endif`);
}
module.exports = async (args) => {
  let sidechain = args.sidechain;
  await Promise.all((await loadModels('dapp-services')).map(m => compileDappService(m, sidechain)));
  await generateConfig(sidechain);
};

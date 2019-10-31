var path = require('path');
var fs = require('fs');
const { loadModels } = require('../../tools/models');
const { emojMap } = require('../../helpers/_exec');
const { dappServicesContract, getContractAccountFor } = require('../../tools/eos/dapp-services');

const CMAKELISTS_FILE = `
get_filename_component(PROJ_NAME "\${CMAKE_CURRENT_SOURCE_DIR}" NAME )
set(EOSIO_WASM_OLD_BEHAVIOR "Off")
cmake_minimum_required(VERSION 3.5)
project(\${PROJ_NAME} VERSION 1.0.0)
if(EOSIO_CDT_ROOT STREQUAL "" OR NOT EOSIO_CDT_ROOT)
   find_package(eosio.cdt)
endif()
add_executable( \${PROJ_NAME} \${ARGN} \${PROJ_NAME} \${PROJ_NAME}.cpp )
include_directories( \${PROJ_NAME} PUBLIC ./ )
`;

const generateServiceCppFile = (serviceModel) => {
  var name = serviceModel.name;
  var commandNames = Object.keys(serviceModel.commands);
  var M = (macro) => commandNames.map(commandName => `${macro}(${commandName})`).join('\n');
  var upperName = name.toUpperCase();

  return `#define SVC_NAME ${name}
#include "../dappservices/${name}.hpp"
CONTRACT ${name}service : public eosio::contract {
  using contract::contract;

private:
public:

  DAPPSERVICE_PROVIDER_ACTIONS
  ${upperName}_DAPPSERVICE_ACTIONS
  ${M('STANDARD_USAGE_MODEL')}

#ifdef ${upperName}_DAPPSERVICE_SERVICE_MORE
  ${upperName}_DAPPSERVICE_SERVICE_MORE
#endif

  struct model_t {
    ${M('HANDLE_MODEL_SIGNAL_FIELD')}
  };
  TABLE providermdl {
    model_t model;
    name package_id;
    uint64_t primary_key() const { return package_id.value; }
  };

  typedef eosio::multi_index<"providermdl"_n, providermdl> providermodels_t;

 [[eosio::action]] void xsignal(name service, name action,
                 name provider, name package, std::vector<char> signalRawData) {
    if (current_receiver() != service || _self != service)
      return;
    require_auth(get_first_receiver());
    ${M('HANDLECASE_SIGNAL_TYPE')}
  }

  DAPPSERVICE_PROVIDER_BASIC_ACTIONS
};

EOSIO_DISPATCH_SVC_PROVIDER(${name}service)\n`;
};

const generateServiceAbiFile = (serviceModel) => {
  const abi = {
    '____comment': 'This file was generated with dapp-services-eos. DO NOT EDIT ' + new Date().toUTCString(),
    'version': 'eosio::abi/1.0',
    'structs': [{
        'name': 'model_t',
        'base': '',
        'fields': []
      },
      {
        'name': 'providermdl',
        'base': '',
        'fields': [{
            'name': 'model',
            'type': 'model_t'
          },
          {
            'name': 'package_id',
            'type': 'name'
          }
        ]
      },
      {
        'name': 'xsignal',
        'base': '',
        'fields': [{
            'name': 'service',
            'type': 'name'
          },
          {
            'name': 'action',
            'type': 'name'
          },
          {
            'name': 'provider',
            'type': 'name'
          },
          {
            'name': 'package',
            'type': 'name'
          },
          {
            'name': 'signalRawData',
            'type': 'bytes'
          }
        ]
      },
      {
        'name': 'regprovider',
        'base': '',
        'fields': [{
            'name': 'provider',
            'type': 'name'
          },
          {
            'name': 'model',
            'type': 'providermdl'
          }
        ]
      }
    ],
    'types': [],
    'actions': [{
        'name': 'xsignal',
        'type': 'xsignal',
        'ricardian_contract': ''
      },
      {
        'name': 'regprovider',
        'type': 'regprovider',
        'ricardian_contract': ''
      }
    ],
    'tables': [{
      'name': 'providermdl',
      'type': 'providermdl',
      'index_type': 'i64',
      'key_names': [],
      'key_types': []
    }],
    'ricardian_clauses': [],
    'abi_extensions': []
  };
  const structs = abi.structs;
  const model_fields = structs.find(a => a.name == 'model_t').fields;

  function addCmd(cmdName) {
    structs.push({
      'name': `${cmdName}_model_t`,
      'base': '',
      'fields': [{
        'name': 'cost_per_action',
        'type': 'uint64'
      }]
    });
    model_fields.push({
      'name': `${cmdName}_model_field`,
      'type': `${cmdName}_model_t`
    });
  }
  Object.keys(serviceModel.commands).forEach(addCmd);
  return JSON.stringify(abi, null, 2);
};

const generateCommandCodeText = (serviceName, commandName, commandModel, serviceContract) => {
  var fnArgs = (args) => Object.keys(args).map(name => `((${args[name]})(${name}))`).join('');
  var fnPassArgs = (args) => Object.keys(args).join(', ');

  return `SVC_ACTION(${commandName}, ${commandModel.blocking}, ${fnArgs(commandModel.request)},     \
         ${fnArgs(commandModel.signal)}, \
         ${fnArgs(commandModel.callback)},"${serviceContract}"_n) { \
    _${serviceName}_${commandName}(${fnPassArgs({ ...commandModel.callback, 'current_provider': 'name' })}); \
    SEND_SVC_SIGNAL(${commandName}, current_provider, package, ${fnPassArgs(commandModel.signal)})                         \
};`;
};

const generateCommandHelperCodeText = (serviceName, commandName, commandModel) => {
  var rargs = commandModel.request;
  var argsKeys = Object.keys(rargs);

  var fnArgs = argsKeys.join(', ');

  rargs = { ...rargs, 'current_provider': 'name' };
  var fnArgsWithType = argsKeys.map(name => `${rargs[name]} ${name}`).join(', ');

  return `static void svc_${serviceName}_${commandName}(${fnArgsWithType}) { \
    SEND_SVC_REQUEST(${commandName}, ${fnArgs}) \
};`;
};


const generateServiceFileStub = (serviceModel) => {
  var name = serviceModel.name;
  return `
var { nodeAutoFactory } = require('../dapp-services-node/generic-dapp-service-node');
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

const generateServiceHppFile = (serviceModel) => {
  var name = serviceModel.name;
  var upperName = name.toUpperCase();
  var commandNames = Object.keys(serviceModel.commands);
  var commandsCodeText = commandNames.map(
    commandName => generateCommandCodeText(name, commandName,
      serviceModel.commands[commandName], getContractAccountFor(serviceModel))).join('\\\n');
  var commandsHelpersCodeText = commandNames.map(
    commandName => generateCommandHelperCodeText(name, commandName,
      serviceModel.commands[commandName], getContractAccountFor(serviceModel))).join('\\\n');

  return `#pragma once
#include "../dappservices/dappservices.hpp"\n
#define SVC_RESP_${upperName}(name) \\
    SVC_RESP_X(${name},name)

#define SVC_CONTRACT_NAME_${upperName} ${getContractAccountFor(serviceModel)} \n

#include "../dappservices/_${name}_impl.hpp"\n


#define ${upperName}_DAPPSERVICE_BASE_ACTIONS \\
  ${commandsCodeText} \\
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

const compileDappService = async(serviceModel) => {
  var name = serviceModel.name;
  var targetFolder = path.resolve(`./contracts/eos/${name}service`);
  if (!fs.existsSync(targetFolder)) { fs.mkdirSync(targetFolder); }
  try {
    // generate files
    fs.writeFileSync(path.resolve(`./contracts/eos/${name}service/${name}service.cpp`),
      await generateServiceCppFile(serviceModel));
    fs.writeFileSync(path.resolve(`./contracts/eos/${name}service/${name}service.abi`),
      await generateServiceAbiFile(serviceModel));
    fs.writeFileSync(path.resolve(`./contracts/eos/${name}service/CMakeLists.txt`),
      CMAKELISTS_FILE);
    if (serviceModel.generateStubs) {
      fs.writeFileSync(path.resolve(`./contracts/eos/dappservices/_${name}_impl.hpp`),
        await generateImplStubHppFile(serviceModel));
      if (!fs.existsSync(path.resolve(`./services/${name}-dapp-service-node`))) { fs.mkdirSync(path.resolve(`./services/${name}-dapp-service-node`)) }

      fs.writeFileSync(path.resolve(`./services/${name}-dapp-service-node/index.js`),
        await generateServiceFileStub(serviceModel));

    }
    fs.writeFileSync(path.resolve(`./contracts/eos/dappservices/${name}.hpp`),
      await generateServiceHppFile(serviceModel));
    console.log(emojMap.alembic + `CodeGen Service ${name.green}`);
  }
  catch (e) {
    throw new Error(emojMap.white_frowning_face + `CodeGen Service: ${name.green} Service: ${e}`);
  }
};
const generateConfig = async() => {
  fs.writeFileSync(path.resolve(`./contracts/eos/dappservices/dappservices.config.hpp`),
    `#define DAPPSERVICES_CONTRACT "${dappServicesContract}"_n\n`);
};
module.exports = async(args) => {
  await Promise.all((await loadModels('dapp-services')).map(compileDappService));
  await generateConfig();
};

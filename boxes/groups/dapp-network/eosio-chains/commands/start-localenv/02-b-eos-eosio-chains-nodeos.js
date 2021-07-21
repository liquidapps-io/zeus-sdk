const { requireBox } = require('@liquidapps/box-utils');
const { execPromise } = requireBox('seed-zeus-support/_exec');
var dappservices = requireBox('dapp-services/tools/eos/dapp-services');
var path = require('path');
var fs = require('fs');
const kill = require('kill-port');
var which = require('which');
const os = require('os');
const { loadModels } = requireBox('seed-models/tools/models');

var generateNodeos = async (model, args) => {

  var name = model.name;
  var nodeosPort = model.nodeos_port;
  var nodeosP2PPort = model.nodeos_p2p_port;
  var stateHistoryPort = model.nodeos_state_history_port;
  if(args.kill) {
    await killIfRunning(nodeosPort);
    await dockerrm(`zeus-eosio-${name}`);
    return;
  }

  // add logging.json if doesnt exist
  await addLoggingConfig(name);
  await addGenesisConfig(name);
  var nodeosArgs = [
    '-e',
    '-p eosio',
    '--plugin eosio::producer_plugin',
    '--plugin eosio::producer_api_plugin',
    '--disable-replay-opts',
    '--plugin eosio::history_plugin',
    '--plugin eosio::chain_api_plugin',
    '--plugin eosio::chain_plugin',
    '--plugin eosio::history_api_plugin',
    '--plugin eosio::http_plugin',
    '--delete-all-blocks',
    `--p2p-listen-endpoint 127.0.0.1:${nodeosP2PPort}`,
    '--filter-on=*',
    `-d ~/.zeus/nodeos-${name}/data`,
    `--config-dir ~/.zeus/nodeos-${name}/config`,
    `--http-server-address=0.0.0.0:${nodeosPort}`,
    '--access-control-allow-origin=*',
    '--contracts-console',
    '--max-transaction-time=150000',
    '--http-validate-host=false',
    '--http-max-response-time-ms=9999999',
    '--verbose-http-errors',
    '--trace-history-debug-mode',
    '--delete-state-history',
    '--max-irreversible-block-age=-1',
    `--genesis-json=${os.homedir()}/.zeus/nodeos-${name}/config/genesis.json`,
    '--chain-threads=2',
    '--abi-serializer-max-time-ms=100',
    '--max-block-cpu-usage-threshold-us=50000'
  ];
  var ports = [
    `-p ${nodeosPort}:${nodeosPort}`,
    `-p ${nodeosP2PPort}:${nodeosP2PPort}`
  ];
  // check OS name, if Mac, does not support --eos-vm-oc-enable
  const isMac = await execPromise(`uname`);
  if(!isMac.includes(`Darwin`)){
    nodeosArgs = [...nodeosArgs,
      '--eos-vm-oc-enable',
      '--eos-vm-oc-compile-threads=2'
    ];
  }
  if (dappservices) {
    // console.log('Initing dappservices plugins');
    var backend = process.env.DEMUX_BACKEND || 'state_history_plugin';
    switch (backend) {
      case 'state_history_plugin':
        nodeosArgs = [...nodeosArgs,
          '--trace-history',
          '--plugin eosio::state_history_plugin',
        `--state-history-endpoint 0.0.0.0:${stateHistoryPort}`
        ];
        ports = [...ports,
        `-p ${stateHistoryPort}:${stateHistoryPort}`
        ];
        break;
    }
  }

  await dockerrm(`zeus-eosio-${name}`);
  await killIfRunning(nodeosPort);
  if (!process.env.DOCKER_NODEOS && which.sync('nodeos', { nothrow: true })) {
    try {
      const res = await execPromise(`nodeos --version`, {});
      if (res < "v2.0.0") throw new Error();
    }
    catch (e) {
      throw new Error('Nodeos versions < 2.0.0 not supported. See https://github.com/EOSIO/eos/releases');
    }
    await execPromise(`nohup nodeos ${nodeosArgs.join(' ')} >> ./logs/nodeos-${name}.log 2>&1 &`, { unref: true });
  }
  else {
    var nodeos = process.env.DOCKER_NODEOS || 'liquidapps/eosio-plugins:v1.6.1';
    await execPromise(`docker run --name zeus-eosio-${name} --rm -d ${ports.join(' ')} ${nodeos} /bin/bash -c "nodeos ${nodeosArgs.join(' ')}"`);
  }


}
module.exports = async (args) => {
  if (args.creator !== 'eosio') { 
    return;
  } // only local
  if(args.singleChain) { return; } // don't run on command
  // load models
  var sidechains = await loadModels('eosio-chains');
  for (var i = 0; i < sidechains.length; i++) {
    if (sidechains[i].local === false) return;
    var sidechain = sidechains[i];
    await generateNodeos(sidechain, args);
  }
};

const dockerrm = async (name) => {
  try {
    await execPromise(`docker rm -f ${name}`);
  }
  catch (e) {

  }
};

const killIfRunning = async (port) => {
  try {
    await kill(port);
  }
  catch (e) { }
};
function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return number;
}
Date.prototype.toISOString2 = function() {
      return this.getUTCFullYear() +
        '-' + pad(this.getUTCMonth() + 1) +
        '-' + pad(this.getUTCDate()) +
        'T' + pad(this.getUTCHours()) +
        ':' + pad(this.getUTCMinutes()) +
        ':' + pad(this.getUTCSeconds()) +
        '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5)
};
const addLoggingConfig = async (name) => {
  const configPath = `${os.homedir()}/.zeus/nodeos-${name}/config/`;
  const loggingJsonPath = `${configPath}/logging.json`;
  if (!fs.existsSync(configPath))
    await execPromise(`mkdir -p ${configPath}`);
  if (!fs.existsSync(loggingJsonPath))
    fs.writeFileSync(loggingJsonPath, JSON.stringify(loggingJson));
};
const addGenesisConfig = async (name) => {
  const configPath = `${os.homedir()}/.zeus/nodeos-${name}/config/`;
  const genJsonPath = `${configPath}/genesis.json`;
  let chainId = new Buffer.from(name).toString('hex');
  while (chainId.length < "0000000000000000000000000000000000000000000000000000000000000000".length) {
    chainId = "0" +chainId;
  }
  if (!fs.existsSync(configPath))
    await execPromise(`mkdir -p ${configPath}`);
  if (!fs.existsSync(genJsonPath))
  fs.writeFileSync(genJsonPath, JSON.stringify({      
    "initial_timestamp": new Date().toISOString2(),
    "initial_key": "EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV",
    "initial_configuration": {
      "max_block_net_usage": 1048576,
      "target_block_net_usage_pct": 1000,
      "max_transaction_net_usage": 524288,
      "base_per_transaction_net_usage": 12,
      "net_usage_leeway": 500,
      "context_free_discount_net_usage_num": 20,
      "context_free_discount_net_usage_den": 100,
      "max_block_cpu_usage": 1000000,
      "target_block_cpu_usage_pct": 500,
      "max_transaction_cpu_usage": 500000,
      "min_transaction_cpu_usage": 100,
      "max_transaction_lifetime": 3600,
      "deferred_trx_expiration_window": 600,
      "max_transaction_delay": 3888000,
      "max_inline_action_size": 4096,
      "max_inline_action_depth": 4,
      "max_authority_depth": 6
    },
    "initial_chain_id": chainId
  }
));
};

const loggingJson = {
  "includes": [],
  "appenders": [{
    "name": "consoleout",
    "type": "console",
    "args": {
      "stream": "std_out",
      "level_colors": [{
        "level": "debug",
        "color": "green"
      },
      {
        "level": "warn",
        "color": "brown"
      },
      {
        "level": "error",
        "color": "red"
      }
      ]
    },
    "enabled": true
  }],
  "loggers": [{
    "name": "default",
    "level": "info",
    "enabled": true,
    "additivity": false,
    "appenders": [
      "consoleout",
      "net"
    ]
  },
  {
    "name": "net_plugin_impl",
    "level": "info",
    "enabled": true,
    "additivity": false,
    "appenders": [
      "net"
    ]
  }
  ]
}

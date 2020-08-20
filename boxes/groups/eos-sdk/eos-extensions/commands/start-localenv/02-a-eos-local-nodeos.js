const { requireBox, getBoxesDir } = require('@liquidapps/box-utils');
const { execPromise } = requireBox('seed-zeus-support/_exec');
var sleep = require('sleep-promise');
var dappservices;
var path = require('path');
var fs = require('fs');
const kill = require('kill-port');
var which = require('which');
const os = require('os');

if (fs.existsSync(`${getBoxesDir()}dapp-services/tools/eos/dapp-services.js`)) { dappservices = requireBox('dapp-services/tools/eos/dapp-services'); }

module.exports = async (args) => {
  if (args.creator !== 'eosio') { return; } // only local

  // add logging.json if doesnt exist
  await addLoggingConfig();

  var nodeosArgs = [
    '-e',
    '-p eosio',
    '--plugin eosio::producer_plugin',
    '--disable-replay-opts',
    '--plugin eosio::history_plugin',
    '--plugin eosio::chain_api_plugin',
    '--plugin eosio::history_api_plugin',
    '--plugin eosio::http_plugin',
    '--delete-all-blocks',
    '--filter-on=*',
    '-d ~/.zeus/nodeos/data',
    '--config-dir ~/.zeus/nodeos/config',
    '--http-server-address=0.0.0.0:8888',
    '--access-control-allow-origin=*',
    '--contracts-console',
    '--max-transaction-time=150000',
    '--http-validate-host=false',
    '--http-max-response-time-ms=9999999',
    '--verbose-http-errors',
    '--trace-history-debug-mode',
    '--delete-state-history',
    '--wasm-runtime=eos-vm',
    '--chain-threads=4'
  ];
  var ports = [
    '-p 8888:8888',
    '-p 9876:9876'
  ];
  // check OS name, if Mac, does not support --eos-vm-oc-enable
  const isMac = await execPromise(`uname`);
  if(!isMac.includes(`Darwin`)){
    nodeosArgs = [...nodeosArgs,
      '--eos-vm-oc-enable',
      '--eos-vm-oc-compile-threads=4'
    ];
  }
  if (dappservices) {
    console.log('Initing dappservices plugins');
    var backend = process.env.DEMUX_BACKEND || 'state_history_plugin';
    var { dappServicesContract } = dappservices;
    switch (backend) {
      case 'state_history_plugin':
        nodeosArgs = [...nodeosArgs,
          '--trace-history',
          '--plugin eosio::state_history_plugin',
          '--state-history-endpoint 0.0.0.0:8887'
        ];
        ports = [...ports,
          '-p 8887:8887'
        ];
        break;
    }
  }

  await dockerrm('zeus-eosio');
  await killIfRunning();
  if (!process.env.DOCKER_NODEOS && which.sync('nodeos', { nothrow: true })) {
    try {
      const res = await execPromise(`nodeos --version`, {});
      if (res < "v2.0.0") throw new Error();
    }
    catch (e) {
      throw new Error('Nodeos versions < 2.0.0 not supported. See https://github.com/EOSIO/eos/releases');
    }
    try {
      await execPromise(`mkdir -p logs`);
    }
    catch (e) {

    }
    await execPromise(`nohup nodeos ${nodeosArgs.join(' ')} >> ./logs/nodeos.log 2>&1 &`, { unref: true });
  }
  else {
    var nodeos = process.env.DOCKER_NODEOS || 'liquidapps/eosio-plugins:v1.6.1';
    await execPromise(`docker run --name zeus-eosio --rm -d ${ports.join(' ')} ${nodeos} /bin/bash -c "nodeos ${nodeosArgs.join(' ')}"`);
  }
};

const dockerrm = async (name) => {
  try {
    await execPromise(`docker rm -f ${name}`);
  }
  catch (e) {

  }
};

const killIfRunning = async (status) => {
  try {
    await kill(8888);
  }
  catch (e) { }
};

const addLoggingConfig = async () => {
  const configPath = `${os.homedir()}/.zeus/nodeos/config/`;
  const loggingJsonPath = `${configPath}/logging.json`;
  if (!fs.existsSync(configPath))
    await execPromise(`mkdir -p ${configPath}`);
  if (!fs.existsSync(loggingJsonPath))
    fs.writeFileSync(loggingJsonPath, JSON.stringify(loggingJson));
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
  },
  {
    "name": "net",
    "type": "gelf",
    "args": {
      "endpoint": "10.10.10.10",
      "host": "test"
    },
    "enabled": true
  }
  ],
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

var { execPromise } = require('../../helpers/_exec');
var dappservices;
var path = require('path');
var fs = require('fs');
if (fs.existsSync(path.resolve('extensions/tools/eos/dapp-services.js'))) { dappservices = require('../../tools/eos/dapp-services'); }
const kill = require('kill-port');
var which = require('which');
const os = require('os');
const { loadModels } = require('../../tools/models');

var generateNodeos = async(model) => {

  var name = model.name;
  var nodeosPort = model.nodeos_port;
  var nodeosP2PPort = model.nodeos_p2p_port;
  var stateHistoryPort = model.nodeos_state_history_port;

  // add logging.json if doesnt exist
  await addLoggingConfig(name);

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
    `--p2p-listen-endpoint 127.0.0.1:${nodeosP2PPort}`,
    '--filter-on=*',
    `-d ~/.zeus/nodeos-${name}/data`,
    `--config-dir ~/.zeus/nodeos-${name}/config`,
    `--http-server-address=0.0.0.0:${nodeosPort}`,
    '--access-control-allow-origin=*',
    '--contracts-console',
    '--max-transaction-time=150000',
    '--http-validate-host=false',
    '--verbose-http-errors'
  ];
  var ports = [
    `-p ${nodeosPort}:${nodeosPort}`,
    `-p ${nodeosP2PPort}:${nodeosP2PPort}`
  ];

  if (dappservices) {
    console.log('Initing dappservices plugins');
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
      await execPromise(`nodeos --version`, {});
    }
    catch (e) {
      if (e.stdout.trim() >= "v1.8.0") {
        console.log('Adding 1.8.0 Parameters');
        nodeosArgs = [...nodeosArgs,
          '--trace-history-debug-mode',
          "--delete-state-history"
        ]
      }
            if (e.stdout.trim() >= "v2.0.0") {
        console.log('Adding 2.0.0 Parameters');
        nodeosArgs = [...nodeosArgs,
          '--eos-vm-oc-enable'
        ]
      }
    }
    await execPromise(`nohup nodeos ${nodeosArgs.join(' ')} >> logs/nodeos-${name}.log 2>&1 &`, { unref: true });
  }
  else {
    var nodeos = process.env.DOCKER_NODEOS || 'liquidapps/eosio-plugins:v1.6.1';
    await execPromise(`docker run --name zeus-eosio-${name} --rm -d ${ports.join(' ')} ${nodeos} /bin/bash -c "nodeos ${nodeosArgs.join(' ')}"`);
  }


}
module.exports = async(args) => {
  if (args.creator !== 'eosio') { return; } // only local
  // load models
  var sidechains = await loadModels('local-sidechains');
  for (var i = 0; i < sidechains.length; i++) {
    if(sidechains[i].local === false) return;
    var sidechain = sidechains[i];
    await generateNodeos(sidechain);
  }
};

const dockerrm = async(name) => {
  try {
    await execPromise(`docker rm -f ${name}`);
  }
  catch (e) {

  }
};

const killIfRunning = async(port) => {
  try {
    await kill(port);
  }
  catch (e) {}
};

const addLoggingConfig = async(name) => {
  const configPath = `${os.homedir()}/.zeus/sidechain/${name}/nodeos/config/`;
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
  }],
  "loggers": [{
      "name": "default",
      "level": "debug",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "consoleout",
        "net"
      ]
    },
    {
      "name": "net_plugin_impl",
      "level": "debug",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "net"
      ]
    }
  ]
}

var { execPromise } = require('../../helpers/_exec');
var sleep = require('sleep-promise');
var dappservices;
var path = require('path');
var fs = require('fs');
if (fs.existsSync(path.resolve('extensions/tools/eos/dapp-services.js'))) { dappservices = require('../../tools/eos/dapp-services'); }
const kill = require('kill-port');
var which = require('which');
const os = require('os');

module.exports = async(args) => {
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
    '--verbose-http-errors'
  ];
  var ports = [
    '-p 8888:8888',
    '-p 9876:9876'
  ];

  if (dappservices) {
    console.log('Initing dappservices plugins');
    var backend = process.env.DEMUX_BACKEND || 'state_history_plugin';
    var { dappServicesContract } = dappservices;
    switch (backend) {
      case 'state_history_plugin':
        nodeosArgs = [...nodeosArgs,
          '--trace-history',
          '--plugin eosio::state_history_plugin',
          '--state-history-endpoint 0.0.0.0:8889'
        ];
        ports = [...ports,
          '-p 8889:8889'
        ];
        break;
    }
  }

  await dockerrm('zeus-eosio');
  await killIfRunning();
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
    }
    await execPromise(`nohup nodeos ${nodeosArgs.join(' ')} >> nodeos.log 2>&1 &`, { unref: true });
  }
  else {
    var nodeos = process.env.DOCKER_NODEOS || 'liquidapps/eosio-plugins:v1.6.1';
    await execPromise(`docker run --name zeus-eosio --rm -d ${ports.join(' ')} ${nodeos} /bin/bash -c "nodeos ${nodeosArgs.join(' ')}"`);
  }
};

const dockerrm = async(name) => {
  try {
    await execPromise(`docker rm -f ${name}`);
  }
  catch (e) {

  }
};

const killIfRunning = async(status) => {
  try {
    await kill(8888);
  }
  catch (e) {}
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
  "appenders": [
    {
      "name": "consoleout",
      "type": "console",
      "args": {
        "stream": "std_out",
        "level_colors": [
          {
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
  "loggers": [
    {
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
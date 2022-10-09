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

  await Promise.all([
    dockerrm(`zeus-eosio-${name}`),
    killIfRunning(nodeosPort),
    killIfRunning(model.firehose_grpc_port),
    killIfRunning(15010),
    killIfRunning(15011),
    killIfRunning(15012),
    killIfRunning(15014),
    killIfRunning(1066),
    addLoggingConfig(name),
    addGenesisConfig(name),
  ])
  if(args.kill) {
    return;
  }
  var nodeosArgs = [
    '-e',
    '-p eosio',
    '--plugin eosio::producer_plugin',
    '--plugin eosio::producer_api_plugin',
    '--disable-replay-opts',
    '--plugin eosio::chain_api_plugin',
    '--plugin eosio::chain_plugin',
    '--plugin eosio::http_plugin',
    '--delete-all-blocks',
    `--p2p-listen-endpoint 127.0.0.1:${nodeosP2PPort}`,
    `-d ${args.docker ? '/home/ubuntu' : os.homedir()}/.zeus/nodeos/data`,
    args.backend == 'firehose' ? '' : `--config-dir ${args.docker ? '/home/ubuntu' : os.homedir()}/.zeus/nodeos/config`,
    `--http-server-address=0.0.0.0:${nodeosPort}`,
    '--access-control-allow-origin=*',
    '--contracts-console',
    '--max-transaction-time=150000',
    '--http-validate-host=false',
    '--http-max-response-time-ms=9999999',
    '--verbose-http-errors',
    '--trace-history-debug-mode',
    '--delete-state-history',
    '--wasm-runtime=eos-vm-jit',
    '--max-irreversible-block-age=-1',
    `--genesis-json=${args.docker ? '/home/ubuntu' : os.homedir()}/.zeus/nodeos/config/genesis.json`,
    '--chain-threads=2',
    '--abi-serializer-max-time-ms=100',
    '--max-block-cpu-usage-threshold-us=50000'
  ];
  const dfuseeosArgs = [
    `--skip-checks=true`,
    `--log-level-switcher-listen-addr=localhost:1066`,
    `--mindreader-grpc-listen-addr=":15010"`,
    `--relayer-grpc-listen-addr=":15011"`,
    `--relayer-merger-addr=":15012"`,
    `--relayer-source=":15010"`,
    `--blockmeta-grpc-listen-addr=":15014"`,
    `--common-blockmeta-addr=":15014"`,
    `--common-blockstream-addr=":15011"`,
    `--merger-grpc-listen-addr=":15012"`,
    `--firehose-grpc-listen-addr=":${model.firehose_grpc_port}"`,
    `--mindreader-nodeos-api-addr=":${nodeosPort}"`,
    `--blockmeta-eos-api-extra-addr=":${nodeosPort}"`,
    `--config-file=""`,
    `--data-dir=${args.docker ? '/home/ubuntu' : os.homedir()}/.dfuseeos-b`
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
    var backend = args.backend;
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
      case 'firehose':
        nodeosArgs = [...nodeosArgs,
          '--deep-mind'
        ];
        ports = [...ports,
        `-p ${model.firehose_grpc_port}:${model.firehose_grpc_port}`
        ];
        break;
    }
  }

  if (!args.docker) {
    try {
      const res = await execPromise(`nodeos --version`, {});
      if (res < "v2.0.0") throw new Error();
      if(res > "v3.0.0") {
        nodeosArgs = [...nodeosArgs,
          '--block-log-retain-blocks=1000',
          '--state-history-log-retain-blocks=1000',
          '--disable-subjective-billing=true',
          // '--transaction-retry-max-expiration-sec=180',
          // '--p2p-dedup-cache-expire-time-sec=3',
          // '--transaction-retry-interval-sec=6'
        ];
      }
    }
    catch (e) {
      throw new Error('Nodeos versions < 2.0.0 not supported. See https://github.com/EOSIO/eos/releases');
    }
    if(args.backend=='firehose' && !args.basicEnv){
      await execPromise(`dfuseeos purge -f --data-dir=${args.docker ? '/home/ubuntu' : os.homedir()}/.dfuseeos-b`);
      await execPromise(`nohup nodeos ${nodeosArgs.join(' ')} | dfuseeos start mindreader-stdin relayer merger firehose blockmeta -v ${dfuseeosArgs.join(' ')} >> ./logs/nodeos-${name}.log 2>&1 &`, { unref: true });
    } else {
      await execPromise(`nohup nodeos ${nodeosArgs.join(' ')} >> ./logs/nodeos-${name}.log 2>&1 &`, { unref: true });
    }
  }
  else {
    let cmd;
    const volume = `${os.homedir()}:/home/ubuntu`
    nodeosArgs[nodeosArgs.indexOf(`-d ${args.docker ? '/home/ubuntu' : os.homedir()}/.zeus/nodeos/data`)] = `-d /home/ubuntu/.zeus/nodeos/data`
    nodeosArgs[nodeosArgs.indexOf(`--config-dir ${args.docker ? '/home/ubuntu' : os.homedir()}/.zeus/nodeos/config`)] = `--config-dir /home/ubuntu/.zeus/nodeos/config`
    nodeosArgs[nodeosArgs.indexOf(`--genesis-json=${args.docker ? '/home/ubuntu' : os.homedir()}/.zeus/nodeos/config/genesis.json`)] = `--genesis-json=/home/ubuntu/.zeus/nodeos/config/genesis.json`
    var nodeos = process.env.DOCKER_NODEOS || 'natpdev/leap-cdt-dfuseeos';
    if(args.backend=='firehose' && !args.basicEnv){
      dfuseeosArgs[dfuseeosArgs.indexOf(`--data-dir=${args.docker ? '/home/ubuntu' : os.homedir()}/.dfuseeos-b`)] = `-d /home/ubuntu/.dfuseeos-b`
      cmd = `docker run --name zeus-eosio-${name} --rm -v ${volume} -d ${ports.join(' ')} ${nodeos} /bin/bash -c "dfuseeos purge -f --data-dir=${args.docker ? '/home/ubuntu' : os.homedir()}/.dfuseeos-b; nodeos ${nodeosArgs.join(' ')} | dfuseeos start mindreader-stdin relayer merger firehose ${dfuseeosArgs.join(' ')}"`
    } else {
      cmd = `docker run --name zeus-eosio-${name} --rm -v ${volume} -d ${ports.join(' ')} ${nodeos} /bin/bash -c "nodeos ${nodeosArgs.join(' ')}"`
    }
    await execPromise(cmd);
  }
}
module.exports = async (args) => {
  if (args.creator !== 'eosio') { 
    return;
  } // only local
  if(args.singleChain) { 
    return; 
  }
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
      "name": "stderr",
      "type": "console",
      "args": {
        "format": "${timestamp} ${thread_name} ${context} ${file}:${line} ${method} ${level}]  ${message}",
        "stream": "std_error",
        "level_colors": [{
            "level": "debug",
            "color": "green"
          },{
            "level": "warn",
            "color": "brown"
          },{
            "level": "error",
            "color": "red"
          }
        ],
        "flush": true
      },
      "enabled": true
    },{
      "name": "stdout",
      "type": "console",
      "args": {
        "stream": "std_out",
        "level_colors": [{
            "level": "debug",
            "color": "green"
          },{
            "level": "warn",
            "color": "brown"
          },{
            "level": "error",
            "color": "red"
          }
        ],
        "flush": true
      },
      "enabled": true
    },{
      "name": "net",
      "type": "gelf",
      "args": {
        "endpoint": "10.10.10.10:12201",
        "host": "host_name",
        "_network": "jungle"
      },
      "enabled": true
    }
  ],
  "loggers": [{
      "name": "default",
      "level": "debug",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "stderr",
        "net"
      ]
    },{
      "name": "net_plugin_impl",
      "level": "info",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "stderr",
        "net"
      ]
    },{
      "name": "http_plugin",
      "level": "debug",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "stderr",
        "net"
      ]
    },{
      "name": "producer_plugin",
      "level": "debug",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "stderr",
        "net"
      ]
    },{
      "name": "transaction_success_tracing",
      "level": "debug",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "stderr",
        "net"
      ]
    },{
      "name": "transaction_failure_tracing",
      "level": "debug",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "stderr",
        "net"
      ]
    },{
      "name": "trace_api",
      "level": "debug",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "stderr",
        "net"
      ]
    },{
      "name": "transaction_trace_success",
      "level": "info",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "stderr",
        "net"
      ]
    },{
      "name": "transaction_trace_failure",
      "level": "info",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "stderr",
        "net"
      ]
    },{
    "name": "state_history",
    "level": "info",
    "enabled": true,
    "additivity": false,
    "appenders": [
      "stderr",
      "net"
      ]
    },{
      "name": "transaction",
      "level": "info",
      "enabled": true,
      "additivity": false,
      "appenders": [
        "stderr",
        "net"
      ]
    }
  ]
}

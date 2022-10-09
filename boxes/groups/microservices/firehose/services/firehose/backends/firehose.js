const path = require("path")
const grpc = require("grpc")
const protoLoader = require("@grpc/proto-loader")
const ProtoBuf = require("protobufjs")

const { requireBox } = require('@liquidapps/box-utils');
const { parseEvents, loggerHelper, getLinkedAccount } = requireBox('dapp-services/services/dapp-services-node/common');
const { dappServicesContract, dappServicesLiquidXContract } = requireBox('dapp-services/tools/eos/dapp-services');
const logger = requireBox('log-extensions/helpers/logger');
const { loadModels } = requireBox('seed-models/tools/models');
const sidechainName = process.env.SIDECHAIN;
const { fetchDappServiceXContract, getHeadBlockInfo, handleEvent, handleStakingAction, fetchStaking, fetchSidechainStaking } = require('../../../common/common')

const delay = ms => new Promise(res => setTimeout(res, ms));

// Global required by dfuse client
global.fetch = require("node-fetch")
global.WebSocket = require("ws")

const bstreamProto = loadProto("dfuse/bstream/v1/bstream.proto")
const eosioProto = loadProto("dfuse/eosio/codec/v1/codec.proto")

const bstreamService = loadGrpcPackageDefinition("dfuse/bstream/v1/bstream.proto").dfuse.bstream.v1

const blockMsg = bstreamProto.root.lookupType("dfuse.bstream.v1.Block")
const eosioBlockMsg = eosioProto.root.lookupType("dfuse.eosio.codec.v1.Block")
const forkStepEnum = bstreamProto.root.lookupEnum("dfuse.bstream.v1.ForkStep")

const forkStepNew = forkStepEnum.values["STEP_NEW"]
const forkStepUndo = forkStepEnum.values["STEP_UNDO"]
const forkStepIrreversible = forkStepEnum.values["STEP_IRREVERSIBLE"]

const async = require('async');

let killed = false, stream;

const q = async.priorityQueue(async ({ block, receivers, stream }) => {
  try {
    let receiverListChanged = false;
    for(let i1 = 0; i1 < block.filteredTransactionTraces.length; i1++) {
      let eventNumber = 0;
      const trx = block.filteredTransactionTraces[i1];
      for(let i2 = 0; i2 < trx.actionTraces.length; i2++) {
        const action = trx.actionTraces[i2]
        if(action.receiver === dappServicesContract && !sidechainName && 
          (
            action.action.name == 'stake' || 
            action.action.name == 'staketo' || 
            action.action.name == 'refund' || 
            action.action.name == 'refundto'
          )
        ){
          const newReceivers = await handleStakingAction(
            action.action.name, 
            JSON.parse(action.action.jsonData), 
            block.id.toUpperCase(), 
            block.number, 
            receivers
          )
          if(newReceivers !== false && JSON.stringify(newReceivers) != JSON.stringify(receivers)) {
            receiverListChanged = true;
            receivers = newReceivers;
          }
        } else if(sidechainName && 
          (
            action.action.name == 'adddsp' || 
            action.action.name == 'setlink' 
          ) && action.receiver === await fetchDappServiceXContract()
        ) {
          const newReceivers = await handleStakingAction(
            action.action.name, 
            JSON.parse(action.action.jsonData), 
            block.id.toUpperCase(), 
            block.number, 
            receivers
          );
          if(newReceivers !== false && JSON.stringify(newReceivers) != JSON.stringify(receivers)) {
            receiverListChanged = true;
            receivers = newReceivers;
          };
        } else if(sidechainName && 
          (
            action.action.name == 'setcode' &&
            (JSON.parse(action.action.jsonData)).account == await fetchDappServiceXContract()
          )
        ) {
          receivers = [];
          receiverListChanged = true;
        }
        if(action.console) {
          let events = await parseEvents(action.console);
          for(let i3 = 0; i3 < events.length; i3++) {
            const event = events[i3]
            let sidechain = null;
            if (sidechainName) {
              let sidechains = await loadModels('eosio-chains');
              sidechain = sidechains.find(a => a.name === sidechainName);
            }
            await handleEvent(
              trx.id.toUpperCase(), 
              action.receiver, 
              action.action.account, 
              action.action.name, 
              block.number, 
              Number(block.header.timestamp.seconds), 
              block.id.toUpperCase(), 
              sidechain, 
              action.action.jsonData ? JSON.parse(action.action.jsonData) : action.action.jsonData, 
              event, 
              eventNumber++
            );
          }
        }
      }
    }
    // if(sidechainName && block.number % 2000 == 0 || (sidechainName && block.number % 10 == 0 && (!receivers || !receivers.length))) {
      if(sidechainName && block.number % 2000 == 0) {
      // every 2000 blocks, or 16.6m recreate receiver list
      const sidechainReceivers = await fetchSidechainStaking();
      if(sidechainReceivers.length > 0 && JSON.stringify(sidechainReceivers) != JSON.stringify(receivers)) {
        receiverListChanged = true;
        receivers = sidechainReceivers;
      };
    }
    if(receiverListChanged) {
      killed = true;
      await stream.cancel()
      await q.kill()
      await main(receivers, block.number + 1)
    }
  } catch(e) {
    logger.error(`error running firehose trx`)
    logger.error(e);
  }
}, 1); // 1 block at a time

logger.info(`running client: ${process.env.FIREHOSE_GRPC_ADDRESS}:${process.env.FIREHOSE_GRPC_PORT}, secured ${process.env.FIREHOSE_GRPC_SECURED}`);

const client = new bstreamService.BlockStreamV2(
  `${process.env.FIREHOSE_GRPC_ADDRESS}:${process.env.FIREHOSE_GRPC_PORT}`,
  process.env.FIREHOSE_GRPC_SECURED.toString() == "true" ? grpc.credentials.createSsl() : grpc.credentials.createInsecure(), 
  {
    "grpc.max_receive_message_length": 1024 * 1024 * 100,
    "grpc.max_send_message_length": 1024 * 1024 * 100
  }
)

async function main(initReceivers, startBlock) {
  killed = false;

  // await delay(20000);
  const metadata = new grpc.Metadata();

  let receivers = initReceivers ? 
    initReceivers
    : 
    sidechainName ? await fetchSidechainStaking() : await fetchStaking();

  let linkedAccount;

  try {
    linkedAccount = await getLinkedAccount(null, null, 'dappservices', sidechainName)
  } catch(e) {}

  let dappservicesQuery

  if(sidechainName && linkedAccount) {
    dappservicesQuery = `receiver == '${linkedAccount}' && (action == 'adddsp' || action == 'setlink' || action == 'xsignal' || action == 'usage')`
  } else if(sidechainName) {
    dappservicesQuery = `action == 'setcode'`
  } else {
    dappservicesQuery = `receiver == 'dappservices' && (action == 'stake' || action == 'staketo' || action == 'refund' || action == 'refundto' || action == 'xsignal' || action == 'usage')`
  }

  const query = receivers.length ? `receiver in ${JSON.stringify(receivers)} || (${dappservicesQuery})` : dappservicesQuery

  logger.info(query)

  let ignoreBlock = 0, headBlock = (await getHeadBlockInfo()).head_block_num;


  logger.debug(`before start block : ${startBlock} head block ${headBlock} ignore block : ${ignoreBlock}`)

  if(startBlock >= 100 && headBlock - startBlock < 100) {
    ignoreBlock = startBlock;
    startBlock = startBlock - ( (startBlock % 100) + 100 );
  } else if(startBlock < 100) {
    ignoreBlock = startBlock;
    startBlock = 0;
  }

  logger.debug(`after start block : ${startBlock} head block ${headBlock} ignore block : ${ignoreBlock}`)

  const start_block_num = startBlock > -1 ? startBlock : process.env.FIREHOSE_START_BLOCK || headBlock

  logger.info(`starting at block: ${start_block_num}`);
  stream = client.Blocks(
    {
      start_block_num, // may need to take off some blocks in case missing trxs on restart
      include_filter_expr: query,
      fork_steps: [forkStepNew]
    },
    metadata
  )

  try {
    stream.on("data", async (data) => {
      const { block: rawBlock } = data 
      if (rawBlock.type_url !== "type.googleapis.com/dfuse.eosio.codec.v1.Block") {
        return
      }

      const block = eosioBlockMsg.decode(rawBlock.value)

      if(ignoreBlock > 0 && block.number < ignoreBlock) {
        return;
      }

      if(killed == false) q.push({ block, receivers, stream }, block.number);
    })

    stream.on("error", (error) => {
      logger.error(`firehose error: ${typeof(error) == "object" ? JSON.stringify(error) : error}`)
    })
  
    stream.on("close", (close) => {
      logger.error(`firehose close: ${typeof(close) == "object" ? JSON.stringify(close) : close}`)
    })
  
    stream.on("status", (status) => {
      logger.error(`firehose status: ${typeof(status) == "object" ? JSON.stringify(status) : status}`)
    })
  } catch(e) {
    logger.error(e);
  }
}

function loadGrpcPackageDefinition(package) {
  const protoPath = path.resolve(__dirname, "proto", package)

  const proto = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  })

  return grpc.loadPackageDefinition(proto)
}

function loadProto(package) {
  const protoPath = path.resolve(__dirname, "proto", package)

  return ProtoBuf.loadSync(protoPath)
}

main()
  .then(() => {
    console.log("Completed")
  })
  .catch((error) => {
    console.error("An error occurred", error);
    logger.error(error);
  })

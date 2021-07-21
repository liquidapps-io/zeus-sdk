const nodeFetch = require("node-fetch");
const WebSocketClient = require("ws");
const { requireBox } = require('@liquidapps/box-utils');
const logger = requireBox('log-extensions/helpers/logger');
const { getDappClient } = require("../client/dapp-client");
const { fetchStaking, createServiceOperation, createStakingOperation, handleEvent, printBlock, handleStakingAction } = require("../common/common");
const { parseEvents, loggerHelper } = requireBox('dapp-services/services/dapp-services-node/common');
const { loadModels } = requireBox('seed-models/tools/models');
const sidechainName = process.env.SIDECHAIN;
const LAST_CURSOR_FILENAME_SERVICES = "last_cursor_services.txt"
const LAST_CURSOR_FILENAME_STAKING = "last_cursor_staking.txt"
import { createDfuseClient, Stream, DfuseClient, GraphqlStreamMessage } from "@dfuse/client"
import { writeFileSync, readFileSync, existsSync } from "fs"
import * as types from  "../types/index";
import { IncomingMessage } from "http";
import * as path from "path"

async function webSocketFactory(url: string, protocols: string[] = []) {
    const webSocket = new WebSocketClient(url, protocols, {
      handshakeTimeout: 30 * 1000, // 30s
      maxPayload: 200 * 1024 * 1000 * 1000 // 200Mb
    })
  
    const onUpgrade = (response: IncomingMessage) => {
      logger.info("Socket upgrade response status code.", response.statusCode)
  
      // You need to remove the listener at some point since this factory
      // is called at each reconnection with the remote endpoint!
      webSocket.removeListener("upgrade", onUpgrade)
    }
  
    webSocket.on("upgrade", onUpgrade)
  
    return webSocket
}
const dfuseClientAuth = process.env.DFUSE_AUTHORIZATION ? true : false

export const dfuseClient: DfuseClient = createDfuseClient({
    apiKey: process.env.DFUSE_AUTHORIZATION ? process.env.DFUSE_API_KEY : '',
    //authorization: dfuseClientAuth,
    network: process.env.DFUSE_NETWORK,
    httpClientOptions: {
      fetch: nodeFetch
    },
    graphqlStreamClientOptions: {
      socketOptions: {
        // The WebSocket factory used for GraphQL stream must use this special protocols set
        // We intend on making the library handle this for you automatically in the future,
        // for now, it's required otherwise, the GraphQL will not connect correctly.
        webSocketFactory: (url) => webSocketFactory(url, ["graphql-ws"]),
        reconnectDelayInMs: 250
      }
    },
    streamClientOptions: {
      socketOptions: {
        webSocketFactory: (url) => webSocketFactory(url)
      }
    }
});

export class Engine {
  private client: DfuseClient
  private stakingStream?: Stream
  private serviceStream?: Stream

  private pendingStakingActions: object[] = []
  private committedStakingActions: object[] = []
  private pendingServiceActions: object[] = []
  private committedServiceActions: object[] = []
  private stakedAccountsArr: string[] = []

  constructor(client: DfuseClient) {
    this.client = client
  }

  public async runServices(fetchStake: boolean) {
    logger.info("Service Engine starting");
    if(fetchStake) this.stakedAccountsArr = await fetchStaking();
    if(!fetchStake) logger.info(`false fetchStake`)
    // this.stakedAccountsArr = ["prodprod1234"]
    logger.info(`stakedAccountsArr: ${this.stakedAccountsArr}`);
    let lastPersistedCursor = "";
    const lastCursorPath = path.resolve(__dirname, LAST_CURSOR_FILENAME_SERVICES)
    logger.info(`lastPersistedCursor: ${lastPersistedCursor}`)
    if (existsSync(lastCursorPath)) {
      lastPersistedCursor = readFileSync(lastCursorPath).toString()
      logger.info("Read last persisted cursor for services, start back at cursor " + lastPersistedCursor)
    }
    
    this.serviceStream = await this.client.graphql(
      createServiceOperation(this.stakedAccountsArr),
      (message: GraphqlStreamMessage) => {
        if (message.type === "data") {
          this.onServiceResult(message.data as types.ServiceMessage)
        }

        if (message.type === "error") {
          logger.error(JSON.stringify(message))
          this.onError(message.errors, message.terminal, "service")
        }

        if (message.type === "complete") {
          logger.error(JSON.stringify(message))
          this.onComplete("service")
        }
      },
      {
        variables: {
          cursor: lastPersistedCursor
        }
      }
    )

    this.serviceStream.onPostRestart = () => {
      logger.info()
      logger.info(
        "<============= Service stream has reconnected to the socket correctly (at latest `mark()`) =============>"
      )
      logger.info()
      logger.info("Flushing pending service action(s) due to refresh")
      this.pendingServiceActions = []
    }
    logger.info("Stream connected, ready to receive service messages")
    await this.serviceStream.join()
  }

  public async runStaking() {
    logger.info("Staking Engine starting");
    let sidechain = null;
    let sidechains = await loadModels('eosio-chains');
    if (sidechainName) sidechain = sidechains.find(a => a.name === sidechainName);

    // if sidechainName found, return as no staking events happening on sidechain only mainnet
    if(sidechain) {
      logger.info(`Not running staking stream on sidechain: ${sidechain}`);
      return;
    }
    logger.info("Staking Engine starting");
    let lastPersistedCursor = "";
    const lastCursorPath = path.resolve(__dirname, LAST_CURSOR_FILENAME_STAKING)
    if (existsSync(lastCursorPath)) {
      lastPersistedCursor = readFileSync(lastCursorPath).toString()
      logger.info("Read last persisted cursor for staking, start back at cursor " + lastPersistedCursor)
    }
    logger.info(`createStakingOperation: ${createStakingOperation}`)

    this.stakingStream = await this.client.graphql(
      createStakingOperation(),
      (message: GraphqlStreamMessage) => {
        if (message.type === "data") {
          this.onStakingResult(message.data as types.StakingMessage)
        }

        if (message.type === "error") {
          logger.error(JSON.stringify(message))
          this.onError(message.errors, message.terminal, "service")
        }

        if (message.type === "complete") {
          logger.error(JSON.stringify(message))
          this.onComplete("service")
        }
      },
      {
        variables: {
          cursor: lastPersistedCursor
        }
      }
    ) 

    this.stakingStream.onPostRestart = () => {
      logger.info()
      logger.info(
        "<============= Staking stream has reconnected to the socket correctly (at latest `mark()`) =============>"
      )
      logger.info()
      logger.info("Flushing pending staking action(s) due to refresh")
      this.pendingStakingActions = []
    }
    logger.info("Stream connected, ready to receive staking messages")
    await this.stakingStream.join()
  }

  private onStakingProgress = (blockId: string, blockNum: number, cursor: string) => {
    logger.info(`Live marker received @ ${printBlock(blockId, blockNum)} for Staking stream`)
    this.commitStaking(cursor)
  }

  private onServiceProgress = (blockId: string, blockNum: number, cursor: string) => {
    logger.info(`Live marker received @ ${printBlock(blockId, blockNum)} for Service stream`)
    this.commitService(cursor)
  }

  private onRestartServiceStream = async () => {
    await this.serviceStream.close()
    // may not need this as stream may auto restart
    await this.runServices(false);
  }

  private onStakingResult = async (message: types.StakingMessage) => {
    const data = message.searchTransactionsForward
    const { id: blockId, num: blockNum } = data.block
    // A message without the trace object being set means we deal with a live marker progress message
    if (!data.trace) {
      this.onStakingProgress(blockId, blockNum, data.cursor)
      return
    }
    const currentStakedAccountsArr = [...this.stakedAccountsArr]
    const client = await (await getDappClient()).dappNetwork;
    for(let i = 0; i < data.trace.matchingActions.length; i++) {
      let action = data.trace.matchingActions[i];
      await handleStakingAction(action, client, blockId, blockNum, this);
      this.pendingStakingActions.push(action.json);
    }
    logger.info("Comitting changes after staking transaction");
    this.commitStaking(data.cursor);
    if(currentStakedAccountsArr !== this.stakedAccountsArr) {
      this.onRestartServiceStream();
    }
  }

  private onServiceResult = async (message: types.ServiceMessage) => {
    let sidechain = null;
    let sidechains = await loadModels('eosio-chains');
    if (sidechainName) sidechain = sidechains.find(a => a.name === sidechainName);
    const messageData = message.searchTransactionsForward
    const { id: blockId, num: blockNum } = messageData.block

    // A message without the trace object being set means we deal with a live marker progress message
    if (!messageData.trace) {
      this.onServiceProgress(blockId, blockNum, messageData.cursor)
      return
    }

    const cursor: string = messageData.cursor;
    const txId: string = messageData.trace.id;
    const timestamp: string = messageData.trace.block.timestamp;
    messageData.trace.matchingActions.forEach(async (action) => {
      const account: string = action.account;
      const receiver: string = action.receiver;
      const method: string = action.name;
      const data: object = action.data;
      const events: types.Event[] = await parseEvents(action.console);
      let eventNum: types.EventNum = {
        tx: "",
        num: 0
      };
      events.forEach(async (event: types.Event) => {
        if(!eventNum.tx) {
          eventNum.tx = txId;
        } else if(eventNum.tx != txId) {
          eventNum.tx = txId;
          eventNum.num = 0;
        } else {
          eventNum.num += 1;
        }
        await handleEvent(txId, receiver, account, method, blockNum, timestamp, blockId, sidechain, data, event, eventNum.num);
      })
      this.pendingServiceActions.push(action.json)
    })

    logger.info("Comitting changes after service transaction");
    this.commitService(cursor);
  }

  private onError = (errors: Error[], terminal: boolean, stream: string) => {
    logger.info(`Received an 'error' message for ${stream}`, JSON.stringify(errors))

    if (terminal) {
      logger.info(
        "Received a terminal 'error' message, the stream will automatically reconnects in 250ms"
      )
    }
  }

  private onComplete = (stream: string) => {
    logger.info(`Received a 'complete' message, no more results for this ${stream} stream`)
  }

  private commitStaking(cursor: string) {
    if (this.pendingStakingActions.length > 0) {
      logger.info(`Committing all actions up to cursor ${cursor} for staking`)

      // Here, in your production code, action would be saved in a database, as well as error handling
      this.pendingStakingActions.forEach((action) => this.committedStakingActions.push(action))
      this.pendingStakingActions = []
    }
    this.ensureStakingStream().mark({ cursor })

    writeFileSync(path.resolve(__dirname, LAST_CURSOR_FILENAME_STAKING), cursor)
  }

  private commitService(cursor: string) {
    if (this.pendingServiceActions.length > 0) {
      logger.info(`Committing all actions up to cursor ${cursor} for service`)

      // Here, in your production code, action would be saved in a database, as well as error handling
      this.pendingServiceActions.forEach((action) => this.committedServiceActions.push(action))
      this.pendingServiceActions = []
    }
    this.ensureServiceStream().mark({ cursor })

    writeFileSync(path.resolve(__dirname, LAST_CURSOR_FILENAME_SERVICES), cursor)
  }

  private ensureStakingStream(): Stream {
    if (this.stakingStream) {
      return this.stakingStream
    }

    throw new Error("Staking stream should be set at this runtime execution point")
  }

  private ensureServiceStream(): Stream {
    if (this.serviceStream) {
      return this.serviceStream
    }

    throw new Error("Service stream should be set at this runtime execution point")
  }
}
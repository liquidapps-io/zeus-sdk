require("dotenv").config();
const fetch = require("isomorphic-fetch");
const BN = require('bignumber.js');
const { createDfuseClient } = require("@dfuse/client");
// const ApolloClient = require("apollo-client/ApolloClient");
const { gql, ApolloClient } = require("apollo-boost");
const { HttpLink } = require("apollo-link-http");
const { InMemoryCache } = require("apollo-cache-inmemory");
const ws = require("ws");
const { deserialize, decodeName } = require('./services/dapp-services-node/common');
const { getEosWrapper } = require('./extensions/tools/eos/eos-wrapper');
const { getCreateKeys } = require('./extensions/helpers/key-utils');

global.WebSocket = ws;

const token = process.env.DFUSE_API_KEY;

const table = process.env.TABLE || "claiminfo114";
const batchSize = parseInt(process.env.BATCH_SIZE || "10");
const account = "moonlight.co";
//const httpEndpoint = "https://eos.greymass.com:443";
const httpEndpoint = "http://localhost:8888";
const query = `account:${account} db.table:${table}`;

let apolloClient, eos, abi;

const getTransactions = async (handle, cursor = "") => {
  let response;
  try {
    response = await apolloClient.query({
      query: gql`
            query($cursor: String!, $query: String!, $batchSize: Int64!) {
              searchTransactionsForward(
                query: $query,
                lowBlockNum: 1,
                limit:$batchSize,
                cursor: $cursor
                ) {
                  cursor
                  results {
                    trace {
                      id
                      block {
                        num
                      }
                      matchingActions {
                        #console
                        receiver
                        account
                        name
                        dbOps {
                          key {
                            key
                            table
                          }
                          operation
                          oldJSON {
                            object
                          }
                          newJSON {
                            object
                          }
                        }
                      }
                    }
                  }
              }
            }
          `,
      variables: {
        cursor,
        query,
        batchSize
      }
    })

    if (!response.data.searchTransactionsForward.results.length) {
      console.log('done')
      return;
    }

    // console.log(JSON.stringify(response))
    let blockNum = response.data.searchTransactionsForward.results[0].trace.block.num;
    console.log(`at block ${blockNum}`);
    let action = response.data.searchTransactionsForward.results[0].trace.matchingActions[0].name;
    const dbOpsArray = response.data.searchTransactionsForward.results.map(
      res => {
        if (res.trace.matchingActions.length !== 1)
          console.error("GOT MORE THAN ONE ACTION");

        const dbOps = res.trace.matchingActions[0].dbOps;
        if (dbOps.length === 1) {
          if (dbOps[0].key.table !== table && dbOps[0].newJSON.object.shard_uri !== dbOps[0].oldJSON.object.shard_uri) {
            console.error(`BAD - ${JSON.stringify(res)}`)
          }
          return;
        }

        return dbOps;
      }
    ).filter(x => x);
    const parsedDbOpsArray = dbOpsArray.map(dbOps => parseDbOps(dbOps));
    const deserializedData = parsedDbOpsArray.map(parsedDbOp => ({
      action,
      data: deserializeTableData(parsedDbOp.rawData)
    }));
    await handle(deserializedData);
  }
  catch (e) {
    console.error(e)
    return;
  }

  cursor = response.data.searchTransactionsForward.cursor;
  if (cursor)
    await getTransactions(handle, cursor);
}

async function transactionsHandler(txData) {
  let trys = 0;
  while (trys < 20) {
    try {
      const actions = txData.map(tx => ({
        account,
        name: tx.action,
        authorization: [{
          actor: account,
          permission: 'active'
        }],
        data: tx.data
      }));
      await eos.transact({
        actions
      }, {
        expireSeconds: 120,
        sign: true,
        broadcast: true,
        blocksBehind: 10
      });
      return;
    } catch (e) {
      if (e.toString().indexOf('duplicate') !== -1) {
        return;
      }

      trys++;
      console.error(e);
      console.log(`trys - ${trys}`)
      await sleep(1000 * trys);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function deserializeTableData(rawData) {
  const abiTable = abi.tables.find(a => a.name == '.' + table);
  if (!abiTable) {
    console.error('abi not found', table);
    return;
  }
  const structName = abiTable.type;
  try {
    const result = deserialize(abi.structs, Buffer.from(rawData, "hex"), structName);
    return result
  } catch (e) {
    console.log(`Error deserializing raw data: ${rawData}`);
    console.log(e);
  }

}

function filterDbOps(dbOps) {
  // filter to contain vRam raw data and bucket data
  const filteredData = dbOps.filter(op =>
    op.key.table === "ipfsentry" && op.newJSON.object.data.length < 4000 && op.newJSON.object.data !== ""
  ).map(op => op.newJSON.object.data);

  if (filteredData.length !== 2)
    console.error(`UNEXPECTED NUMBER OF DBOPS: before - ${JSON.stringify(dbOps)}, after- ${JSON.stringify(filteredData)}`);

  return filteredData;
}

function parseDbOps(dbOps) {
  const filteredData = filterDbOps(dbOps);

  const rawData = filteredData[0];
  const rawScope = filteredData[1].slice(0, 16);
  const rawKey = filteredData[1].slice(16, 32);
  const key = decodeName(new BN(rawKey, 16).toString(10))
  const scope = decodeName(new BN(rawScope, 16).toString(10))
  return { rawData, rawKey, rawScope, key, scope };
}

async function run() {
  const dfuseClient = createDfuseClient({
    apiKey: token,
    network: "mainnet",
  });
  const apiToken = await dfuseClient.getTokenInfo();
  const link = new HttpLink({
    uri: dfuseClient.endpoints.graphqlQueryUrl,
    headers: { Authorization: `Bearer ${apiToken.token}` }
  });
  const cache = new InMemoryCache();
  apolloClient = new ApolloClient({
    link,
    cache
  });
  const keys = await getCreateKeys(account);
  eos = getEosWrapper({ httpEndpoint, keyProvider: keys.active.privateKey });
  abi = await eos.getAbi(account);
  await getTransactions(transactionsHandler);
  return;
}

run().catch(console.log);

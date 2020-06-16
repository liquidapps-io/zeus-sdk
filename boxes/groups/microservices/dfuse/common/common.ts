const { getDappClient } = require("../client/dapp-client");
const { requireBox } = require('@liquidapps/box-utils');
const logger = requireBox('log-extensions/helpers/logger');
const nodeFetch = require("node-fetch");
const serviceResponseTimeout = parseInt(process.env.SERVICE_RESPONSE_TIMEOUT_MS || '10000');
const { loggerHelper } = requireBox('dapp-services/services/dapp-services-node/common');
import * as types from  "../types/index";


export function printBlock(blockId: string, blockNum: number): string {
  return `${blockId.slice(0, 8)}...${blockId.slice(-8)} (${blockNum})`
}

export const returnNumber = (quantity: string) => {
  return Number(quantity.slice(0,-5));
}

export const fetchPackage = async (client, providerPackage: string, service: string, provider: string, limit: number) => {
  return await client.get_table_package_by_package_service_provider(providerPackage, service, provider,{ limit });
}

export const fetchAccountextTable = async (client, limit: number) => {
  return await client.get_table_accountext({limit});
}

export const fetchAccountextTableByAccountServiceProvider = async (client, account: string, service: string, provider: string, limit: number) => {
  return await client.get_table_accountext_by_account_service_provider(account, service, provider, {limit});
}

const handleInnerStaking = async (account: string, client, action, thisObject) => {
  // if account is not already being listened to
  if(!(thisObject.stakedAccountsArr.indexOf(account) != -1)) {
    // find 2nd accountext entry, has updated balance every time
    let newAccountextEntry = action.dbOps.filter(el => el.key.table == "accountext")[1].newJSON.object;
    // convert new balance to number
    let newBalance = returnNumber(newAccountextEntry.balance);
    // fetch package min stake quantity
    let currentPackage: types.PackageEntry = await fetchPackage(client, newAccountextEntry.pending_package, newAccountextEntry.service, newAccountextEntry.provider, 9999999 )
    // if new stake surpasses current stake quantity then add to list
    if(newBalance >= returnNumber(currentPackage.rows[0].min_stake_quantity)) thisObject.stakedAccountsArr = [...thisObject.stakedAccountsArr, account];
  }
}

const handleInnerRefunding = async (account: string, client, action, thisObject) => {
  // if account is being listened to
  if(thisObject.stakedAccountsArr.indexOf(account) != -1) {
    // find 2nd accountext entry, has updated balance every time
    let newAccountextEntry = action.dbOps.filter(el => el.key.table == "accountext")[1];
    // convert new balance to number
    let newBalance = returnNumber(newAccountextEntry.newJSON.object.balance);
    // fetch package min stake quantity
    let currentPackage: types.PackageEntry = await fetchPackage(client, newAccountextEntry.newJSON.object.pending_package, newAccountextEntry.newJSON.object.service, newAccountextEntry.newJSON.object.provider, 9999999 )
    // if new refund bring stake below min stake quantity then remove from list
    // DSP logic handles if unstake package period has already passed
    if(newBalance < returnNumber(currentPackage.rows[0].min_stake_quantity)) thisObject.stakedAccountsArr = thisObject.stakedAccountsArr.filter(i => i != account);
  }
}

export const handleStakingAction = async (action, client, blockId: string, blockNum: number, thisObject) => {
  let account: string = "", service: string = action.data.service, provider: string = action.data.provider;
  if(action.name == "stake") {
    account = action.data.from;
    await handleInnerStaking(account, client, action,thisObject);
    logger.info( `Stake [${action.data.from} ${action.data.quantity}] @ ${printBlock(blockId, blockNum)}`)
  } else if(action.name == "staketo") {
    account = action.data.to;
    await handleInnerStaking(account, client, action, thisObject);
    logger.info( `Staketo [${action.data.from} -> ${action.data.to} ${action.data.quantity}] @ ${printBlock(blockId, blockNum)}`)
  } else if(action.name == "refund") {
    account = action.data.to;
    await handleInnerRefunding(account, client, action, thisObject);
    logger.info( `Refund [${action.data.to}}] @ ${printBlock(blockId, blockNum)}`)
  } else if(action.name == "refundto") {
    account = action.data.to;
    await handleInnerRefunding(account, client, action, thisObject);
    logger.info( `Refundto [${action.data.from}} -> ${action.data.to}] @ ${printBlock(blockId, blockNum)}`)
  }
}

export const fetchStaking = async () => {
    const client = await (await getDappClient()).dappNetwork;
    const response = await fetchAccountextTable(client, 9999999);
    let accounts = response.rows
       // check if account staked to this DSP
      .filter(el => el.provider === process.env.DSP_ACCOUNT)
      // pre check if balance > 0
      .filter(el => returnNumber(el.balance) > 0)
      // check if balance > min_stake_quantity
      // need to do old school for loop
    let newAccounts = [];
    // remove accounts that do not meet min stake amount
    for(let i = 0; i < accounts.length; i++) {
      let providerPackage: types.PackageEntry = await fetchPackage(client, accounts[i].pending_package, accounts[i].service, accounts[i].provider, 9999999 );
      if(providerPackage.rows.length && (returnNumber(accounts[i].balance) >= returnNumber(providerPackage.rows[0].min_stake_quantity))) newAccounts.push(accounts[i])
    }
    // map from array of objects to array of accounts
    newAccounts = newAccounts.map(el => el.account);
      
    logger.info(`accounts: ${newAccounts}`)
    if(!newAccounts) logger.warn(`No newAccounts staked to ${process.env.DSP_ACCOUNT}`);
    return newAccounts;
}

export const createServiceOperation = (stakedAccountsArr: string[]) => {
  let query: string;
  if(stakedAccountsArr.length === 1) {
    query = `receiver:${stakedAccountsArr[0]}`
  } else {
    stakedAccountsArr.forEach((el, i) => {
      if(i === 0) {
        query = `(receiver:${el}`
      } else {
        query += ` OR receiver:${el}`
      }
    })
    query += `)`
  }
  // live marker ever 5 minutes is 288 documents per day or 8,640 documents per month
  return `subscription($cursor: String!) {
    searchTransactionsForward(query:"${query}", cursor: $cursor, liveMarkerInterval: 600) {
        undo 
        cursor
        block { id num }
        trace { 
            id 
            matchingActions { 
                json 
                receiver
                account
                name
                data
                console
            } 
            block {
                num
                id
                confirmed
                timestamp
                previous
            }
        }
    }
  }`
}

export const createStakingOperation = () => {
  // no live marker needed for this socket because never restarted
  let query: string = `receiver:dappservices (action:stake OR action:staketo OR action:refund OR action:refundto)`;
  // live marker ever 30 minutes is 48 documents per day or 1440 documents per month
  return `subscription($cursor: String!) {
    searchTransactionsForward(query:"${query}", cursor: $cursor, liveMarkerInterval: 3600) {
        undo 
        cursor
        block { id num }
        trace { 
            id 
            matchingActions { 
                json 
                receiver
                account
                name
                data
                console
                dbOps {
                  key {
                    table
                  }
                  operation
                  newJSON {
                    object
                  }
                }
            } 
            block {
                num
                id
                confirmed
                timestamp
                previous
            }
        }
    }
  }`
}

export const handleEvent = async (txId: string, receiver: string, account: string, method: string, blockNum: number, timestamp: string, blockId: string, sidechain: string, data: string, event: types.Event, eventNum: number) => {
    const url = `http://localhost:${process.env.WEBHOOK_DAPP_PORT || 8812}`;
    logger.debug(`handling ${txId} ${eventNum} ${receiver} ${account} ${JSON.stringify(event)} ${method}`);
    const meta: types.Meta = {
      txId,
      blockNum,
      timestamp,
      blockId,
      sidechain,
      eventNum
    }
    event.meta = meta;
    const promRes = nodeFetch(url, {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({
        receiver,
        method,
        account,
        data,
        event
      })
    });
    // call webhook
    const r = await Promise.race([
      promRes,
      new Promise((resolve, reject) => {
        setTimeout(() => reject(`service response timeout for event ${JSON.stringify(event)}`), serviceResponseTimeout);
      })
    ])
    let res = await r.text();
    if(res != `"ok"`) logger.warn(loggerHelper(res));
    logger.debug(`fired hooks: ${account} ${method} ${JSON.stringify(event)} ${account}`);
}
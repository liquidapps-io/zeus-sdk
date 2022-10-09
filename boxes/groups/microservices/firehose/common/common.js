const { requireBox } = require('@liquidapps/box-utils');
const logger = requireBox('log-extensions/helpers/logger');
const nodeFetch = require("node-fetch");
const serviceResponseTimeout = parseInt(process.env.SERVICE_RESPONSE_TIMEOUT_MS || '10000');
const { loggerHelper, getTableRowsSec, getLinkedAccount } = requireBox('dapp-services/services/dapp-services-node/common');
const { JsonRpc } = require('eosjs');

const { dappServicesContract, dappServicesLiquidXContract } = requireBox('dapp-services/tools/eos/dapp-services');

const sidechainName = process.env.SIDECHAIN;
const nodeosMainnetEndpoint = process.env.NODEOS_MAINNET_ENDPOINT || 'http://localhost:8888';
const nodeosHost = process.env.NODEOS_HOST || 'localhost';
const nodeosRpcPort = process.env.NODEOS_PORT || '8888';
const nodeosUrl =
  `http${process.env.NODEOS_SECURED === 'true' || process.env.NODEOS_SECURED === true ? true : false ? 's' : ''}://${nodeosHost}:${nodeosRpcPort}`;

const rpc = new JsonRpc(nodeosMainnetEndpoint, { fetch:nodeFetch });
let sidechainRpc;
if(sidechainName) {
  sidechainRpc = new JsonRpc(nodeosUrl, { fetch:nodeFetch });
}

function printBlock(blockId, blockNum) {
  return `${blockId.slice(0, 8)}...${blockId.slice(-8)} (${blockNum})`
}

const returnNumber = (quantity) => {
  return Number(quantity.slice(0,-5));
}

const fetchPackage = async (client, providerPackage, service, provider, limit) => {
  return await client.get_table_package_by_package_service_provider(providerPackage, service, provider,{ limit });
}

const fetchAllTableRows = async (code, table, scope) => {
  const mainnetAccountList = await getTableRowsSec(rpc, code, table, scope, [], 9999999999);
  return {
    more: false,
    rows: mainnetAccountList
  }
}

const fetchAccountextTableByAccountServiceProvider = async (client, account, service, provider, limit) => {
  return await client.get_table_accountext_by_account_service_provider(account, service, provider, {limit});
}

const handleInnerStaking = async (account, client, receivers, service, provider) => {
  // if account is not already being listened to
  if(!(receivers.indexOf(account) != -1)) {
    // find 2nd accountext entry, has updated balance every time
    let newAccountextEntry = await fetchAccountextTableByAccountServiceProvider(client, account, service, provider, 999999);
    // convert new balance to number
    let newBalance = returnNumber(newAccountextEntry.rows[0].balance);
    // fetch package min stake quantity
    let currentPackage = await fetchPackage(client, newAccountextEntry.rows[0].pending_package, newAccountextEntry.rows[0].service, newAccountextEntry.rows[0].provider, 9999999 )
    // if new stake surpasses current stake quantity then add to list
    if(newBalance >= returnNumber(currentPackage.rows[0].min_stake_quantity)) return [...receivers, account];
  }
  return false;
}

const handleInnerRefunding = async (account, client, receivers, service, provider) => {
  // if account is being listened to
  if(receivers.indexOf(account) != -1) {
    // find 2nd accountext entry, has updated balance every time
    let newAccountextEntry = await fetchAccountextTableByAccountServiceProvider(client, account, service, provider, 999999);

    // convert new balance to number
    let newBalance = returnNumber(newAccountextEntry.rows[0].balance);
    // fetch package min stake quantity
    let currentPackage = await fetchPackage(client, newAccountextEntry.rows[0].pending_package, newAccountextEntry.rows[0].service, newAccountextEntry.rows[0].provider, 9999999 )
    // if new refund bring stake below min stake quantity then remove from list
    // DSP logic handles if unstake package period has already passed
    if(newBalance < returnNumber(currentPackage.rows[0].min_stake_quantity)) return receivers.filter(i => i != account);
  }
  return false;
}

const handleInnerSidechain = async (account, receivers) => {
  // if account is not already being listened to
  if(!(receivers.indexOf(account) != -1)) {
    try {
      const mainnetAccount = await getLinkedAccount(null, null, account, sidechainName);
      const stakers = await fetchStaking();
      if(stakers.indexOf(mainnetAccount) > -1) return [...receivers, account];
      return false;
    } catch(e) {
      logger.error('e')
      logger.error(e)
    }
  }
  return false;
}

const { createClient } = require('@liquidapps/dapp-client');
const getDappClient = async() => {
    return await createClient({ 
        httpEndpoint: nodeosMainnetEndpoint, 
        nodeFetch
    });
};

const handleStakingAction = async (actionName, actionData, blockId, blockNum, receivers) => {
  let account = "";
  if(actionName == "adddsp") {
    // name owner, name dsp
    account = actionData.owner;
    logger.info( `Adddsp [${actionData.owner} - ${actionData.dsp}] @ ${printBlock(blockId, blockNum)}`)
    return await handleInnerSidechain(account, receivers);
  } else if(actionName == "setlink") {
    // name owner, name mainnet_owner
    account = actionData.owner;
    logger.info( `Setlink [${actionData.owner} - ${actionData.mainnet_owner}] @ ${printBlock(blockId, blockNum)}`)
    return await handleInnerSidechain(account, receivers);
  }

  const client = await (await getDappClient()).dappNetwork;
  let service = actionData.service, provider = actionData.provider;
  if(actionName == "stake") {
    account = actionData.from;
    logger.info( `Stake [${actionData.from} ${actionData.quantity}] @ ${printBlock(blockId, blockNum)}`)
    return await handleInnerStaking(account, client, receivers, service, provider);
  } else if(actionName == "staketo") {
    account = actionData.to;
    logger.info( `Staketo [${actionData.from} -> ${actionData.to} ${actionData.quantity}] @ ${printBlock(blockId, blockNum)}`)
    return await handleInnerStaking(account, client, receivers, service, provider);
  } else if(actionName == "refund") {
    account = actionData.to;
    logger.info( `Refund [${actionData.to} @ ${printBlock(blockId, blockNum)}`)
    return await handleInnerRefunding(account, client, receivers, service, provider);
  } else if(actionName == "refundto") {
    account = actionData.to;
    logger.info( `Refundto [${actionData.from} -> ${actionData.to}] @ ${printBlock(blockId, blockNum)}`)
    return await handleInnerRefunding(account, client, receivers, service, provider);
  }
}

const fetchDappServiceXContract = async() => {
  let sisterDappservicexContract = await getTableRowsSec(rpc, dappServicesLiquidXContract, 'chainentry', sidechainName, []);
  return sisterDappservicexContract[0].chain_meta.dappservices_contract;
}

const fetchSidechainStaking = async () => {
  const receiverList = [];
  try {
    let sisterDappservicexContract = await fetchDappServiceXContract();

    const mainnetAccounts = await fetchStaking();
    for(let i = 0; i < mainnetAccounts.length; i++) {
      const mainnetAccountList = await getTableRowsSec(rpc, dappServicesLiquidXContract, 'accountlink', mainnetAccounts[i], []);
      const mainnetAccount = mainnetAccountList.find(el => el.chain_name == sidechainName)
      if(mainnetAccount) {
        const sidechainMapping = await getTableRowsSec(sidechainRpc, sisterDappservicexContract, 'accountlink', mainnetAccount.allowed_account, []);
        if(mainnetAccount.allowed_account == sidechainMapping[0].mainnet_owner) {
          receiverList.push(mainnetAccount.allowed_account);
        }
      }
    }
    return receiverList;
  } catch(e) {
    return [];
  }
  /*

    on start check if chain mapped correctly with chainentry table and use registered dappservicex contract name,
    check if chain contract exists
    check if chain registered in dappservicex:settings table,
    -> check if DSP is properly mapped for chain liquidx.dsp:accountlink (addaccount) and dappservicex:dspentries (adddsp),
    if so, pull entire accountext table, check each account for liquidx.dsp mapping, use that mapped account next allowed_account
    if exists check reverse mapping of dappservicex:accountlink singleton, ensure same account as queried on main chain mapped back
    checked by dappservicex contract -> this is not a thing check DSP authorized by consumer dappservicex:dsp scoped by owner
    if all that's good, then add as a receiver on sidechain

  */
}

const fetchStaking = async () => {
    try {
      const client = await (await getDappClient()).dappNetwork;
      let response;
      response = await fetchAllTableRows(dappServicesContract,"accountext","DAPP");
      let accounts = response.rows
        // check if account staked to this DSP
        .filter(async el => el.provider === sidechainName ? await getLinkedAccount(null, null, process.env.DSP_ACCOUNT, sidechainName) :  process.env.DSP_ACCOUNT)
        // pre check if balance > 0
        .filter(el => returnNumber(el.balance) > 0)
        // check if balance > min_stake_quantity
        // need to do old school for loop
      let newAccounts = [];
      // remove accounts that do not meet min stake amount
      for(let i = 0; i < accounts.length; i++) {
        let providerPackage = await fetchPackage(client, accounts[i].pending_package, accounts[i].service, accounts[i].provider, 9999999 );
        if(providerPackage.rows.length && (returnNumber(accounts[i].balance) >= returnNumber(providerPackage.rows[0].min_stake_quantity))) newAccounts.push(accounts[i])
      }
      // map from array of objects to array of accounts
      newAccounts = newAccounts.map(el => el.account);
      // remove duplicates 
      newAccounts = Array.from(new Set(newAccounts));
        
      if(!newAccounts) logger.warn(`No newAccounts staked to ${process.env.DSP_ACCOUNT}`);
      return newAccounts;
  } catch(e) {
    logger.error('fetchStaking e')
    logger.error(e)
    return [];
  }
}

async function getHeadBlockInfo() {
  const res = await nodeFetch(nodeosUrl + '/v1/chain/get_info', {
    method: 'post',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' },
  })
  const blockInfo = await res.json();
  return blockInfo;
}

const handleEvent = async (txId, receiver, account, method, blockNum, timestamp, blockId, sidechain, data, event, eventNum) => {
  const url = `http://localhost:${process.env.WEBHOOK_DAPP_PORT || 8812}`;
  logger.info(`handling ${txId} ${eventNum} ${receiver} ${account} ${JSON.stringify(event)} ${method}`);
  event.meta = {
    txId,
    blockNum,
    timestamp,
    blockId,
    sidechain,
    eventNum,
    // cbevent
  };
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
}

module.exports = {
  handleEvent,
  handleStakingAction,
  fetchStaking,
  getHeadBlockInfo,
  fetchSidechainStaking,
  fetchDappServiceXContract
}
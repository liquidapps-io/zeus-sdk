const { requireBox } = require('@liquidapps/box-utils');
const { eosDSPEndpoint, getEosForSidechain, paccount, resolveProviderPackage, deserialize, generateABI } = requireBox('dapp-services/services/dapp-services-node/common');
const { loadModels } = requireBox('seed-models/tools/models');
let sha256 = require('js-sha256').sha256;
const ecc = require('eosjs-ecc')
const Fcbuffer = require('fcbuffer')
const logger = requireBox('log-extensions/helpers/logger');

const fetch = require('node-fetch');

function postData(url = ``, data = {}) {
  // Default options are marked with *
  return fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, cors, *same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      // "Content-Type": "application/json",
      // "Content-Type": "application/x-www-form-urlencoded",
    },
    redirect: 'follow', // manual, *follow, error
    referrer: 'no-referrer', // no-referrer, *client
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  })
    .then(async response => {
      let text = await response.text();
      let json = JSON.parse(text);
      if (json.error)
        throw json.error;
      return json;
    }); // parses response to JSON
}

class AuthClient {
  constructor(authContract, chainId, endpoint, sidechain) {
    this.methodSuffix = "authusage";
    this.method = "x" + this.methodSuffix;
    this.authContract = authContract || "authentikeos";
    this.endpoint = endpoint;
    this.useServer = endpoint !== undefined;
    this.chainId = chainId || "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906";
    this.abi = null;
    this.sidechain = sidechain;
  };
  hashData256(data) {
    let hash = sha256.create();
    hash.update(data);
    return hash.hex();
  };
  async auth({ trx, parsedTrx, contract, method }) {

    //  verify single action
    let actions = parsedTrx.actions;
    if (actions.length !== 1) {
      throw new Error('must have only one action in auth transaction');
    }
    let action = actions[0];
    if (action.authorization.length !== 1) {
      throw new Error('must have only one authorization actor in auth transaction');
    }

    // verify contract and method
    let actContract = action.account;
    let actMethod = action.name;
    if (actContract !== contract) {
      throw new Error("wrong auth contract");
    }
    if (actMethod !== method) {
      throw new Error("wrong auth method");
    }
    try {
      // post transaction
      let res = this.sidechain ? await (await getEosForSidechain(this.sidechain)).pushSignedTransaction(trx) : await eosDSPEndpoint.pushSignedTransaction(trx);
      // handle audited transactions (non failing)
      // validate auth from transaction result
    }
    catch (expectedError) {

      // validate auth from transaction result
      if (expectedError.message)
        expectedError = expectedError.message;
      let resMsg = expectedError;
      let parsedMsg = resMsg.split("assertion failure with message: afn:", 2);
      if (parsedMsg.length != 2)
        throw new Error(resMsg);
      let result = parsedMsg[1];
      return result;
    }
    throw new Error("'auth functions' must complete with an exception");
  };

  async validate({ trx, payload }, callback) {
    trx.serializedTransaction = Object.values(trx.serializedTransaction);
    let parsedTrx = this.sidechain ? await (await getEosForSidechain(this.sidechain)).deserializeTransactionWithActions(trx.serializedTransaction) : await eosDSPEndpoint.deserializeTransactionWithActions(trx.serializedTransaction);
    let actions = parsedTrx.actions;
    let action = actions[0];
    let authorization = action.authorization[0];
    let account = authorization.actor;
    let permission = authorization.permission;
    let calculatedSignature = this.hashData256(payload);
    let contract = this.authContract;

    let actionData = action.data;

    let { payload_hash } = actionData;
    // verify dataSignature == calculatedSignature
    if (calculatedSignature.toLowerCase() !== payload_hash.toLowerCase())
      throw new Error('hash does not match: ' + calculatedSignature);

    // invoke auth call
    let authRes = await this.auth({
      trx,
      contract,
      parsedTrx,
      method: this.method
    });
    if (authRes !== "true")
      throw new Error("auth failed");
    return await callback({ payload, account, permission });
  };

  async createAPICallTransaction(contract, method, account, permission, actionData, ttl, keys) {
    let opts = {
      authorization: `${account}@${permission}`,
      broadcast: false,
      sign: true,
      keyProvider: [keys.active.privateKey]
    };
    let theContract = this.sidechain ? await (await getEosForSidechain(this.sidechain)).contract(contract) : await eosDSPEndpoint.contract(contract);

    let trx = await theContract[method](actionData, opts);
    return trx;

  };

  async invokeAuthedCall({
    payload,
    account,
    permission = "api",
    keys,
    contract,
    action = 'auth_account_call',
    service = 'authfndspsvc',
  }) {
    let payloadStr = JSON.stringify(payload);
    let payload_hash = this.hashData256(payloadStr);
    let ttl = 120;
    let signature = '';
    let actionData = {
      account,
      permission,
      payload_hash,
      client_code:'',
      signature,
      current_provider: "",
      "package": ""
    }
    contract = contract || this.authContract;
    let trx = await this.createAPICallTransaction(contract, this.method, account, permission, actionData, ttl, keys);
    if (!this.useServer)
      throw new Error('not supported yet')
    // to a test api
    return postData(`${this.endpoint}/v1/dsp/${service}/${action}`, {
      trx,
      payload: payloadStr
    });
  };
}

module.exports = AuthClient;

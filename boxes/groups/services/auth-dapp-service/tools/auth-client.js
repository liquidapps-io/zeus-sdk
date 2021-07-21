const { requireBox } = require('@liquidapps/box-utils');
const { eosDSPEndpoint, getEosForSidechain, paccount, resolveProviderPackage, deserialize, generateABI } = requireBox('dapp-services/services/dapp-services-node/common');
const { loadModels } = requireBox('seed-models/tools/models');
var sha256 = require('js-sha256').sha256;
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
      var text = await response.text();
      var json = JSON.parse(text);
      if (json.error)
        throw new Error(`server error: ${JSON.stringify(json.error)}`);
      return json;
    }); // parses response to JSON
}

class AuthClient {
  constructor(apiID, authContract, chainId, endpoint, sidechain) {
    this.methodSuffix = "authusage";
    this.method = "x" + this.methodSuffix;
    this.authContract = authContract;
    this.apiID = apiID;
    this.endpoint = endpoint;
    this.useServer = endpoint !== undefined;
    this.chainId = chainId || "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906";
    this.abi = null;
    this.sidechain = sidechain;
  };
  hashData256(data) {
    var hash = sha256.create();
    hash.update(data);
    return hash.hex();
  };

  async validateSignature(trx, pk, signature) {
    // const eos = Eos({ defaults: true })
    const { structs, types } = this.sidechain ? await getEosForSidechain(this.sidechain).fc : eosDSPEndpoint.fc;
    var Transaction = structs.transaction;
    // const writeApi = WriteApi(Network, network, config, structs.transaction)
    // const txObject = Transaction.fromObject(trx.transaction.transaction)
    const txObject = Transaction.fromObject(trx.transaction.transaction)
    const buf = Fcbuffer.toBuffer(Transaction, txObject)
    txObject.actions[0].data = trx.transaction.transaction.actions[0].data;
    const chainIdBuf = Buffer.from(this.chainId, 'hex')
    const packedContextFreeData = Buffer.from(new Uint8Array(32))
    const signBuf = Buffer.concat([chainIdBuf, buf, packedContextFreeData])
    const pubkey = ecc.recover(signature, signBuf)
    if (pubkey !== pk)
      throw new Error('wrong signature');
  };
  async getActionData(actionData, method, contract) {
    if (!this.abi) {
      var loadedExtensions = await loadModels("dapp-services");
      var service = loadedExtensions.find(a => a.name == "auth");
      this.abi = generateABI(service);
      var struct = this.abi.find(a => a.name == this.methodSuffix);
      struct.fields.unshift({
        "name": "package",
        "type": "name"
      });
      struct.fields.unshift({
        "name": "current_provider",
        "type": "name"
      });
      this.sidechain ? await (await getEosForSidechain(this.sidechain)).contract(contract) : await eosDSPEndpoint.contract(contract);
    }

    var hexData = actionData;
    return deserialize(this.abi, hexData, this.methodSuffix, "hex");
  }
  async auth({ trx, max_ttl, parsedTrx, contract, method }) {

    //  verify single action
    var actions = parsedTrx.actions;
    if (actions.length !== 1) {
      throw new Error('must have only one action in auth transaction');
    }
    var action = actions[0];
    if (action.authorization.length !== 1) {
      throw new Error('must have only one authorization actor in auth transaction');
    }
    var authorization = action.authorization[0];

    var expiry = parsedTrx.expiration;
    if (false) { // expiry > now + ttl*1000
      // todo: verify transaction expiration time is not more than max_ttl
    }

    // verify contract and method
    var actContract = action.account;
    var actMethod = action.name;
    if (actContract !== contract) {
      throw new Error("wrong auth contract");
    }
    if (actMethod !== method) {
      throw new Error("wrong auth method");
    }
    var account = authorization.actor;
    var permission = authorization.permission;
    // var actionData = await this.getActionData(action.data, method, actContract);
    var actionData = action.data;

    if (await this.isFake(account)) {
      var clientCode = actionData.client_code;
      var clientData = await this.getClientCodeData({ clientCode });
      // extract public key

      // validate public_key is valid and transaction is signed correctly
      await this.validateSignature(parsedTrx, clientData.pk, trx.signatures[0]);
      return "true";
    }
    try {
      // post transaction
      var res = this.sidechain ? await (await getEosForSidechain(this.sidechain)).pushSignedTransaction(trx) : await eosDSPEndpoint.pushSignedTransaction(trx);
      // handle audited transactions (non failing)
      // validate auth from transaction result
    }
    catch (expectedError) {

      // validate auth from transaction result
      if (expectedError.message)
        expectedError = expectedError.message;
      var resMsg = expectedError;
      var parsedMsg = resMsg.split("assertion failure with message: afn:", 2);
      if (parsedMsg.length != 2)
        throw new Error(resMsg);
      var result = parsedMsg[1];
      return result;
    }
    throw new Error("'auth functions' must complete with an exception");
  };

  async addClientCode({ clientCode }) {
    // write clientcode hash on chain?
    // configurable delay.

  }

  async getClientCodeData({ clientCode }) {
    // extract params from clientcode
    if (!clientCode)
      return {};
    var parts = clientCode.split(";");
    var res = {
      id: clientCode
    };
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      var kv = part.split('=');
      res[kv[0]] = kv[1];
    }
    return res;
  }
  // const addPermissions = async({ clientCode, permissionsCode }) => {}
  async checkPermissions({ clientCode, permissionCode }) {
    return true;
  }

  async getNewClientCode({ req, publickey }) {
    return `name=clientcode1;ip=1.2.3.4;apiID=${this.apiID}` + (publickey ? `;pk=${publickey}` : "");
  }

  async isFake(account) {
    return (account === "............");
  };

  async validate({ req, trx, payload, allowClientSide, sidechain }, callback) {
    trx.serializedTransaction = Object.values(trx.serializedTransaction);
    var parsedTrx = this.sidechain ? await (await getEosForSidechain(this.sidechain)).deserializeTransactionWithActions(trx.serializedTransaction) : await eosDSPEndpoint.deserializeTransactionWithActions(trx.serializedTransaction);
    var actions = parsedTrx.actions;
    var action = actions[0];
    var authorization = action.authorization[0];
    var account = authorization.actor;
    var permission = authorization.permission;
    var calculatedSignature = this.hashData256(payload);
    var contract = this.authContract;

    // var actionData = await this.getActionData(action.data, this.method, contract);
    var actionData = action.data;

    var { payload_hash, client_code } = actionData;
    // verify dataSignature == calculatedSignature
    if (calculatedSignature.toLowerCase() !== payload_hash.toLowerCase())
      throw new Error('hash does not match: ' + calculatedSignature);
    var clientData = await this.getClientCodeData({ clientCode: client_code });
    // validate client code exists + on chain?

    if (!clientData) {
      throw new Error('does not exist');
    }

    // verify request params (ip, cookie, publickey, account+permission, etc)
    // const ip = undefined; //todo: extract from req
    // if (clientData.ip != ip) {
    //   throw new Error('ip mismatch ' + clientData.ip);

    // }

    // throttle/block

    // verify client_code is from this API (by uuid)
    // if (clientData.apiID != this.apiID) {
    //   throw new Error('wrong apiID');
    // }
    // todo: validate clientCode didnt expire

    var max_ttl = 10;
    if (await this.isFake(account) && !allowClientSide)
      throw new Error('anonymous actions not allowed');

    // invoke auth call
    var authRes = await this.auth({
      trx,
      max_ttl,
      contract,
      parsedTrx,
      method: this.method
    });
    if (authRes !== "true")
      throw new Error("auth failed");
    return await callback({ payload, clientCode: client_code, account, permission });
  };
  async getClientCodeFromServer({ publickey, service = 'authfndspsvc' }) {
    return (await postData(`${this.endpoint}/v1/dsp/${service}/code`, { publickey })).code;
  };

  async createAPICallTransaction(contract, method, account, permission, actionData, ttl, keys) {
    var opts = {
      authorization: `${account}@${permission}`,
      broadcast: false,
      sign: true,
      keyProvider: [keys.active.privateKey]
    };
    var theContract = this.sidechain ? await (await getEosForSidechain(this.sidechain)).contract(contract) : await eosDSPEndpoint.contract(contract);

    // if (account == "............") {
      // fake
    // }

    var trx = await theContract[method](actionData, opts);
    return trx;

  };
  async sign(hash, account, keys, ttl, clientCode) {
    return "";
  };


  async invokeClientAuthedCall({
    payload,
    permission = "api",
    keys,
    action = 'auth_call'
  }) {
    // generate public key: publickey
    return this.invokeAuthedCall({
      payload,
      account: "............",
      permission,
      keys,
      action
    })
  };

  async invokeAuthedCall({
    payload,
    account,
    permission = "api",
    keys,
    contract,
    action = 'auth_account_call',
    service = 'authfndspsvc',
    skipClientCode = false,
    skipAdditionalSig = false
  }) {

    var payloadStr = JSON.stringify(payload);
    var payload_hash = this.hashData256(payloadStr);
    var ttl = 120;
    var opts = {};
    if (account === "............")
      opts.publickey = keys.publicKey;
    let clientCode = '';
    if (!skipClientCode)
      clientCode = await this.getClientCodeFromServer({ publicKey: opts.publickey });
    let signature = '';
    if (!skipAdditionalSig)
      signature = await this.sign(payload_hash, account, keys, ttl, clientCode);
    var actionData = {
      account,
      permission,
      payload_hash,
      client_code: clientCode,
      signature,
      current_provider: "",
      "package": ""
    }
    contract = contract || this.authContract;
    var trx = await this.createAPICallTransaction(contract, this.method, account, permission, actionData, ttl, keys);
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

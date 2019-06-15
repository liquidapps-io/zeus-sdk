var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, paccount, resolveProviderPackage, deserialize, generateABI } = require('../dapp-services-node/common');
const { getCreateKeys } = require('../../extensions/tools/eos/utils');
const { loadModels } = require("../../extensions/tools/models");
var sha256 = require('js-sha256').sha256;
const ecc = require('eosjs-ecc')
const Fcbuffer = require('fcbuffer')
const Eos = require('eosjs')


const hashData256 = (data) => {
  var hash = sha256.create();
  hash.update(data);
  return hash.hex();
};
var methodSuffix = "authusage";
var method = "x" + methodSuffix;

let abi = null;

const validateSignature = async(trx, pk, signature) => {
  console.log("trx", trx);
  // const eos = Eos({ defaults: true })
  const { structs, types } = eosDSPGateway.fc
  var Transaction = structs.transaction;
  // const writeApi = WriteApi(Network, network, config, structs.transaction)
  // const txObject = Transaction.fromObject(trx.transaction.transaction)
  const txObject = Transaction.fromObject(trx.transaction.transaction)
  const buf = Fcbuffer.toBuffer(Transaction, txObject)
  txObject.actions[0].data = trx.transaction.transaction.actions[0].data;
  const chainIdBuf = Buffer.from("aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906", 'hex')
  const packedContextFreeData = Buffer.from(new Uint8Array(32))
  const signBuf = Buffer.concat([chainIdBuf, buf, packedContextFreeData])
  const pubkey = ecc.recover(signature, signBuf)
  if (pubkey !== pk)
    throw new Error('wrong signature');
}
const getActionData = async(actionData, method, contract) => {
  if (!abi) {
    var loadedExtensions = await loadModels("dapp-services");
    var service = loadedExtensions.find(a => a.name == "auth");
    abi = generateABI(service);
    var struct = abi.find(a => a.name == methodSuffix);
    struct.fields.unshift({
      "name": "package",
      "type": "name"
    });
    struct.fields.unshift({
      "name": "current_provider",
      "type": "name"
    });
    await eosDSPGateway.contract(contract);
  }

  var hexData = actionData;
  return deserialize(abi, hexData, methodSuffix, "hex");
}
const auth = async({ trx, max_ttl, contract, method }) => {

  //  verify single action
  var actions = trx.transaction.transaction.actions;
  if (actions.length !== 1) {
    throw new Error('must have only one action in auth transaction');
  }
  var action = actions[0];
  if (action.authorization.length !== 1) {
    throw new Error('must have only one authorization actor in auth transaction');
  }
  var authorization = action.authorization[0];

  var expiry = trx.transaction.transaction.expiration;
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
  var actionData = await getActionData(action.data, method, actContract);

  if (await isFake(account)) {
    var clientCode = actionData.client_code;
    var clientData = await getClientCodeData({ clientCode });
    // extract public key

    // validate public_key is valid and transaction is signed correctly
    await validateSignature(trx, clientData.pk, trx.transaction.signatures[0]);
    return "true";
  }
  try {
    // post transaction
    await eosDSPGateway.pushTransaction(trx.transaction)
    // validate auth from transaction result
  }
  catch (expectedError) {
    if (expectedError.message)
      expectedError = expectedError.message;

    if (typeof expectedError === "string") {
      expectedError = JSON.parse(expectedError);
    }
    console.log("expectedError", expectedError.error.details);
    var resMsg = expectedError.error.details[0].message;
    var parsedMsg = resMsg.split("assertion failure with message: afn:", 2);
    if (parsedMsg.length != 2)
      throw new Error(resMsg);
    var result = parsedMsg[1];
    console.log("result", result);
    return result;
  }
  throw new Error("'auth functions' must complete with an exception");
};

const addClientCode = async({ clientCode }) => {
  // write clientcode hash on chain?

}

const getClientCodeData = async({ clientCode }) => {
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
const checkPermissions = async({ clientCode, permissionCode }) => {
  return true;
}

const getNewClientCode = async({ req, publickey, apiID }) => {
  return `name=clientcode1;ip=1.2.3.4;apiID=${apiID}` + (publickey ? `;pk=${publickey}` : "");
}
const isFake = async(account) => {
  return (account === "............");
}

const validate = async({ req, trx, payload, allowClientSide, authContract }, callback) => {
  var actions = trx.transaction.transaction.actions;
  var action = actions[0];
  var authorization = action.authorization[0];

  var account = authorization.actor;

  var permission = authorization.permission;

  var calculatedSignature = hashData256(payload);
  var contract = authContract;


  // todo: extract from trx
  var actionData = await getActionData(action.data, method, contract);

  var { payload_hash, client_code } = actionData;
  // verify dataSignature == calculatedSignature
  if (calculatedSignature.toLowerCase() !== payload_hash.toLowerCase())
    throw new Error('hash does not match: ' + calculatedSignature);

  var clientData = await getClientCodeData({ clientCode: client_code });
  // validate client code exists + on chain?

  if (!clientData) {
    throw new Error('does not exist');
  }

  // verify request params (ip, cookie, publickey, account+permission, etc)
  const ip = "1.2.3.4"; //todo: extract from req
  if (clientData.ip != ip) {
    throw new Error('ip mismatch');

  }

  // throttle/block

  // verify client_code is from this API (by uuid)
  if (clientData.apiID != apiID) {
    throw new Error('wrong apiID');
  }
  // todo: validate clientCode didnt expire

  var max_ttl = 10;
  if (await isFake(account) && !allowClientSide)
    throw new Error('anonymous actions not allowed');

  // invoke auth call 
  var authRes = await auth({
    trx,
    max_ttl,
    contract,
    method
  });
  if (authRes !== "true")
    throw new Error("auth failed");

  return await callback({ payload, clientCode: client_code, account, permission });
};
var apiID = "testAPI";

// todo: periodically call "usage" 
// todo: add multisig signature from DSP

nodeFactory('auth', {

  api: {
    code: async({ req, body }, res) => {
      var { publickey } = body;
      var permissionCodes = ["testperms"];
      const clientCode = await getNewClientCode({ req, publickey, apiID });
      await addClientCode({ clientCode, permissionCodes });
      // configurable delay.

      res.send(JSON.stringify({ code: clientCode }));

    },
    test: async({ req, body }, res) => {
      try {
        await validate({ ...body, req, allowClientSide: false, authContract: "authenticato" }, async({ clientCode, payload, account, permission }) => {
          var hasPermissions = await checkPermissions({ clientCode, permissionCode: "testperms" });
          if (!hasPermissions) {
            res.status(400);
            res.send(JSON.stringify({ error: "permissions error" }));
            return;
          }
          var testnum = JSON.parse(payload).testnum;
          var result = `hello-${testnum}-${account}@${permission}`;
          res.send(JSON.stringify({ result, account, permission }));
        });
      }
      catch (e) {
        res.status(400);
        console.error("error:", e);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    },
    test_anon: async({ req, body }, res) => {
      try {
        await validate({ ...body, req, allowClientSide: true, authContract: "authenticato" }, async({ clientCode, payload, account, permission }) => {
          var hasPermissions = await checkPermissions({ clientCode, permissionCode: "testperms" });
          if (!hasPermissions) {
            res.status(400);
            res.send(JSON.stringify({ error: "permissions error" }));
            return;
          }
          var testnum = JSON.parse(payload).testnum;
          var result = `hello-${testnum}-${account}@${permission}`;
          res.send(JSON.stringify({ result, account, permission }));
        });
      }
      catch (e) {
        res.status(400);
        console.error("error:", e);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    }
    // auth: async({ body }, res) => {
    //   var authRes = await auth(body);
    //   // res.send
    // }
  }
});

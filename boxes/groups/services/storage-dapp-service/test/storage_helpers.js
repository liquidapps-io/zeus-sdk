import { TextDecoder, TextEncoder } from "text-encoding";
const { BigNumber } = require("bignumber.js");
const getDefaultArgs = require("../extensions/helpers/getDefaultArgs");
const fetch = require("node-fetch");
const ecc = require("eosjs-ecc");
let { PrivateKey, PublicKey } = require("eosjs-ecc");
const eosjs2 = require("eosjs");
const { JsonRpc, Api, Serialize } = eosjs2;
const { JsSignatureProvider } = require("eosjs/dist/eosjs-jssig");
const {
  getUrl,
  getLocalDSPEos,
  getCreateKeys
} = require("../extensions/tools/eos/utils");
const { readVRAMData } = require("../extensions/tools/eos/dapp-services");
const { encodeName } = require("../services/dapp-services-node/common");

const url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });

const initHelpers = ({ endpoint }) => {
  const postData = (url = ``, data = {}) => {
    // Default options are marked with *
    return fetch(url, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, cors, *same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "same-origin", // include, *same-origin, omit
      headers: {
        // "Content-Type": "application/json",
        // "Content-Type": "application/x-www-form-urlencoded",
      },
      redirect: "follow", // manual, *follow, error
      referrer: "no-referrer", // no-referrer, *client
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    }).then(response => response.json()); // parses response to JSON
  };

  const postVirtualTx = ({ contract_code, payload, wif }, signature) => {
    if (!signature) signature = ecc.sign(Buffer.from(payload, "hex"), wif);
    const public_key = PrivateKey.fromString(wif)
      .toPublic()
      .toString();
    return postData(`${endpoint}/v1/dsp/accountless1/push_action`, {
      contract_code,
      public_key,
      payload,
      signature
    });
  };

  const toBound = (numStr, bytes) =>
    `${(new Array(bytes * 2 + 1).join("0") + numStr)
      .substring(numStr.length)
      .toUpperCase()}`;

  const runTrx = async ({ nonce = 0, contract_code, payload, wif }) => {
    let dataPayload = payload.data.payload;
    const vAccountUsed =
      dataPayload.vaccount ||
      dataPayload.username ||
      dataPayload.from;
    if (!vAccountUsed)
      console.warn(
        `Could not determine the vAccount used to sign the transaction "${payload.name}" to get the nonce.`
      );

    const chainId = (await rpc.get_info()).chain_id;

    const signatureProvider = new JsSignatureProvider([]);
    const api = new Api({
      rpc,
      signatureProvider,
      // chainId:"",
      textDecoder: new TextDecoder(),
      textEncoder: new TextEncoder()
    });

    let buffer = new Serialize.SerialBuffer({
      textDecoder: new TextDecoder(),
      textEncoder: new TextEncoder()
    });

    const expiry = Math.floor(Date.now() / 1000) + 120; //two minute expiry
    buffer.pushNumberAsUint64(expiry);

    if (vAccountUsed) {
      try {
        const tableRes = await readVRAMData({
          contract: contract_code,
          key: vAccountUsed,
          table: "vkey",
          scope: contract_code
        });
        nonce = tableRes.row.nonce;
      } catch (e) {
        nonce = 0;
      }
    }

    buffer.pushNumberAsUint64(nonce);

    let buf1 = buffer.getUint8Array(8);
    let buf2 = buffer.getUint8Array(8);
    let header =
      Serialize.arrayToHex(buf1) + Serialize.arrayToHex(buf2) + chainId;

    const response = await api.serializeActions([
      {
        account: contract_code,
        name: payload.name,
        authorization: [],
        data: payload.data
      }
    ]);
    const toName = name => {
      let res = new BigNumber(encodeName(name, true));
      res = toBound(res.toString(16), 8);
      return res;
    };

    buffer.pushVaruint32(response[0].data.length / 2);
    let varuintBytes = [];
    while (buffer.haveReadData()) varuintBytes.push(buffer.get());
    const serializedDataWithLength =
      Serialize.arrayToHex(varuintBytes) + response[0].data;

    // payloadSerialized corresponds to the actual vAccount action (like regaccount) https://github.com/liquidapps-io/zeus-sdk/blob/a3041e9177ffe4375fd8b944f4a10f74a447e406/boxes/groups/services/vaccounts-dapp-service/contracts/eos/dappservices/_vaccounts_impl.hpp#L50-L60
    // and is used as xvexec's payload vector<char>: https://github.com/liquidapps-io/zeus-sdk/blob/4e79122e42eeab50cf633097342b9c1fa00960c6/boxes/groups/services/vaccounts-dapp-service/services/vaccounts-dapp-service-node/index.js#L30
    // eosio::action fields to serialize https://github.com/EOSIO/eosio.cdt/blob/master/libraries/eosiolib/action.hpp#L194-L221
    const actionSerialized =
      "0000000000000000" + // account_name
      toName(payload.name) + // action_name
      // std::vector<permission_level> authorization https://github.com/EOSIO/eosio.cdt/blob/master/libraries/eosiolib/action.hpp#L107-L155
      "00" +
      // std::vector<char> data;
      serializedDataWithLength;

    const payloadSerialized = header + actionSerialized;

    const trxResult = await postVirtualTx({
      contract_code: contract_code,
      wif,
      payload: payloadSerialized
    });

    if (trxResult.error)
      throw new Error(
        `Error in vaccount transaction (${payload.name}): ${JSON.stringify(
          trxResult.error.details[0]
        )}`
      );

    return trxResult.result;
  };

  return {
    runTrx,
    rpc,
  };
};

module.exports = initHelpers;

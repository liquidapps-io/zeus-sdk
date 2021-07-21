const { requireBox } = require('@liquidapps/box-utils');

const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');
const { deserialize } = requireBox('dapp-services/services/dapp-services-node/common');

const actionStruct = {
  "name": "action_struct", "base": "", "fields": [{ "name": "account", "type": "name" }, { "name": "action_name", "type": "name" }, { "name": "authorization", "type": "bytes[]" }, { "name": "action_data", "type": "bytes" }]
}

const payloadStruct = {
  "name": "unpacked_payload", "base": "", "fields": [{ "name": "expiry", "type": "uint64" }, { "name": "nonce", "type": "uint64" }, { "name": "chainid", "type": "checksum256" }, { "name": "action", "type": "action_struct" }]
}

const requiredStructExtensions = [
  actionStruct,
  payloadStruct,
]

async function deserializeVactionPayload(account, payload, nodeosEndpoint, encoding = "hex") {
  const eos = getEosWrapper({ httpEndpoint: nodeosEndpoint });
  const abi = await eos.getAbi(account);
  const abiStructs = [...abi.structs, ...requiredStructExtensions];
  const data = Buffer.from(payload, encoding);

  const desPayload = deserialize(abiStructs, data, "unpacked_payload");
  //console.log(JSON.stringify(desPayload))
  const vActionName = desPayload.action.action_name;
  const vActionData = Buffer.from(desPayload.action.action_data, "hex");
  const vActionStruct = (abi.actions.find(a => a.name === vActionName)).type;

  const desVaccAction = deserialize(abiStructs, vActionData, vActionStruct);
  //console.log(JSON.stringify(desVaccAction))

  return { payload: desPayload, deserializedAction: desVaccAction };
}

module.exports = {
  deserializeVactionPayload
}
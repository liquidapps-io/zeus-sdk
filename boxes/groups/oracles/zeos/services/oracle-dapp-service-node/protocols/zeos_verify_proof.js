var zeos = require('./zeos.js');
const fetch = require("node-fetch");
global.fetch = fetch;

// TODO: might require: npm i --save @liquidapps/dapp-client.
const { createClient } = require('@liquidapps/dapp-client');

module.exports = async ({ proto, address }) => {
  // zeos_verify_proof://  

  // split address to extract parameters
  const payloadParts = address.split('/');
  let idx = 0;
  var vk_code = payloadParts[idx++];
  var vk_id = payloadParts[idx++];
  var proof_str = payloadParts[idx++];
  var inputs_str = payloadParts[idx++];

  // fetch verifier key from vram
  // TODO: for zeus use port 13015, for live environment on DSPs use port 3115
  let dappClient = await createClient({ httpEndpoint: "http://localhost:3115", fetch });
  let vramClient = await dappClient.service("ipfs", "thezeostoken");
  var response = await vramClient.get_vram_row("thezeostoken", vk_code, "verifierkey", vk_id);
  var vk_str = response.row.vk;

  var res;
  await zeos().then((instance) => {
    var vk_ptr = instance.allocate(instance.intArrayFromString(vk_str), instance.ALLOC_NORMAL);
    var proof_ptr = instance.allocate(instance.intArrayFromString(proof_str), instance.ALLOC_NORMAL);
    var inputs_ptr = instance.allocate(instance.intArrayFromString(inputs_str), instance.ALLOC_NORMAL);

    res = instance._verify_proof(vk_ptr, proof_ptr, inputs_ptr);
  }); 

  if(res)
  {
    res = "1";
  }
  else
  {
    res = "0";
  }

  return new Buffer(res, "utf-8");
};
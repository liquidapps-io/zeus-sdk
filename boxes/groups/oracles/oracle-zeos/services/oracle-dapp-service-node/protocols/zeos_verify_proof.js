const zeos = import('./pkg/zeos_verifier.js');

const fetch = require("node-fetch");
global.fetch = fetch;

// TODO: might require: npm i --save @liquidapps/dapp-client.
const { createClient } = require('@liquidapps/dapp-client');

// Convert a hex string to a byte array
function hex2Bytes(hex)
{
  for(var bytes = [], c = 0; c < hex.length; c += 2)
      bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

module.exports = async ({ proto, address }) => {
  // Format:
  // zeos_verify_proof://halo2|groth16/thezeostoken/testkeyzeos1/[..]/[..]
  //        proto       |             address
  
  // split address to extract parameters
  const payloadParts = address.split('/');
  let idx = 0;
  var type = payloadParts[idx++];       // 'groth16' or 'halo2'
  var vk_code = payloadParts[idx++];
  var vk_id = payloadParts[idx++];
  var proof_str = payloadParts[idx++];
  var inputs_str = payloadParts[idx++];
  
  // fetch verifier key from vram
  // TODO: for zeus use port 13015, for live environment on DSPs use port 3115
  let dappClient = await createClient({ httpEndpoint: "http://localhost:13015", fetch });
  let vramClient = await dappClient.service("ipfs", "thezeostoken");
  var response = await vramClient.get_vram_row("thezeostoken", vk_code, "vk", vk_id);
  var vk_str = response.row.vk;
  
  var res = false;
  await zeos.then(m => {
    switch(type)
    {
      case "halo2":
        res = m.verify_halo2_proof(hex2Bytes(proof_str), hex2Bytes(inputs_str), hex2Bytes(vk_str));
        break;

      case "groth16":
        res = m.verify_groth16_proof(hex2Bytes(proof_str), hex2Bytes(inputs_str), hex2Bytes(vk_str));
        break;

      default:
        res = false;
        break;
    }
  }).catch(console.error);

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

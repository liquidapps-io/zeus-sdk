const zeos = require('../services/oracle-dapp-service-node/protocols/pkg/index.node');

const fetch = require("node-fetch");
global.fetch = fetch;

module.exports = async ({ proto, address }) => {

  // split address to extract parameters
  const payloadParts = address.split('/');
  let idx = 0;
  var type = payloadParts[idx++]; // 'groth16' or 'halo2' or 'zeos'
  var vk_ipfs_uri = payloadParts[idx++];
  var proof_str = payloadParts[idx++];
  var inputs_str = payloadParts[idx++];

  // fetch verifier key from liquid storage
  // TODO: for zeus use port 13015, for live environment on DSPs use port 3115
  //process.env.DSP_PORT = 13015;
  const response = await fetch(`http://localhost:${process.env.DSP_PORT || 3115}` + '/v1/dsp/liquidstorag/get_uri', {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify({ uri: 'ipfs://' + vk_ipfs_uri })
  });
  const resJson = await response.json();
  var vk_str = Buffer.from(resJson.data, 'base64').toString();
  
  // fetch proof from liquid storage if it is not passed inline
  if(proof_str.substr(0, 1) == "z")
  {
    const _response = await fetch(`http://localhost:${process.env.DSP_PORT || 3115}` + '/v1/dsp/liquidstorag/get_uri', {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({ uri: 'ipfs://' + proof_str })
    });
    const _resJson = await _response.json();
    proof_str = Buffer.from(_resJson.data, 'base64').toString();
  }

  var res = false;
  try {
    switch(type)
    {
      case "halo2":
        res = zeos.verify_halo2_proof(proof_str, inputs_str, vk_str);
        break;

      case "groth16":
        res = zeos.verify_groth16_proof(proof_str, inputs_str, vk_str);
        break;

      case "zeos":
        res = zeos.verify_zeos_proof(proof_str, inputs_str, vk_str);
        break;

      default:
        res = false;
        break;
    }
  } catch(error) {
    console.log(error);
    res = false;
  };

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

const { requireBox } = require('@liquidapps/box-utils');
const Web3 = require('web3');
const { Serialize } = require('eosjs');
const logger = requireBox('log-extensions/helpers/logger');
const { saveToIPFS } = requireBox('storage-dapp-service/services/storage-dapp-service-node/common');
const { eosMainnet, getEosForSidechain } = requireBox('dapp-services/services/dapp-services-node/common');
const { TextEncoder, TextDecoder } = require('util'); 

const web3MainnetProvider = process.env.EVM_ENDPOINT || 'http://localhost:8545';

// {"inputs":[{"internalType":"uint64","name":"","type":"uint64"}],"name":"foreign_messages","outputs":[{"internalType":"bytes","name":"message","type":"bytes"}],"stateMutability":"view","type":"function"}

const getEndpoint = (chainId) => {
  const endpoints = {
    "1": web3MainnetProvider, // for mainnet, should be env var
    "ropsten": "", //TODO: add ropsten endpoint here
    "evmlocal": "http://localhost:8545",
    "evmlocalsidechain": "http://localhost:8546",
    "bsc": "https://bsc-dataseed1.binance.org:443",
    "bsctest": "https://data-seed-prebsc-1-s1.binance.org:8545"
  }
  return endpoints[chainId];
}

module.exports = async ({ proto, address, sidechain, contract }) => {
  // eth_contract_call://chain_id/eth_address/{method_name:string,input_type:type,outputs:[{name:string,type:type},...]}/input/eosio_struct_name
  // currently only supporting single mapping, not mapping => mapping
  // also note query is rather complex since it requires passing in mapping definition
  // since eth abis are not on chain
  const parts = address.split('/');
  let partIds = 0;
  const chainId = parts[partIds++];
  const ethAddress = parts[partIds++];
  const abiDef = parts[partIds++];
  const input = parts[partIds++];
  const typeName = parts[partIds++];

  const web3Provider = getEndpoint(chainId);
  if (!web3Provider) throw new Error (`endpoint not found for chain id ${chainId}`);
  const web3 = new Web3(web3Provider);

  let abi;
  try {
    abi = JSON.parse(abiDef);
  } catch (e) {
    logger.error(`Error in eth_contract_mapping while trying to parse abi def. ${address}`);
    throw new Error(`Unable to parse Ethereum ABI from oracle URI. ${address}`);
  }

  const inputType = abi.input_type;
  const methodName = abi.method_name;
  const mappingOutputs = abi.outputs.map(output => ({
    internalType: output.type, 
    type: output.type, 
    name: output.name, 
  }));
  const contractAbi = [{
    inputs: [{
      internalType: inputType, 
      type: inputType, 
      name: "" 
    }],        
    name: methodName,
    outputs: mappingOutputs,
    type: "function",
    stateMutability:"view",
  }];

  const contractEth = new web3.eth.Contract(contractAbi, ethAddress);

  //prepare for EOSIO serialization
  const eos = sidechain ? await getEosForSidechain(sidechain) : await eosMainnet();
  const eosAbi = await eos.getAbi(contract);
  let buf = new Serialize.SerialBuffer({textDecoder: new TextDecoder(), textEncoder: new TextEncoder()});
  let localTypes = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), eosAbi);
  let thisType = localTypes.get(typeName);
  // logger.debug("\n\nETH->EOS REQUESTED TYPE: %j",thisType);

  try{
    const result = await contractEth.methods[methodName](input).call();
    if(result.data === null) {
      // no data, e.g. Error: missing message_payload.data (type=bytes)
      // return
      return;
    }
    //if(result[0] == null) throw new Error(`No value for the provided input of: ${input}`);
    // logger.debug("\n\nETH TABLE RESULT: %j", result);
    let obj = {};
    thisType.fields.map(x => {
      let value = result[x.name];
      if(value !== null) {
        try {
          value = value.replace("0x","");
        } catch(e) {}
        obj[x.name] = value;
      }
    })
    // logger.debug("\n\nEOS OUT RESULT: %j", obj);
    thisType.serialize(buf, obj);
    let res = Buffer.from(buf.getUint8Array(buf.length));
    // logger.debug("\n\nORACLE RESULT: %j", res);
    return res;
  } catch(e) {
    logger.error(`Error fetching value: %s`, e);    
    throw e;
  }  
}
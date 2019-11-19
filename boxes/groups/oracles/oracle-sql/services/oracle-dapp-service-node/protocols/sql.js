const Sequelize = require('sequelize');
const eosjs2 = require('eosjs');
const { TextDecoder, TextEncoder } = require('text-encoding');
const { Serialize, JsonRpc } = eosjs2;
const logger = require('../../../extensions/helpers/logger');
const { eosDSPGateway, paccount, resolveProviderPackage, deserialize, generateABI, nodeosEndpoint } = require('../../dapp-services-node/common');

const fullabi = (abi) => {
  return {
    'version': 'eosio::abi/1.0',
    'structs': abi
  };
};

module.exports = async({ proto, address, sidechain, contract }) => {
  // sql://query
  var dbContractName = contract;
  if (sidechain)
    dbContractName = `${sidechain}-${contract}`
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: `dbs/${paccount}-${dbContractName}.sqlite`,
    query: { raw: true }
  });
  await sequelize.authenticate();


  const addressParts = address.split('/');
  let idx = 0;
  let queryEncoded = addressParts[idx++];
  let query = (new Buffer(queryEncoded, 'base64')).toString();
  // run query
  let results = await sequelize.query(query, { raw: true });
  logger.debug(`running query ${query} ${JSON.stringify(results)}`);
  let values = [];
  if (results[0])
    values = results[0].map(result => { return { data: Object.values(result) } });
  // array of array of chars
  var commandName = '_tmp';
  var abi = [{
    'name': commandName,
    'base': '',
    'fields': [{
      name: 'data',
      type: 'row[]'
    }]
  }, {
    'name': 'row',
    'base': '',
    'fields': [{
      name: 'data',
      type: 'string[]'
    }]
  }];
  var localTypes = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), fullabi(abi));
  var buffer = new Serialize.SerialBuffer({
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder()
  });
  var theType = localTypes.get(commandName);
  if (!theType) {
    // console.log('type not found', atype);
    return;
  }
  var data = { data: values };
  theType.serialize(buffer, data);
  return Buffer.from(Object.values(buffer));
};

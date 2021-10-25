const { requireBox } = require('@liquidapps/box-utils');
const { getCreateAccount } = requireBox('seed-eos/tools/eos/utils');

const returnAuthorKeys = async (author, sidechain) => {
  let keys;
  if(sidechain) {
    keys = await getCreateAccount(author, null, false, sidechain);
  } else {
    keys = await getCreateAccount(author);
  }
  return keys;
}

const mutable_data = [];
const atomicassets = "atomicassets";
const allow_notify = true;
const max_supply = 1000;
const tokens_to_back = [];
const schema_format = [
    {name: "name", type: "string"},
    {name: "series", type: "string"},
    {name: "moment", type: "string"},
    {name: "description", type: "string"},
    {name: "img", type: "image"},
    {name: "backimg", type: "string"},
    {name: "rarity", type: "string"}
];
const diff_schema_format = [
    {name: "name", type: "string"},
    {name: "img", type: "image"},
    {name: "description", type: "string"}
];
const immutable_data = [{
    "key": "name",
    "value": [
      "string",
      "The New Silk Road"
    ]
},
{
    "key": "img",
    "value": [
      "string",
      "QmSXDsFeNaPa3CJKmn8WKBnA421Zv5r3Ra8n71LZhvEi9s/main/genesis/1.png"
    ]
},
{
    "key": "backimg",
    "value": [
      "string",
      "QmSXDsFeNaPa3CJKmn8WKBnA421Zv5r3Ra8n71LZhvEi9s/main/genesis/1_back.jpg"
    ]
},
{
    "key": "series",
    "value": [
      "string",
      "Through the Looking Glass"
    ]
},
{
    "key": "moment",
    "value": [
      "string",
      "6 - The Silk Road"
    ]
},
{
    "key": "rarity",
    "value": [
      "string",
      "genesis"
    ]
},
{
    "key": "description",
    "value": [
      "string",
      "Named after an ancient Chinese trade route, the digital silk road is a virtual pathway for the delivery of merchandise."
    ]
}];

const diff_immutable_data = [{
    "key": "name",
    "value": [
      "string",
      "Diff name"
    ]
},
{
    "key": "img",
    "value": [
      "string",
      "QmcLydDFjfduz2GLyvHM2mDFrZnPyUC85kNCaFZMnD2W4e"
    ]
},
{
  "key": "description",
  "value": [
    "string",
    "Diff description."
  ]
}];

const createcol = async ({
  deployed_contract,
  author,
  collection_name,
  authorized_account,
  sidechain
}) => {
  const keys = await returnAuthorKeys(author, sidechain);
  const authorized_accounts = [author,authorized_account]
  await deployed_contract.contractInstance.createcol({
    author,
    collection_name,
    allow_notify,
    authorized_accounts,
    notify_accounts: [],
    market_fee: 0.05,
    data: []
  }, {
      authorization: `${author}@active`,
      keyProvider: [keys.active.privateKey]
  });
}

const createschema = async ({
  deployed_contract,
  authorized_creator,
  collection_name,
  schema_name,
  schema_format,
  sidechain
}) => {
  const keys = await returnAuthorKeys(authorized_creator, sidechain);
  await deployed_contract.contractInstance.createschema({
    authorized_creator,
    collection_name,
    schema_name,
    schema_format
  }, {
      authorization: `${authorized_creator}@active`,
      keyProvider: [keys.active.privateKey]
  });
}

const createtempl = async ({
  deployed_contract,
  authorized_creator,
  collection_name,
  schema_name,
  immutable_data,
  sidechain
}) => {
  const keys = await returnAuthorKeys(authorized_creator, sidechain);
  await deployed_contract.contractInstance.createtempl({
    authorized_creator,
    collection_name,
    schema_name,
    transferable: true,
    burnable: true,
    max_supply: 1000,
    immutable_data
  }, {
      authorization: `${authorized_creator}@active`,
      keyProvider: [keys.active.privateKey]
  });
}

const transferNft = async (
  deployed_contract,
  author,
  from,
  to,
  asset_ids,
  sidechain
) => {
  const keys = await returnAuthorKeys(author, sidechain);
  await deployed_contract.contractInstance.transfer({
    from,
    to,
    asset_ids,
    memo: ''
  }, {
    authorization: [`${author}@active`],
    keyProvider: [keys.active.privateKey]
  });
}

const mintasset = async ({
  deployed_contract,
  authorized_minter,
  collection_name,
  schema_name,
  template_id,
  new_asset_owner,
  immutable_data,
  sidechain
}) => {
  const keys = await returnAuthorKeys(authorized_minter, sidechain);
  await deployed_contract.contractInstance.mintasset({
    authorized_minter,
    collection_name,
    schema_name,
    template_id,
    new_asset_owner,
    immutable_data,
    mutable_data,
    tokens_to_back
  }, {
      authorization: `${authorized_minter}@active`,
      keyProvider: [keys.active.privateKey]
  });
}

const returnAssetId = async ({
  dspeos,
  owner
}) => {
  const res = await dspeos.getTableRows({
    'json': true,
    'scope': owner,
    'code': atomicassets,
    'table': 'assets',
    'limit': 100
  });
  return res.rows[res.rows.length - 1].asset_id
}

const returnNextTemplateId = async ({
  dspeos
}) => {
  const res = await dspeos.getTableRows({
    'json': true,
    'scope': atomicassets,
    'code': atomicassets,
    'table': 'config',
    'limit': 100
  });
  return res.rows[0].template_counter;
}

const returnNextAssetId = async ({
  dspeos
}) => {
  const res = await dspeos.getTableRows({
    'json': true,
    'scope': atomicassets,
    'code': atomicassets,
    'table': 'config',
    'limit': 100
  });
  return res.rows[0].asset_counter;
}

const setupEvmMap = async ({
  bridgeContract,
  bridge,
  collection_name,
  template_id,
  token_address,
  schema_name,
  collection_id,
  immutable_data,
  uri,
  sidechain
}) => {
  const keys = await returnAuthorKeys(bridge, sidechain);
  await bridgeContract.evmeossetup({
    collection_name,
    schema_name,
    template_id,
    immutable_data,
    mutable_data,
    token_address,
    collection_id,
    uri
  }, {
    authorization: [`${bridge}@active`],
    keyProvider: [keys.active.privateKey]
  });
}

module.exports = { 
  createcol,
  createschema,
  createtempl,
  transferNft,
  mintasset,
  returnAssetId,
  setupEvmMap,
  schema_format,
  immutable_data,
  diff_immutable_data,
  diff_schema_format,
  returnNextTemplateId,
  returnNextAssetId
}
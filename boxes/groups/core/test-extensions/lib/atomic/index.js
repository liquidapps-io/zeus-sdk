const { requireBox } = require('@liquidapps/box-utils');
const { getLocalDSPEos, getCreateAccount, getNetwork } = requireBox('seed-eos/tools/eos/utils');

const author = "testpegmnown";
const schema_name = "nftauthschem"
const diff_schema_name = "nftauthsche1"
const schema_format = [
    {name: "name", type: "string"},
    {name: "series", type: "string"},
    {name: "moment", type: "string"},
    {name: "description", type: "string"},
    {name: "img", type: "image"},
    {name: "backimg", type: "string"},
    {name: "rarity", type: "string"}
]
const diff_schema_format = [
    {name: "name", type: "string"},
    {name: "img", type: "image"},
    {name: "description", type: "string"}
]
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
const diffImmutableData = [{
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
const mutable_data = [];
const collection_name = 'nftauthcolll';
const diff_collection_name = 'nftauthcoll1';
const template_id = 1;
const nftTokenMainnet = "atomicassets"
const notify_accounts = []
const market_fee = 0.05
const data = []
const authorized_creator = author
const allow_notify = true;

const createNft = async (deployedAtomicNft, dspeos, sendTo, init = false, nftContract=nftTokenMainnet, onlySetup=false,authorized_account,sidechain,collection_name_override) => {
  let authorKeys;
  if(sidechain) {
    authorKeys = await getCreateAccount(author, null, false, sidechain);
  } else {
    authorKeys = await getCreateAccount(author);
  }
  const authorized_accounts = [author,authorized_account]
  if(init) {
    await deployedAtomicNft.contractInstance.createcol({
      author,
      collection_name: collection_name_override? collection_name_override: collection_name,
      allow_notify,
      authorized_accounts,
      notify_accounts,
      market_fee,
      data
    }, {
        authorization: `${author}@active`,
        keyProvider: [authorKeys.active.privateKey]
    });
    await deployedAtomicNft.contractInstance.createschema({
      authorized_creator,
      collection_name: collection_name_override? collection_name_override: collection_name,
      schema_name,
      schema_format
    }, {
        authorization: `${author}@active`,
        keyProvider: [authorKeys.active.privateKey]
    });
    await deployedAtomicNft.contractInstance.createtempl({
      authorized_creator,
      collection_name: collection_name_override? collection_name_override: collection_name,
      schema_name,
      transferable: true,
      burnable: true,
      max_supply: 1000,
      immutable_data
    }, {
        authorization: `${author}@active`,
        keyProvider: [authorKeys.active.privateKey]
    });
    if(onlySetup) {
      return;
    }
  }
  const authorized_minter = author;
  const new_asset_owner = author;
  const tokens_to_back = [];
  await deployedAtomicNft.contractInstance.mintasset({
    authorized_minter,
    collection_name: collection_name_override? collection_name_override: collection_name,
    schema_name,
    template_id,
    new_asset_owner,
    immutable_data,
    mutable_data,
    tokens_to_back
  }, {
      authorization: `${author}@active`,
      keyProvider: [authorKeys.active.privateKey]
  });
  await deployedAtomicNft.contractInstance.mintasset({
    authorized_minter,
    collection_name: collection_name_override? collection_name_override: collection_name,
    schema_name,
    template_id: -1,
    new_asset_owner,
    immutable_data,
    mutable_data,
    tokens_to_back
  }, {
      authorization: `${author}@active`,
      keyProvider: [authorKeys.active.privateKey]
  });
  let res = await dspeos.getTableRows({
    'json': true,
    'scope': new_asset_owner,
    'code': nftContract,
    'table': 'assets',
    'limit': 1
  });
  const asset_id = res.rows[0].asset_id
  await deployedAtomicNft.contractInstance.transfer({
    from: author,
    to: sendTo,
    asset_ids: [asset_id],
    memo: ''
  }, {
    authorization: [`${author}@active`],
    keyProvider: [authorKeys.active.privateKey]
  });
  return asset_id;
}

const setupEosio = async (bridgeContract, bridgeAccount,sidechain,collection_name_override,template_id_override=1) => {
  let setupKeys;
  if(sidechain) {
    setupKeys = await getCreateAccount(bridgeAccount, null, false, sidechain);
  } else {
    setupKeys = await getCreateAccount(bridgeAccount);
  }
  await bridgeContract.contractInstance.evmeossetup({
    collection_name: collection_name_override? collection_name_override: collection_name,
    schema_name,
    template_id: template_id_override,
    immutable_data,
    mutable_data,
    // schema_format
  }, {
    authorization: [`${bridgeAccount}@active`],
    keyProvider: [setupKeys.active.privateKey]
  });
}

const returnAssetId = async(dspeos, account, nftContract,id=false) => {
  const res = await dspeos.getTableRows({
    'json': true,
    'scope': account,
    'code': nftContract,
    'table': 'assets',
    'limit': 999
  });
  if(id==true && res.rows.length) {
    return res.rows[0].asset_id
  } else if(id==true) {
    return 0
  }
  return res.rows.length ? res.rows.length : 0;
}

const nftInfo = {
  author,
  schema_name,
  schema_format,
  immutable_data,
  mutable_data,
  collection_name,
  template_id
}

module.exports = { 
    returnAssetId,
    createNft,
    nftInfo,
    setupEosio,
    schema_format,
    immutable_data,
    author,
    schema_name,
    collection_name,
    authorized_creator,
    diffImmutableData,
    diff_schema_name,
    diff_collection_name,
    allow_notify,
    notify_accounts,
    market_fee,
    data,
    diff_schema_format
  }
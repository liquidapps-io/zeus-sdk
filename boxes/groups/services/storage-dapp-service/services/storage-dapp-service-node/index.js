var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { deserialize, eosPrivate } = require('../dapp-services-node/common');
var IPFS = require('ipfs-api');
const { BigNumber } = require('bignumber.js');
var sha256 = require('js-sha256').sha256;
const { getUrl } = require('../../extensions/tools/eos/utils');
const getDefaultArgs = require('../../extensions/helpers/getDefaultArgs');

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_FLOOR }); // equivalent

const multihash = require('multihashes');

const eos = eosPrivate;
var ipfs = new IPFS({ host: process.env.IPFS_HOST || 'localhost', port: process.env.IPFS_PORT || 5001, protocol: process.env.IPFS_PROTOCOL || 'http' });

const eosjs2 = require('eosjs');
const { JsonRpc } = eosjs2;
const fetch = require('node-fetch');

var url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });
const ipfsTimeoutSeconds = process.env.IPFS_TIMEOUT_SECONDS || 15;
const ipfsTimeout = ipfsTimeoutSeconds * 1000;
const hashData256 = (data) => {
  var hash = sha256.create();
  hash.update(data);
  return hash.hex();
};
const converToUri = (hash) => {
  const bytes = Buffer.from(hash, 'hex');
  const address = multihash.toB58String(bytes);
  return 'ipfs://z' + address;
};

const saveToIPFS = async(data) => {
  // console.log('writing data: ' +data);
  const bufData = Buffer.from(data, 'hex');
  const hash = hashData256(bufData);
  const uri = converToUri("01551220" + hash);


  const filesAdded = await ipfs.files.add(bufData, { 'raw-leaves': true, 'cid-version': 1 });
  var theHash = filesAdded[0].hash;
  console.log('commited to: ipfs://' + theHash);
  const resUri = `ipfs://${theHash}`;
  if (resUri != uri)
    throw new Error(`uris mismatch ${resUri} != ${uri}`);
  return uri;
};
const saveDirToIPFS = async(files) => {
  // console.log('writing data: ' +data);
  const filesAdded = await ipfs.files.add(files);
  var theHash = filesAdded[filesAdded.length].hash;
  console.log('commited to: ipfs://' + theHash);
  const resUri = `ipfs://${theHash}`;
  return resUri;
};

const readFromIPFS = async(uri) => {
  console.log('getting', uri);
  const fileName = uri.split('ipfs://', 2)[1];
  var res = await Promise.race([
    ipfs.files.get(fileName),
    new Promise((resolve, reject) => {
      setTimeout(() => { reject('ipfsentry not found') }, ipfsTimeout);
    })
  ]);
  var data = Buffer.from(res[0].content);
  return data;
};

const unpack = async(archive, format) => {
  throw new Error("not implemented yet");
  // var files = [];
  // return files;
}

nodeFactory('storage', {
  api: {
    unpin: async({ body }, res) => {
      // verify contract auth
      const { uri } = body;
      try {
        const hash = uri.split('ipfs://', 2)[1];
        await ipfs.pin.rm(hash);

        // todo: report to chain
        // todo: update quota settings

        // todo: handle redirect
        res.status(200);
        res.send(JSON.stringify({ uri }));
      }
      catch (e) {
        res.status(400);
        console.error("error:", e);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    },
    fetch: async({ body }, res) => {
      // todo: verify api key or ref domain
      const { uri } = body;
      try {
        // todo: proxy to local ipfs gateway
        const content = await readFromIPFS(uri);
        // todo: report to chain
        // todo: handle redirect
        res.status(200);
        res.send(content);
      }
      catch (e) {
        res.status(400);
        console.error("error:", e);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    },
    upload: async({ body }, res) => {
      // todo: verify contract auth
      let { data, archive } = body;
      try {
        let uri;
        if (archive) {
          // unpack
          var archiveData = archive.data;
          var files = await unpack(archiveData, archiveData.format);
          // upload files
          uri = await saveDirToIPFS(files);
        }
        else
          uri = await saveToIPFS(data);
        // todo: report to chain

        res.send(JSON.stringify({ uri }));
      }
      catch (e) {
        res.status(400);
        console.error("error:", e);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    },
  }
});


// todo: periodically call "usage" for hold and serve
// todo: periodically call proof of replication
// todo: use auth service
// todo: private storage using decrypt/sign/key service and merging client

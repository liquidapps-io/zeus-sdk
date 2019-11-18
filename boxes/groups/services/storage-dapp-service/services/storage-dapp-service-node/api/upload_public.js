const { emitUsage } = require('../../dapp-services-node/common');
const { getContractAccountFor } = require('../../../extensions/tools/eos/dapp-services');

var IPFS = require('ipfs-api');
const { BigNumber } = require('bignumber.js');
var sha256 = require('js-sha256').sha256;
const { promisify } = require('util');

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_FLOOR }); // equivalent

const multihash = require('multihashes');
var tar = require('tar-stream');
var streamBuffers = require('stream-buffers');


var ipfs = new IPFS({ host: process.env.IPFS_HOST || 'localhost', port: process.env.IPFS_PORT || 5001, protocol: process.env.IPFS_PROTOCOL || 'http' });

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
    var theHash = filesAdded[0].hash;
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
const untarCb = (archiveData, cb) => {
    // Initialize stream
    var tarStream = new streamBuffers.ReadableStreamBuffer({
        frequency: 10,
        chunkSize: 2048
    });
    var extract = tar.extract()
    var files = [];
    extract.on('entry', function(header, stream, next) {

        // header is the tar header
        // stream is the content body (might be an empty stream)
        // call next when you are done with this entry
        var path = header.name;
        var fileData = [];
        stream.on('data', function(d) {
            fileData.push(d);
            next() // ready for next entry
        })
        stream.on('end', function() {
            files.push({
                path,
                content: Buffer.concat(fileData)
            });
            next() // ready for next entry
        })

        stream.resume() // just auto drain the stream
    })

    extract.on('finish', function() {
        // all entries read
        cb(null, files);
    })

    tarStream.put(Buffer.from(archiveData));
    tarStream.pipe(extract);
}
const untar = promisify(untarCb);

const unpack = async(archiveData, format) => {
    var files = [];

    switch (format) {
        case 'tar':
            var files = await untar(archiveData);
            break;

        default:
            throw new Error(`archive format not implemented yet (${format})`)

    }


    return files;
}


module.exports = async({ data, archive, sidechain, contract }, state, model, { account, permission, clientCode }) => {
    if (account !== contract) throw new Error('not allowed');
    let uri;
    if (archive) {
        // unpack
        var archiveData = archive.data;
        var format = archiveData.format || 'tar';
        var files = await unpack(archiveData, format);
        // upload files
        uri = await saveDirToIPFS(files);
    }
    else
        uri = await saveToIPFS(data);
    await emitUsage(contract, getContractAccountFor(model), data.length, sidechain, { uri })

    return { uri };


}

const { emitUsage } = require('../../dapp-services-node/common');
const { getContractAccountFor } = require('../../../extensions/tools/eos/dapp-services');

var IPFS = require('ipfs-api');
const { BigNumber } = require('bignumber.js');
var sha256 = require('js-sha256').sha256;
const { promisify } = require('util');
const logger = require('../../../extensions/helpers/logger');

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
    const resUri = `ipfs://${theHash}`;
    if (resUri != uri)
        throw new Error(`uris mismatch ${resUri} != ${uri}`);
    return uri;
};
const saveDirToIPFS = async(files) => {
    // console.log('writing data: ' +data);
    const filesAdded = await ipfs.add(files, { wrapWithDirectory: true });
    var theHash = filesAdded[filesAdded.length - 1].hash;
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
    var tarStream = new streamBuffers.ReadableStreamBuffer({});
    var extract = tar.extract()
    var files = [];
    extract.on('entry', function(header, stream, next) {

        // header is the tar header
        // stream is the content body (might be an empty stream)
        // call next when you are done with this entry

        var path = header.name;
        var fileData = [];
        if (header.type === 'file') {
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
        }
        else {
            files.push({
                path
            });
            next() // ready for next entry
        }

        stream.resume() // just auto drain the stream
    })


    extract.on('finish', function(e) {
        // all entries read
        cb(null, files);
    })

    extract.on('error', function(e) {

        // all entries read
        cb(e, files);
    })

    tarStream.put(Buffer.from(archiveData));
    tarStream.stop();

    tarStream.pipe(extract);

}
const untar = promisify(untarCb);

const unpack = async(archiveData, format) => {
    var files = [];

    switch (format) {
        case 'tar':
            files = await untar(archiveData);
            break;

        default:
            throw new Error(`archive format not implemented yet (${format})`)

    }


    return files;
}


module.exports = async(body, state, model, { account, permission, clientCode }) => {
    const { data, archive, sidechain, contract } = body;

    if (account !== contract) throw new Error('not allowed');
    let uri;
    var length = 0;
    if (archive) {
        // unpack
        var archiveData = archive.data;
        var format = archive.format || 'tar';
        // upload files
        var files = await unpack(Buffer.from(archiveData, 'hex'), format);
        length = archiveData.length / 2;
        uri = await saveDirToIPFS(files);
    }
    else {
        uri = await saveToIPFS(data);
        length = data.length / 2;
    }
    await emitUsage(contract, getContractAccountFor(model), length, sidechain, { uri })

    return { uri };


}

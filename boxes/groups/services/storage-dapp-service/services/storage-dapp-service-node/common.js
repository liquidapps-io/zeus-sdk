var IPFS = require('ipfs-api');
const { BigNumber } = require('bignumber.js');
var sha256 = require('js-sha256').sha256;
const { promisify } = require('util');
const multihash = require('multihashes');
var tar = require('tar-stream');
var streamBuffers = require('stream-buffers');
const { requireBox } = require('@liquidapps/box-utils');
const logger = requireBox('log-extensions/helpers/logger');
const fs = require('fs');
const fetch = require("node-fetch");

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_FLOOR }); // equivalent

var ipfs = new IPFS({ host: process.env.IPFS_HOST || 'localhost', port: process.env.IPFS_PORT || 5001, protocol: process.env.IPFS_PROTOCOL || 'http' });

const ipfsTimeoutSeconds = process.env.IPFS_TIMEOUT_SECONDS || 15;
const ipfsTimeout = ipfsTimeoutSeconds * 1000;
const hashData256 = (data) => {
    var hash = sha256.create();
    hash.update(data);
    return hash.hex();
};

const convertToUri = (hash) => {
    const bytes = Buffer.from(hash, 'hex');
    const address = multihash.toB58String(bytes);
    return 'ipfs://z' + address;
};

const saveToIPFS = async (data, rawLeaves = true) => {
    let bufData = data
    if (!Buffer.isBuffer(bufData)) {
        bufData = Buffer.from(data, `base64`);
    }
    let ipfsUri = ``;
    if(rawLeaves) {
      const fileSizeInBytes = bufData.byteLength;
      const AVAILABLE_CHUNKS_SIZES = [0, 262144, 2 * 262144, 4 * 262144]
      let chunkSize = 0
      // pick smallest chunk size that still fits file
      for(let i = 0; i < AVAILABLE_CHUNKS_SIZES.length - 1; i++) {
        if(fileSizeInBytes > AVAILABLE_CHUNKS_SIZES[i] && fileSizeInBytes <= AVAILABLE_CHUNKS_SIZES[i + 1]) {
          chunkSize = AVAILABLE_CHUNKS_SIZES[i + 1]
          break;
        }
      }
      if(!chunkSize) throw new Error(`file is too big to be uploaded with 'rawLeaves' option`)
      const hash = hashData256(bufData);
      const expectedUri = convertToUri("01551220" + hash);
      const filesAdded = await ipfs.files.add(bufData, { 'raw-leaves': true, 'cid-version': 1, 'cid-base': 'base58btc', chunker: `size-${chunkSize}` });
      ipfsUri = `ipfs://${filesAdded[0].hash}`;
      if (ipfsUri != expectedUri) throw new Error(`uris mismatch ${ipfsUri} != ${expectedUri}`);
    } else {
      const filesAdded = await ipfs.files.add(bufData, { 'raw-leaves': false, 'cid-version': 1, 'cid-base': 'base58btc' });
      ipfsUri = `ipfs://${filesAdded[0].hash}`;
    }
    return ipfsUri;
};

const saveDirToIPFS = async (files) => {
    // console.log('writing data: ' +data);
    const filesAdded = await ipfs.add(files, { wrapWithDirectory: true });
    // last added "file" is that of wrapping dir
    var theHash = filesAdded[filesAdded.length - 1].hash;
    const resUri = `ipfs://${theHash}`;
    return resUri;
};

const readFromIPFS = async (uri) => {
    const fileName = uri.split('ipfs://', 2)[1];
    var res = await Promise.race([
        ipfs.files.get(fileName),
        new Promise((resolve, reject) => {
            setTimeout(() => { reject('ipfsentry not found') }, ipfsTimeout);
        }),
    ]);
    var data = Buffer.from(res[0].content);
    return data;
};

const untarCb = (archiveData, cb) => {
    // Initialize stream
    var tarStream = new streamBuffers.ReadableStreamBuffer({});
    var extract = tar.extract()
    var files = [];
    extract.on('entry', function (header, stream, next) {

        // header is the tar header
        // stream is the content body (might be an empty stream)
        // call next when you are done with this entry

        var path = header.name;
        var fileData = [];
        if (header.type === 'file') {
            stream.on('data', function (d) {
                fileData.push(d);
                next() // ready for next entry
            })
            stream.on('end', function () {

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


    extract.on('finish', function (e) {
        // all entries read
        cb(null, files);
    })

    extract.on('error', function (e) {

        // all entries read
        cb(e, files);
    })

    tarStream.put(Buffer.from(archiveData));
    tarStream.stop();

    tarStream.pipe(extract);
}

const untar = promisify(untarCb);

const unpack = async (archiveData, format) => {
    var files = [];

    switch (format) {
        case 'tar':
            files = await untar(archiveData);
            break;

        default:
            throw new Error(`archive format not implemented yet (${typeof(format) == "object" ? JSON.stringify(format) : format})`)
    }

    return files;
}

const getIpfsFileAsBuffer = async (ipfsUriOrHash) => {
    const ipfsHash = ipfsUriOrHash.replace(/^ipfs:\/\//, "");
    const ipfsGatewayUri = `http://localhost:8080/ipfs/${ipfsHash}`
    const response = await fetch(ipfsGatewayUri, {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, cors, *same-origin
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
            // "Content-Type": "application/json",
            // "Content-Type": "application/x-www-form-urlencoded",
        },
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer" // no-referrer, *client
    });

    if (!response.ok) {
        throw new Error(
            `Could not fetch file "${ipfsUriOrHash}..." from IPFS. ${response.statusText}`
        );
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
}

module.exports = {
    unpack,
    saveToIPFS,
    saveDirToIPFS,
    hashData256,
    readFromIPFS,
    getIpfsFileAsBuffer
}
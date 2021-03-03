const { requireBox } = require('@liquidapps/box-utils');
const logger = requireBox('log-extensions/helpers/logger');
var { nodeFactory } = requireBox('dapp-services/services/dapp-services-node/generic-dapp-service-node');
const ecc = require('eosjs-ecc');
const os = require('os');
const consts = require('./consts');
const { getWeb3 } = require('./helpers/ethereum/web3Provider');
const { getNonce, incrementNonce } = require('./helpers/ethereum/nonce');
const async = require('async');
let totalTrx = 0;
const delay = ms => new Promise(res => setTimeout(res, ms));
const maxEthNodeTrxLimit = 64;

const q = async.queue(async (signedTx, callback) => {
  totalTrx++;
  while( totalTrx >= maxEthNodeTrxLimit ) {
    logger.warn('passed pending queue limit, sleeping');
    await delay(5000);
  }
  const tx = web3.eth.sendSignedTransaction(signedTx);
  let txHash;
  tx.once('transactionHash', function(hash) {
    logger.debug(`got txHash ${hash}`);
    txHash = hash;
  });
  tx.once('receipt', function(receipt){ 
      logger.info(`got receipt ${JSON.stringify(receipt)}`);
      totalTrx--;
      callback();
  });
  callback();
}, 1);

// assign a callback
q.drain = function() {
  logger.debug('all items have been processed');
}

const web3 = getWeb3();

const getCreateKeypair = {
  "eosio": async (trx, chain, account, allowCreate, consumer) => {
    const storagePath = getStoragePath(chain, account);

    if (!allowCreate && !fs.existsSync(storagePath))
      throw new Error(`key for account ${account} on chain ${chain} should exist`);    // storage somewhere

    // storage somewhere
    if (fs.existsSync(storagePath)) {
      return JSON.parse(fs.readFileSync(storagePath));
    }
    const privateKey = await ecc.randomKey();
    const publicKey = ecc.privateToPublic(privateKey);

    // store the new key somewhere?
    fs.writeFileSync(storagePath, JSON.stringify(newAccount));

    return { privateKey, publicKey };
  },
  "ethereum": (trx, chain, account, allowCreate, consumer) => {
    // for now only 1 key for ethereum
    const ethPrivateKey = consts.getEthPrivateKey(consumer);
    return {
      privateKey: ethPrivateKey,
      publicKey: web3.eth.accounts.privateKeyToAccount(ethPrivateKey).address
    };

  }
}

const postFn = {
  "eosio": async (signedTx, chain, account, sigs) => {
    // const { privateKey, publicKey } = getCreateKeypair['eosio'](trx, chain, account, false);
    // const signedTx = await signFn['eosio'](trx, chain, account, { privateKey, publicKey });
    // const eos = getEos(privateKey, chain);
    // return eos.Api.transact
  },
  "ethereum": (signedTx, chain, account, sigs) => {
    // post-alpha we want to monitor the transaction for gas usage,
    // for the provisioning layer (quota usage and whatnot)
    // check for 10% change and increase by amount 
    //logger.info('david ' + q.length())
    q.push(signedTx);
  }
}

const signFn = {
  "eosio": async (destination, trx_data, chain, account, keypair) => {

  },
  "ethereum": async (destination, trx_data, chain, account, keypair) => {
    // TODO: we need to take into account the nonce of pending transactions
    // to not overwrite them - tricky business
    trx_data = trx_data.startsWith('0x') ? trx_data : `0x${trx_data}`;
    const nonce = await getNonce(keypair.publicKey);
    const privateKey = keypair.privateKey.startsWith('0x') ?
      keypair.privateKey.slice(2) : keypair.privateKey;

    logger.debug(`destination: ${destination}, trx_data: ${JSON.stringify(trx_data)}, chain: ${chain}, account: ${account}, value: ${numberToHex(0)}, numberToHex(nonce): ${numberToHex(nonce)}, nonce: ${nonce}, gasPrice: ${consts.ethGasPrice}, gasLimit: ${consts.ethGasLimit}`);
    const rawTx = {
      nonce: numberToHex(nonce),
      to: destination,
      data: trx_data,
      value: numberToHex(0),
      gasPrice: numberToHex(Math.round(Number(await web3.eth.getGasPrice()) * (Number(process.env.ETH_GAS_PRICE_MULT) || 1.2))),
      gasLimit: numberToHex(consts.ethGasLimit)
    }
    const tx = await web3.eth.accounts.signTransaction(rawTx, privateKey);
    return tx.rawTransaction;
  }
}

// we have different handlers for different chains since the flow can be
// different. For example, on ethereum each signature must be sent
// as a transaction to the multisig contract, whereas on btc/bnb the
// signatures need to be collected and only once there are enough
// can the transaction be sent.
const signHandlers = {
  "eosio": async (id, destination, trx_data, chain, chain_type, sigs, account, sigs_required, consumer) => {
    // get key from storage
    var keypair = await getCreateKeypair['eosio'](chain, chain_type, account);

    // read transaction's action data, from ipfs or directly or raw from history
    var trxData = await resolveTrxData(trx);

    if (!trxData) {
      logger.error('failed parsing trx data (probably not JSON)');
      return;
    }

    // sign with internal keys and return sig_
    const signature = await signFn['eosio'](trxData, chain, account, keypair);
    sigs += ';' + signature;
    const sigsCount = sigs.length;

    // optionally post when enough sigs are ready
    var haveEnoughSigs = sigs_required != -1 && sigs_required > sigsCount;
    // return trx id from other chain    
    var trx_id;
    if (haveEnoughSigs) {
      trx_id = await postFn['eosio'](trxData, chain, account, sigs);
    }
    return {
      id, trx, chain, chain_type, sigs, account, sigs_required, trx_id
    };
  },
  "ethereum": async (id, destination, trx_data, chain, chain_type, sigs, account, sigs_required, consumer) => {
      // get key from storage
      var keypair = getCreateKeypair['ethereum'](chain, chain_type, account, consumer);

      // sign with internal keys and return sig
      const signedTx = await signFn['ethereum'](destination, trx_data, chain, account, keypair);

      const trx_id = await postFn['ethereum'](signedTx, chain, account, sigs);
      await incrementNonce(keypair.publicKey);

      return {
        id, destination, trx_data, chain, chain_type, account, trx_id
      };
  }
}

nodeFactory('sign', {
  signtrx: async (obj1, { id, destination, trx_data, chain, chain_type, sigs, account, sigs_required }) => {
    const { event, rollback } = obj1;
    const consumer = obj1.account;
    if (rollback) {
      // rollback warmup
      event.action = 'sgcleanup';
      return {
        size: 0,
        id
      };
    }
    else {
      if (!signHandlers[chain_type]) {
        logger.error(`invalid chain type ${chain_type}`);
        return;
      }

      return signHandlers[chain_type](id, destination, trx_data, chain, chain_type, sigs, account, sigs_required, consumer);
    }
  },
  api: {
    genkey: async ({ body }, res) => {
      try {
        // todo: use auth service
        var { chain, chain_type, account } = body;
        var keypair = await getCreateKeypair[chain_type](chain, chain_type, account, true);
        res.send(JSON.stringify({ public_key: keypair.publicKey }));
      }
      catch (e) {
        res.status(400);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    },
    getkey: async ({ body }, res) => {
      try {
        var { chain, chain_type, account } = body;
        var keypair = getCreateKeypair['ethereum'](chain, chain_type, account, true);
        res.send(JSON.stringify({ public_key: keypair.publicKey }));
      }
      catch (e) {
        res.status(400);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    }
  }
});

const numberToHex = (number) => {
  if (typeof (number) == 'number')
    return `0x${number.toString(16)}`;
  if (typeof (number) == 'string' && !(number.startsWith('0x')))
    return `0x${parseInt(number).toString(16)}`;
  return number;
}

const getStoragePath = (chain, account) =>
  `${os.homedir()}/keys/${chain}/${account}.json`;

const resolveTrxData = (trxMeta) => {
  return JSON.parse(trxMeta);
}

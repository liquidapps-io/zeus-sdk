const { requireBox } = require('@liquidapps/box-utils');
const fs = require('fs');
const logger = requireBox('log-extensions/helpers/logger');
var { nodeFactory } = requireBox('dapp-services/services/dapp-services-node/generic-dapp-service-node');
const ecc = require('eosjs-ecc');
const os = require('os');
const consts = require('./consts');
const { getWeb3 } = require('./helpers/ethereum/web3Provider');
const { getNonce, incrementNonce, decrementNonce } = require('./helpers/ethereum/nonce');
const async = require('async');
const q = async.queue(async ({ id, destination, trx_data, chain, chain_type, sigs, account, sigs_required, consumer }, callback) => {
  try {
    const keypair = getCreateKeypair[chain_type](chain, consumer);
    const signedTx = await signFn[chain_type](destination, trx_data, chain, account, keypair);
    const web3 = getWeb3(chain);
    const tx = await web3.eth.sendSignedTransaction(signedTx);
    logger.info(`got tx: ${tx.transactionHash} gas used: ${tx.gasUsed} cumulative gas used: ${tx.cumulativeGasUsed}`)
    callback();
  } catch(e) {
    logger.error(`error running sign service trx: ${typeof(e) == "object" ? JSON.stringify(e) : e}`)
    callback();
  }
}, 64);
// assign a callback
q.drain = function() {
  logger.info('all items have been processed');
}
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
    fs.writeFileSync(storagePath, JSON.stringify(account));
    return { privateKey, publicKey };
  },
  "ethereum": (chain, consumer) => {
    let ethPrivateKey;
    if(chain && consumer && process.env[`EVM_${chain.toUpperCase()}_PRIVATE_KEY_${consumer.toUpperCase()}`]) {
      ethPrivateKey = process.env[`EVM_${chain.toUpperCase()}_PRIVATE_KEY_${consumer.toUpperCase()}`];
    } else if(chain && process.env[`EVM_${chain.toUpperCase()}_PRIVATE_KEY`]) {
      ethPrivateKey = process.env[`EVM_${chain.toUpperCase()}_PRIVATE_KEY`]
    } else if(process.env[`EVM_PRIVATE_KEY`]) {
      ethPrivateKey = process.env[`EVM_PRIVATE_KEY`]
    } else {
      ethPrivateKey = '0x50e66efcac83baba59c8021ae49c54d7c65fba897a1cb6038878f15f89009ad6'
    }
    const web3 = getWeb3(chain);
    return {
      privateKey: ethPrivateKey,
      publicKey: web3.eth.accounts.privateKeyToAccount(ethPrivateKey).address
    };
  }
}

const signFn = {
  "eosio": async (destination, trx_data, chain, account, keypair) => {
  },
  "ethereum": async (destination, trx_data, chain, account, keypair) => {
    trx_data = trx_data.startsWith('0x') ? trx_data : `0x${trx_data}`;
    const nonce = await getNonce(keypair.publicKey, chain);
    logger.info(`nonce: ${nonce}`)
    const privateKey = keypair.privateKey.startsWith('0x') ?
      keypair.privateKey.slice(2) : keypair.privateKey;
    const web3 = getWeb3(chain);
    let gasLimit;
    if(chain && process.env[`EVM_${chain.toUpperCase()}_GAS_LIMIT`]) {
      gasLimit = process.env[`EVM_${chain.toUpperCase()}_GAS_LIMIT`];
    } else if(process.env[`EVM_GAS_LIMIT`]) {
      gasLimit = process.env[`EVM_GAS_LIMIT`]
    } else {
      gasLimit = consts.ethGasLimit
    }
    const rawTx = {
      nonce: numberToHex(nonce),
      to: destination,
      data: trx_data,
      value: numberToHex(0),
      gasPrice: numberToHex(Math.round(Number(await web3.eth.getGasPrice()) * (Number(process.env.EVM_GAS_PRICE_MULT) || 1.2))),
      gasLimit: numberToHex(gasLimit)
    }
    if(process.env.DSP_VERBOSE_LOGS) logger.debug(`destination: ${destination}, trx_data: ${JSON.stringify(trx_data)}, chain: ${chain}, account: ${account}, rawTrx: ${JSON.stringify(rawTx)}`);
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
    var keypair = await getCreateKeypair[chain_type](chain, account);
    // read transaction's action data, from ipfs or directly or raw from history
    var trxData = await resolveTrxData(trx_data);
    if (!trxData) {
      logger.error('failed parsing trx data (probably not JSON)');
      return;
    }
    // sign with internal keys and return sig_
    const signature = await signFn[chain_type](trxData, chain, account, keypair);
    sigs += ';' + signature;
    const sigsCount = sigs.length;
    // optionally post when enough sigs are ready
    var haveEnoughSigs = sigs_required != -1 && sigs_required > sigsCount;
    // return trx id from other chain    
    var trx_id;
    if (haveEnoughSigs) {
      trx_id = await postFn[chain_type](trxData, chain, account, sigs);
    }
    return {
      id, trx_data, chain, chain_type, sigs, account, sigs_required, trx_id
    };
  },
  "ethereum": (id, destination, trx_data, chain, chain_type, sigs, account, sigs_required, consumer) => {
      q.push({ id, destination, trx_data, chain, chain_type, sigs, account, sigs_required, consumer });
  }
}
nodeFactory('sign', {
  signtrx: async (obj1, { id, destination, trx_data, chain, chain_type, sigs, account, sigs_required, trx_id, current_provider }) => {
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
      if(chain_type !== "ethereum") {
        logger.error('non evm chain types not supported yet')
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
        var keypair = await getCreateKeypair[chain_type](chain, account);
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
        var keypair = getCreateKeypair[chain_type](chain, account);
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
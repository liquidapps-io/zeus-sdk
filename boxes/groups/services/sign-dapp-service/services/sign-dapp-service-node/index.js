const { requireBox } = require('@liquidapps/box-utils');
var { nodeFactory } = requireBox('dapp-services/services/dapp-services-node/generic-dapp-service-node');
var sha256 = require('js-sha256').sha256;
const ecc = require('eosjs-ecc');
const Fcbuffer = require('fcbuffer');
const Eos = require('eosjs');
const Web3 = require('web3');
const os = require('os');
const Tx = require('ethereumjs-tx').Transaction;
const consts = require('./consts');
const web3 = new Web3(consts.web3Provider);


const getCreateKeypair = {
  "eosio": async (trx, chain, account, allowCreate) => {
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
  "binance": (trx, chain, account, allowCreate) => {

  },
  "ethereum": (trx, chain, account, allowCreate) => {
    // for now only 1 key for ethereum
    return { privateKey: consts.ethPrivateKey, publicKey: consts.ethAddress };

    // const storagePath = getStoragePath(chain, account);

    // if (!allowCreate && !fs.existsSync(storagePath))
    //   throw new Error(`key for account ${account} on chain ${chain} should exist`);    // storage somewhere

    // if (fs.existsSync(storagePath)) {
    //   return JSON.parse(fs.readFileSync(storagePath));
    // }

    // // otherwise we create, store, and return a new key
    // const newAccount = web3.eth.accounts.create();

    // // store the new key somewhere?
    // fs.writeFileSync(storagePath, JSON.stringify({
    //    ...newAccount, publicKey: newAccount.address
    //   })
    // );

    // return {
    //   ...newAccount,
    //   publicKey: newAccount.address // return extra field `publicKey` for consistency
    // }
  }
}

const postFn = {
  "eosio": async (trx, chain, account, sigs) => {
    // const { privateKey, publicKey } = getCreateKeypair['eosio'](trx, chain, account, false);
    // const signedTx = await signFn['eosio'](trx, chain, account, { privateKey, publicKey });
    // const eos = getEos(privateKey, chain);
    // return eos.Api.transact
  },
  "binance": (trx, chain, account, sigs) => {

  },
  "ethereum": async (trx, chain, account, sigs) => {
    // post-alpha we want to monitor the transaction for gas usage,
    // for the provisioning layer (quota usage and whatnot)
    console.log('posting tx ', trx);
    const tx = await web3.eth.sendSignedTransaction(trx);
    console.log('tx', tx)
    return tx.transactionHash;
  }
}

const signFn = {
  "eosio": (destination, trx_data, chain, account, keypair) => {

  },
  "binance": (destination, trx_data, chain, account, keypair) => {

  },
  "ethereum": async (destination, trx_data, chain, account, keypair) => {
    // TODO: we need to take into account the nonce of pending transactions
    // to not overwrite them - tricky business
    const nonce = await web3.eth.getTransactionCount(keypair.publicKey);
    const key = keypair.privateKey.startsWith('0x') ?
      keypair.privateKey.slice(2) : keypair.privateKey;
    const privateKey = new Buffer(key, 'hex');
    const rawTx = {
      nonce: numberToHex(nonce),
      to: destination,
      data: trx_data,
      value: numberToHex(0),
      gasPrice: numberToHex(consts.ethGasPrice),
      gasLimit: numberToHex(consts.ethGasLimit)// We should ideally use
      // web3.eth.estimateGas, but for that we need the abi of the contract
      // we're sending the transaction to. hmmm....
    }
    console.log('rawtx', rawTx)
    const tx = new Tx(rawTx);
    tx.sign(privateKey);
    const serializedTx = tx.serialize();

    return '0x' + serializedTx.toString('hex');
  }
}

// we have different handlers for different chains since the flow can be
// different. For example, on ethereum each signature must be sent
// as a transaction to the multisig contract, whereas on eos the
// signatures need to be collected and only once there are enough
// can the transaction be sent.
const signHandlers = {
  "eosio": async (id, destination, trx_data, chain, chain_type, sigs, account, sigs_required) => {
    // get key from storage
    var keypair = await getCreateKeypair['eosio'](chain, chain_type, account);

    // read transaction's action data, from ipfs or directly or raw from history
    var trxData = await resolveTrxData(trx);

    if (!trxData) {
      console.log('failed parsing trx data (probably not JSON)');
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
  "binance": async (id, destination, trx_data, chain, chain_type, sigs, account, sigs_required) => {

  },
  "ethereum": async (id, destination, trx_data, chain, chain_type, sigs, account, sigs_required) => {
    // get key from storage
    var keypair = await getCreateKeypair['ethereum'](chain, chain_type, account);


    // sign with internal keys and return sig
    const signedTx = await signFn['ethereum'](destination, trx_data, chain, account, keypair);

    const trx_id = await postFn['ethereum'](signedTx, chain, account, sigs);

    return {
      id, destination, trx_data, chain, chain_type, sigs, account, sigs_required, trx_id
    };
  }
}

nodeFactory('sign', {
  signtrx: async ({ event, rollback }, { id, destination, trx_data, chain, chain_type, sigs, account, sigs_required }) => {
    console.log('picked up signtrx event, args:');
    console.log('id', id);
    console.log('trx', trx_data);
    console.log('chain', chain);
    console.log('chain_type', chain_type);
    console.log('sigs', sigs);
    console.log('account', account);
    console.log('sigs_required', sigs_required);
    console.log('---------------------------');
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
        console.log(`invalid chain type ${chain_type}`);
        return;
      }

      return signHandlers[chain_type](id, destination, trx_data, chain, chain_type, sigs, account, sigs_required);
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

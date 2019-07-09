var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, paccount, resolveProviderPackage, deserialize, generateABI, nodeosEndpoint } = require('../dapp-services-node/common');
const { loadModels } = require("../../extensions/tools/models");
var sha256 = require('js-sha256').sha256;
const ecc = require('eosjs-ecc')
const Fcbuffer = require('fcbuffer')
const Eos = require('eosjs')
const Web3 = require('web3')

// eth creator key for funding newly created ethereum addresses.
// defaults to 3rd key of ganache-cli with mnemonic 'either ostrich protect jump kingdom flat neck cabin sock they vast merit'
const ethCreatorKey = process.env.ETH_CREATOR_KEY || '0xa966a4df8f4ad2c5938fce96b46391e45ab6eade06848608020a50938b5dc3a2';
// amount of ether to fund new account, defaults to 1 ETH
const newEthAccountFundAmount = process.env.ETH_FUND_AMOUNT || '1000000000000000000';

// eos creator key and account for creating new eos accounts
// defaults to eosio
const eosCreatorKey = process.env.EOS_CREATOR_KEY || '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD35KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3';
const eosCreatorAccount = process.env.EOS_CREATOR_ACCOUNT || 'eosio';

// should we throw if not defined? or default to infura?
const web3Provider = process.env.WEB3_PROVIDER || 'http://localhost:8545';
// Again - throw or default?
const gasPrice = process.env.ETH_GAS_PRICE;

const web3 = new Web3(web3Provider);

// trx - ???
// chain - the chain type (for sidechains e.g POA)
// account - (I think) the multisig contract/account
// which this key will be a party to
// allowCreate - true if the key should already exist (a new key should NOT
// be created)
const getCreateKeypair = {
  "eosio": async (trx, chain, account, allowCreate) => {
    if (!allowCreate) {
      // make sure a key exists, otherwise throw?
    }
    // storage somewhere
    if (fs.existsSync('path_to_key')) {
      return JSON.parse(fs.readFileSync('path_to_key'));
    }
    const privateKey = await ecc.randomKey();
    const publicKey = ecc.privateToPublic(privateKey);

    // store the new key somewhere?
    // fs.writeFileSync('newKeyPair.json', JSON.stringify(newAccount));

    return { privateKey, publicKey };
  },
  "binance": (trx, chain, account, allowCreate) => {

  },
  "ethereum": (trx, chain, account, allowCreate) => {
    if (!allowCreate) {
      // make sure a key exists, otherwise throw?
    }
    // storage somewhere
    if (fs.existsSync('path_to_key')) {
      return JSON.parse(fs.readFileSync('path_to_key'));
    }

    // otherwise we create, store, and return a new key
    const newAccount = web3.eth.accounts.create();

    // store the new key somewhere?
    // fs.writeFileSync('newKeyPair.json', JSON.stringify(newAccount));

    return {
      ...newAccount,
      publicKey: newAccount.address // return extra field `publicKey` for consistency
    }
  }
}

// trx - the transaction to sign and send
// chain - the chain to send to (for sidechains e.g POA)
// account - the account/contract to send the transaction to (usually multisig)
// sigs - ???? I guess if using TSS then the DSP needs to know if the sig is complete
const postFn = {
  "eosio": (trx, chain, account, sigs) => {
    const { privateKey, publicKey } = getCreateKeypair.eos(trx, chain, account, false);
    const signedTx = await signFn.eos(trx, chain, account, { privateKey, publicKey });
    const eos = getEos(privateKey, chain);
    return eos.Api.transact
  },
  "binance": (trx, chain, account, sigs) => {

  },
  "ethereum": async (trx, chain, account, sigs) => {
    const { privateKey, publicKey } = getCreateKeypair.ethereum(trx, chain, account, false);
    const signedTx = await signFn.ethereum(trx, chain, account, { privateKey, publicKey });
    return web3.eth.sendSignedTransaction(signedTx);
  }
}

// trx - the transaction to sign and send
// IMPORTANT - I'm assuming that trx is just the transaction DATA, and doesn't
// include the nonce, gasPrice, other metadata etc. for ethereum
// chain - the chain to send to (for sidechains e.g POA)
// account - the account/contract to send the transaction to (usually multisig)
// keypair - the keypair to sign with (I guess DSPs can have multiple signing keys)
const signFn = {
  "eosio": (trx, chain, account, keypair) => {

  },
  "binance": (trx, chain, account, keypair) => {

  },
  // note that `chain` here is usually referred to as chainId on ethereum
  // which is a necessary transaction field (to prevent transactions
  // on the mainnet being broadcasted to sidechains and vice versa - 
  // similar to the functionality of ref_block_num/ref_block_prefix on EOS)
  "ethereum": async (trx, chain, account, keypair) => {
    // TODO: we need to take into account the nonce of pending transactions
    // to not overwrite them - tricky business
    const nonce = await web3.eth.getTransactionCount(keypair.publicKey);
    const signedTx = await web3.eth.accounts.signTransaction({
      nonce,
      chainId: chain,
      to: account,
      data: trx,
      value: 0,
      gasPrice,
      gas: '1000000' // default a million gas. We should ideally use
      // web3.eth.estimateGas, but for that we need the abi of the contract
      // we're sending the transaction to. hmmm....
    }, keypair.privateKey);

    return signedTx;
  }
}

const resolveTrxData = async(trxMeta) => {
  return trxMeta;
}

nodeFactory('sign', {
  sign: async({ event, rollback }, { id, trx, chain, chain_type, sigs, account, sigsRequired }) => {
    if (rollback) {
      // rollback warmup
      event.action = 'sgcleanup';
      return {
        size: 0,
        id
      };
    }
    else {
      // get key from storage
      var keypair = await getCreateKeypair(chain, chain_type, account);
      // read transaction's action data, from ipfs or directly or raw from history
      var trxData = await resolveTrxData(trx);


      // sign with internal keys and return sig_
      var signature = await signFn[chain_type](trxData, chain, account, keypair);
      sigs.push(signature)
      var sigsCount = sigs.length;

      // optionally post when enough sigs are ready
      var haveEnoughSigs = sigsRequired != -1 && sigsRequired > sigsCount;
      // return trx id from other chain    
      var trxid;
      if (haveEnoughSigs)
        trxid = await postFn[chain_type](trxData, chain, account, sigs);
      return {
        trxid,
        signature,
        id
      };
    }
  },
  api: {
    genkey: async({ body }, res) => {
      try {
        // todo: use auth service
        var { chain, chain_type, account } = body;
        var keypair = await getCreateKeypair(chain, chain_type, account, true);
        res.send(JSON.stringify({ public_key: keypair.publicKey }));
      }
      catch (e) {
        res.status(400);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    }
  }
});

function getEos(privateKey, chainId) {
  const config = {
    expireInSeconds: 120,
    sign: true,
    chainId,
    keyProvider: privateKey,
    httpEndpoint: nodeosEndpoint
  };
  return new Eos(config);
}
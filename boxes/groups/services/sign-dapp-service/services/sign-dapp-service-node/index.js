var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
const { eosDSPGateway, paccount, resolveProviderPackage, deserialize, generateABI } = require('../dapp-services-node/common');
const { loadModels } = require("../../extensions/tools/models");
var sha256 = require('js-sha256').sha256;
const ecc = require('eosjs-ecc')
const Fcbuffer = require('fcbuffer')
const Eos = require('eosjs')


const getCreateKeypair = {
  "eosio": (trx, chain, account, allowCreate) => {

  },
  "binance": (trx, chain, account, allowCreate) => {

  },
  "ethereum": (trx, chain, account, allowCreate) => {

  }
}


const postFn = {
  "eosio": (trx, chain, account, sigs) => {

  },
  "binance": (trx, chain, account, sigs) => {

  },
  "ethereum": (trx, chain, account, sigs) => {

  }
}

const signFn = {
  "eosio": (trx, chain, account, keypair) => {

  },
  "binance": (trx, chain, account, keypair) => {

  },
  "ethereum": (trx, chain, account, keypair) => {

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

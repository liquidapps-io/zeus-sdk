require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getNetwork } = requireBox('seed-eos/tools/eos/utils');
var Eos = require('eosjs');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');

var contractCode = 'dgoods';
var ctrt = artifacts.require(`./${contractCode}/`);
const { awaitTable, getTable, delay } = requireBox('seed-tests/lib/index');

describe(`${contractCode} Contract`, () => {
  var testcontract;

  const code = 'airairairair';
  const code2 = 'airairairai2';
  var account = code;

  const getTestAccountName = (num) => {
    var fivenum = num.toString(5).split('');
    for (var i = 0; i < fivenum.length; i++) {
      fivenum[i] = String.fromCharCode(fivenum[i].charCodeAt(0) + 1);
    }
    fivenum = fivenum.join('');
    var s = '111111111111' + fivenum;
    var prefix = 'test';
    s = prefix + s.substr(s.length - (12 - prefix.length));
    console.log(s);
    return s;
  };
  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);
        var deployedContract2 = await deployer.deploy(ctrt, code2);
        await genAllocateDAPPTokens(deployedContract, 'ipfs');
        // create token
        var selectedNetwork = getNetwork(getDefaultArgs());
        var config = {
          expireInSeconds: 120,
          sign: true,
          chainId: selectedNetwork.chainId
        };
        if (account) {
          var keys = await getCreateKeys(account);
          config.keyProvider = keys.active.privateKey;
        }
        var eosvram = deployedContract.eos;
        config.httpEndpoint = 'http://localhost:13015';
        eosvram = new Eos(config);

        testcontract = await eosvram.contract(code);
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  // console.log("codekey",codekey);
  it('stub', done => {
    (async () => {
      try {

        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});

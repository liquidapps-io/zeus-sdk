require('mocha');


const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = require('../extensions/helpers/key-utils');
const { getCreateAccount, getNetwork } = require('../extensions/tools/eos/utils');
var Eos = require('eosjs');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const fetch = require('node-fetch');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const { genAllocateDAPPTokens } = require('../extensions/tools/eos/dapp-services');

var contractCode = 'registry';
var ctrt = artifacts.require(`./${contractCode}/`);

function postData(url = ``, data = {}) {
  // Default options are marked with *
  return fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, cors, *same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      // "Content-Type": "application/json",
      // "Content-Type": "application/x-www-form-urlencoded",
    },
    redirect: 'follow', // manual, *follow, error
    referrer: 'no-referrer', // no-referrer, *client
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  })
    .then(response => response.json()); // parses response to JSON
}

describe(`${contractCode} Contract`, () => {
  var testcontract;

  const code = 'the1registry';
  const testuser = 'user1';
  const testuser2 = 'user2';
  var account = code;
  var endpoint;
  const readData = ({
    user,
    key
  }) => {
    return postData(`${endpoint}/v1/dsp/ipfsservice1/get_table_row`, {
      contract: code,
      scope: user,
      table: 'vitems',
      key
    });
  };
  before(done => {
    (async () => {
      try {
        var deployedContract = await deployer.deploy(ctrt, code);

        await getCreateAccount(testuser);
        await getCreateAccount(testuser2);

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
        endpoint = config.httpEndpoint;
        eosvram = new Eos(config);
        testcontract = await eosvram.contract(code);
        done();
      } catch (e) {
        done(e);
      }
    })();
  });

  it('reg and read package', done => {
    (async () => {
      try {
        var key = await getCreateKeys(testuser);
        var content = Buffer.from('hello world', 'utf8');
        await testcontract.regitem({
          owner: testuser,
          new_item: {
            item_name: 'test.11',
            content,
            is_alias: 0,
            schema_scope: 'builtin',
            schema_name: 'text'
          }
        }, {
          authorization: `${testuser}@active`,
          broadcast: true,
          keyProvider: [key.active.privateKey],
          sign: true
        });
        var res = await readData({ user: testuser, key: 'test.11' });
        assert.equal(res.row.content.toLowerCase(), content.toString('hex').toLowerCase(), 'wrong content');
        done();
      } catch (e) {
        done(e);
      }
    })();
  });
});

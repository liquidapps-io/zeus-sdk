import { assert } from 'chai';
import 'mocha';
require('babel-core/register');
require('babel-polyfill');

const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const getDefaultArgs = require('../extensions/helpers/getDefaultArgs');
const { getEos, getCreateAccount, getCreateKeys } = require('../extensions/tools/eos/utils');
const delay = ms => new Promise(res => setTimeout(res, ms));

var args = getDefaultArgs();
var systemToken = (args.creator !== 'eosio') ? 'EOS' : 'SYS';

async function genAllocateEOSTokens(account) {
  const keys = await getCreateAccount(account, args);
  const { creator } = args;
  var eos = await getEos(creator, args);
  let servicesTokenContract = await eos.contract('eosio.token');

  await servicesTokenContract.issue({
    to: account,
    quantity: `10000.0000 ${systemToken}`,
    memo: 'seed transfer'
  }, {
    authorization: `eosio@active`,
    broadcast: true,
    sign: true
  });
}

const contractCode = 'airhodl';
var contractArtifact = artifacts.require(`./${contractCode}/`);
var tokenContract = artifacts.require(`./Token/`);
describe(`${contractCode} Contract`, () => {
  var testcontract;
  var disttokenContract;
  const code = 'auction1';
  const distokenSymbol = 'NEW';
  const disttoken = 'distoken';
  const testuser1 = 'testuser1';
  const testuser2 = 'testuser2';
  const testuser3 = 'testuser3';
  const savings_account = 'savinga';
  var eos;
  before(done => {
    (async() => {
      try {
        var deployedContract = await deployer.deploy(contractArtifact, code);
        var deployedToken = await deployer.deploy(tokenContract, disttoken);
        disttokenContract = await deployedToken.eos.contract(disttoken);

        await getCreateAccount(savings_account, args);

        eos = deployedContract.eos;
        await genAllocateEOSTokens(testuser1);
        await genAllocateEOSTokens(testuser2);
        await genAllocateEOSTokens(testuser3);

        testcontract = await eos.contract(code);

        try {
          await disttokenContract.create(disttoken, `10000000000.0000 ${distokenSymbol}`, {
            authorization: `${disttoken}@active`,
            broadcast: true,
            sign: true
          });
        }
        catch (e) {

        }

        console.error('init airhodl');


        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });

  const _selfopts = {
    authorization: [`${code}@active`]
  };


  it('stub', done => {
    (async() => {
      try {
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });


});

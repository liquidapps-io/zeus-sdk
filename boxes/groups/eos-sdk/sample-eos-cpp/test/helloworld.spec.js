const { assert } = require('chai');
require('mocha');



const artifacts = require('../extensions/tools/eos/artifacts');
const deployer = require('../extensions/tools/eos/deployer');
const eosUtils = require('../extensions/tools/eos/utils');

const code = 'helloworld';
var contract = artifacts.require(`./${code}/`);
describe(`${code} Contract`, () => {
  const _selfopts = {
    authorization: [`${code}@active`]
  };

  it(`${code} - hi`, done => {
    (async () => {
      var helloworldContractInstance = await deployer.deploy(contract, code);
      return helloworldContractInstance.contractInstance.hi({ number: 123 }, _selfopts);
    })().then(() => done(), (err) => done(err));
  });
});

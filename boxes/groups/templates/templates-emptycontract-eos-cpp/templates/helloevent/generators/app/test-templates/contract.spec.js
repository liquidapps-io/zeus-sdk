
require('mocha');

const { requireBox } = require('@liquidapps/box-utils');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');

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
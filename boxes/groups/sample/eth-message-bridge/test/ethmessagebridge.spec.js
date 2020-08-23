require('mocha');
const { requireBox } = require('@liquidapps/box-utils');
const Web3 = require('web3');
const { assert } = require('chai'); // Using Assert style
const { getLocalDSPEos, getCreateAccount, getNetwork } = requireBox('seed-eos/tools/eos/utils');
const { loadModels } = requireBox('seed-models/tools/models');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getEosWrapper } = requireBox('seed-eos/tools/eos/eos-wrapper');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens, createLiquidXMapping } = requireBox('dapp-services/tools/eos/dapp-services');
const delay = ms => new Promise(res => setTimeout(res, ms));

const contractCode = '';
const ctrt = artifacts.require(`./${contractCode}/`);

const provider = new Web3.providers.HttpProvider('http://localhost:8545');
const web3 = new Web3(provider);

describe(`Token bridge Test`, () => {
  let testcontract;
  before(done => {
    (async () => {
      try {
      }
      catch (e) {
        done(e);
      }
    })();
  });

  it('"Hello Eth" from eos to eth', done => {
    (async () => {
      try {
      } catch(e) {
        done(e);
      }
    })()
  });

  it('"Hello Eos" from eth to eos', done => {
    (async () => {
      try {
      } catch(e) {
        done(e);
      }
    })()
  });
});


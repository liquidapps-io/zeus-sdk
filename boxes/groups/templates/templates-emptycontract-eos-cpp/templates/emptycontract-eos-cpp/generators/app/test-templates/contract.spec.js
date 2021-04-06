require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const { assert } = require('chai'); // Using Assert style
const { getCreateKeys } = requireBox('eos-keystore/helpers/key-utils');
const { getNetwork, getTestContract, getUrl } = requireBox('seed-eos/tools/eos/utils');
const getDefaultArgs = requireBox('seed-zeus-support/getDefaultArgs');

const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens, readVRAMData } = requireBox('dapp-services/tools/eos/dapp-services');
const { loadModels } = requireBox('seed-models/tools/models');

const fetch = require('node-fetch');
const eosjs2 = require('eosjs');
const { JsonRpc, Api, Serialize } = eosjs2;
const url = getUrl(getDefaultArgs());
const rpc = new JsonRpc(url, { fetch });

const contractCode = '<%- contractname %>';
const ctrt = artifacts.require(`./${contractCode}/`);
const { awaitTable, getTable, delay } = requireBox('seed-tests/lib/index');

describe(`${contractCode} Contract`, () => {
    const getTestAccountName = (num) => {
        let fivenum = num.toString(5).split('');
        for (let i = 0; i < fivenum.length; i++) {
            fivenum[i] = String.fromCharCode(fivenum[i].charCodeAt(0) + 1);
        }
        fivenum = fivenum.join('');
        let s = '111111111111' + fivenum;
        let prefix = 'test';
        s = prefix + s.substr(s.length - (12 - prefix.length));
        console.log(s);
        return s;
    };
    const code = getTestAccountName(Math.floor(Math.random() * 1000));
    let account = code;
    let chainId;
    let endpoint;
    before(done => {
        (async () => {
            try {
                const deployedContract = await deployer.deploy(ctrt, code);
                const services = await loadModels('dapp-services');
                for (let i = 0; i < services.length; i++) {
                    let service = services[i];
                    await genAllocateDAPPTokens(deployedContract, service.name);
                }
                // create token
                endpoint = "http://localhost:13015";
                const testcontract = await getTestContract(code);

                let info = await rpc.get_info();
                chainId = info.chain_id;
                let res = await testcontract.xvinit({
                    chainid: chainId
                }, {
                    authorization: `${code}@active`,
                });

                const selectedNetwork = getNetwork(getDefaultArgs());
                const config = {
                    expireInSeconds: 120,
                    sign: true,
                    chainId: selectedNetwork.chainId
                };
                if (account) {
                    const keys = await getCreateKeys(account);
                    config.keyProvider = keys.active.privateKey;
                }
                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('test1', done => {
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

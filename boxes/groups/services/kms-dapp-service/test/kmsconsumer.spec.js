require('mocha');

const { requireBox } = require('@liquidapps/box-utils');
const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');

var contractCode = 'eosio.token';
var serviceName = 'kns'
var ctrt = artifacts.require(`./${contractCode}/`);

describe(`KMS Service Contract`, () => {
    var testcontract;

    var testUser = "tt11";

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
    const code = 'testkms';
    var account = code;
    before(done => {
        (async () => {
            try {
                var deployedContract = await deployer.deploy(ctrt, code);
                await genAllocateDAPPTokens(deployedContract, serviceName);
                const { getTestContract } = requireBox('seed-eos/tools/eos/utils');
                testcontract = await getTestContract(code);


                done();
            }
            catch (e) {
                done(e);
            }
        })();
    });

    it('kms set secret', done => {
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

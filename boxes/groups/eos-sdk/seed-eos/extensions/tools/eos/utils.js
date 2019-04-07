const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');
const getDefaultArgs = require('../../helpers/getDefaultArgs');
const Eos = require('eosjs');
const { PrivateKey } = require('eosjs-ecc')


let networks = {
    "development": {
        chainId: "",
        host: "127.0.0.1",
        port: 8888,
        secured: false
    },
    "jungle": {
        chainId: "",
        host: "127.0.0.1",
        port: 8888,
        secured: false
    },
    "kylin": {
        chainId: "5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191",
        host: "api.kylin.eoseco.com",
        port: 80,
        secured: false
    },
    "mainnet": {
        chainId: "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906",
        host: "bp.cryptolions.io",
        port: 8888,
        secured: false
    }
}
if (fs.existsSync(path.resolve("../../../zeus-config.js"))) {
    const zeusConfig = require("../../../zeus-config");
    networks = zeusConfig.chains.eos.networks;
}

function getNetwork(args) {
    const selectedNetwork = networks[args.network];
    if (!selectedNetwork)
        throw new Error(`network not found (${args.network})`);
    return selectedNetwork;
}

function getUrl(args) {
    const selectedNetwork = getNetwork(args);
    return `http${selectedNetwork.secured ? "s" : ""}://${selectedNetwork.host}:${selectedNetwork.port}`;
}

const execPromise = function(cmd, options) {
    return new Promise(function(resolve, reject) {
        exec(cmd, options, function(err, stdout) {

            if (err) {
                err.stdout = stdout;
                return reject(err);
            }
            resolve(stdout);
        });
    });
}

async function createKeys(args = getDefaultArgs()) {
    var key = await PrivateKey.randomKey();
    return {
        privateKey: key.toWif(),
        publicKey: key.toPublic().toString(),
    }
}

async function createAccount(wallet, creator, account, args = getDefaultArgs()) {
    var newKeys = await getCreateKeys(account, args);
    var eos = await getEos(creator, args);
    var pubkey = newKeys.publicKey;

    await eos.newaccount({
        creator,
        name: account,
        owner: pubkey,
        active: pubkey
    });
    newKeys.account = account;
    return newKeys;
}

async function loadKeys(fullPath) {
    // check if file exists
    if (fs.existsSync(fullPath)) {
        return JSON.parse(fs.readFileSync(fullPath).toString());
    }
}

async function saveKeys(fullPath, keys) {
    // generate 
    // console.log("fullPath",fullPath,keys);
    fs.writeFileSync(fullPath, JSON.stringify(keys));
    return keys;
}
async function getCreateKeys(account, args = getDefaultArgs(), dontCreateIfHaveKeys) {
    const { wallet, storagePath, network } = args;
    // check if private key exists.
    var accountDir = path.resolve(storagePath, 'networks', network, 'accounts');
    var accountPath = path.join(accountDir, `${account}.json`);
    if (!fs.existsSync(accountDir))
        await execPromise(`mkdir -p ${accountDir}`);
    var existingKeys = await loadKeys(accountPath);
    if (existingKeys && dontCreateIfHaveKeys)
        return existingKeys;
    existingKeys = existingKeys || await saveKeys(accountPath, await createKeys(args));
    return existingKeys;
}
async function getCreateAccount(account, args = getDefaultArgs(), dontCreateIfHaveKeys) {
    const { creator, stake } = args;
    var existingKeys = await getCreateKeys(account, args, dontCreateIfHaveKeys);
    // import keys if needed


    // import keys if needed
    var systemToken = (creator !== 'eosio') ? "EOS" : "SYS";
    var staking = stake;
    if (creator != account) {
        try {
            var eos = await getEos(creator, args);
            var pubkey = existingKeys.publicKey;
            // console.log(account,existingKeys);

            await eos.transaction(tr => {
                tr.newaccount({
                    creator,
                    name: account,
                    owner: pubkey,
                    active: pubkey
                })

                tr.buyram({
                    payer: creator,
                    receiver: account,
                    quant: `${staking} ${systemToken}`
                })

                tr.delegatebw({
                    from: creator,
                    receiver: account,
                    stake_net_quantity: `${staking} ${systemToken}`,
                    stake_cpu_quantity: `${staking} ${systemToken}`,
                    transfer: 0
                })
            }, {
                authorization: `${creator}@active`,
                keyProvider: [args.creatorKey]
            });
            // eos.newaccount(creator,account,existingKeys.publicKey,existingKeys.publicKey,`${staking} ${systemToken}`);
        }
        catch (e) {
            // console.log('account already exist', e);
        }
    }
    // give some SYS/EOS
    return existingKeys;
}
const getEos = async(account, args = getDefaultArgs()) => {
    var selectedNetwork = getNetwork(args);
    var config = {
        expireInSeconds: 120,
        sign: true,
        chainId: selectedNetwork.chainId,
    };

    if (account) {
        if (account == args.creator) {
            config.keyProvider = args.creatorKey;
        }
        else {
            var keys = await getCreateKeys(account, args, true);
            config.keyProvider = keys.privateKey;
        }
    }

    var endpoint = getUrl(args);
    if (endpoint.toLocaleLowerCase().startsWith('https')) {
        config.httpsEndpoint = endpoint;
    }
    else {
        config.httpEndpoint = endpoint;
    }

    const eos = new Eos(config);
    return eos;
}
const uploadContract = async(args, name, contract) => {
    var wasm = fs.readFileSync(path.join(contract, `${path.basename(contract)}.wasm`));
    var abi = fs.readFileSync(path.join(contract, `${path.basename(contract)}.abi`));

    var eos = await getEos(name, args);
    // Publish contract to the blockchain
    try {
        await eos.setcode(name, 0, 0, wasm) // @returns {Promise}
    }
    catch (e) {
        var eobj = JSON.parse(e);
        if (eobj.code == 500 && eobj.error.name == "set_exact_code") {

        }
        else throw eobj;
    }
    await eos.setabi(name, JSON.parse(abi)) // @returns {Promise}
}


const uploadSystemContract = async(args, name, contract) => {
    contract = contract || name;
    await uploadContract(args, name, `${path.resolve('.')}/contracts/eos/${contract}`);
}

module.exports = { execPromise, createKeys, createAccount, getCreateAccount, getNetwork, getUrl, uploadSystemContract, uploadContract, getEos, getCreateKeys };

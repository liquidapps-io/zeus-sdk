const ecc = require('eosjs-ecc');

const getSecret = async(id) => {

}
const setSecret = async(id, value) => {

}

const generateRandomSecret = async() => {

}
const getCreateSecret = async(id, allowCreate, secretValue) => {
    // get
    var currentSecret = await getSecret(id);
    if (currentSecret) {
        if (secretValue) throw new Error(`secret ${id} already exist`);
        return currentSecret;
    }
    if (!allowCreate) throw new Error(`secret ${id} already exist`);
    if (!secretValue)
        secretValue = await generateRandomSecret();
    await setSecret(id, secretValue);
    return secretValue;


}

// https://github.com/bitcoinjs/bip44-constants
const getKeyPairFromSeedBIP_0044 = (seed, path) => {
    var keytype = "";
    let privateKey;
    let publicKey;

    switch (keytype) {
        case 'EOS':
            break;
        case 'ETH':
            break;
        case 'BTC':
            break;
        default:
            // code
    }
    return { privateKey, publicKey };
}

const getCreateKeyPair = async(id, path, allowCreate) => {
    var secret = await getCreateSecret(id, allowCreate);
    return getKeyPairFromSeedBIP_0044(secret, path);

}
module.exports = { getCreateSecret, getKeyPairFromSeedBIP_0044, getCreateKeyPair, getSecret, setSecret, generateRandomSecret };

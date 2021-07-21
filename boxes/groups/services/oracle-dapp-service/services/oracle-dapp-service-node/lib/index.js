const checkAddressPrefix = (address, payer) => {
    const fullAddress = process.env[`ORACLE_PREFIX_${payer.toUpperCase()}_${address.toUpperCase()}`];
    if(fullAddress) {
        return `${fullAddress}`
    }
    return address;
}

module.exports = {
    checkAddressPrefix
}
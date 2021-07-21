module.exports = async({ proto, address }) => {
    const content = Buffer.from(address,'base64').toString();
    return Buffer.from(content,'utf8');
};

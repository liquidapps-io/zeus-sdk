const fetch = require('node-fetch');

function split2(str, separator, limit) {
  limit--;
  str = str.split(separator);

  if (str.length > limit) {
    const ret = str.splice(0, limit);
    ret.push(str.join(separator));

    return ret;
  }

  return str;
}
module.exports = async({ proto, address }) => {
  const parts = split2(address, '/', 2);
  const body = Buffer.from(parts[0], 'base64').toString();
  address = parts[1];
  proto = proto.split("+")[0];
  const r = await fetch(`${proto}://${address}`, { method: 'POST', body });
  return Buffer.from(await r.text());
};

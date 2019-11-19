const fetch = require('node-fetch');

module.exports = async({ proto, address }) => {
  proto = proto.split("+")[0];
  const r = await fetch(`${proto}://${address}`, { method: 'GET' });
  return Buffer.from(await r.text());

};

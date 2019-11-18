const fetch = require('node-fetch');
const extractPath = (item, field) => {
  const fieldPath = field.split('.');
  const res = fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], item);
  if (res)
    return Buffer.from(res.toString(), 'utf8');
};
const headers = { 'Content-Type': 'application/json' };


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
  const field = parts[0];
  const urlPart = parts[1];
  proto = proto.split("+")[0];
  const r = await fetch(`${proto}://${urlPart}`, { method: 'GET', headers });
  const item = await r.json();
  return extractPath(item, field);
};

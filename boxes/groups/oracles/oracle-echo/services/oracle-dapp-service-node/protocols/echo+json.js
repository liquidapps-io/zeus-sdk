const extractPath = (item, field) => {
  const fieldPath = field.split('.');
  const res = fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], item);
  if (res)
    return Buffer.from(res.toString(), 'utf8');
};
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
  const content = Buffer.from(parts[1],'base64').toString();
  const item = JSON.parse(content);
  return extractPath(item, field);
};

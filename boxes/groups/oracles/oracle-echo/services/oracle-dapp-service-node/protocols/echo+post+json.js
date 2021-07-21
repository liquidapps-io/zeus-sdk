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
const extractPath = (item, field) => {
  const fieldPath = field.split('.');
  const res = fieldPath.reduce((accumulator, currentPathPart) => accumulator[currentPathPart], item);
  if (res)
    return Buffer.from(res.toString(), 'utf8');
};
module.exports = async({ proto, address }) => {
  const parts = split2(address, '/', 3);
  const field = parts[0];
  const content = Buffer.from(parts[2],'base64').toString();
  const item = JSON.parse(content);
  return extractPath(item, field);
};

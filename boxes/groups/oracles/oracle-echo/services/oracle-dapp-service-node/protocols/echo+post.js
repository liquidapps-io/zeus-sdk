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
  content = Buffer.from(parts[1],'base64').toString();
  return Buffer.from(content,'utf8');
};

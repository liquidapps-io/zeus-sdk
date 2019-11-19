module.exports = async({ proto, address }) => {
  const parts = address.split('/');
  const range = parseInt(parts[0]);

  return new Buffer(Math.floor(Math.random() * range).toString());
};

const { execPromise } = require('../../helpers/_exec');

module.exports = async (args) => {
  await execPromise('cd client && npm run build');
}
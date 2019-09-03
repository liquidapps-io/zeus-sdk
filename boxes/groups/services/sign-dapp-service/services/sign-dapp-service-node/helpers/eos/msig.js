const { getEos } = require('./eosProvider');
const consts = require('../../consts');

async function proposeAction(proposalName, actionData) {
  const eos = getEos();
  try {
    // propose action
  } catch(e) {
    // check if action was already proposed, if so approve
  }
}

async function approveAction(proposalName) {
  const eos = getEos();

}

async function execAction(proposalName) {
  const eos = getEos();

}

module.exports = {
  proposeAction,
  approveAction,
  execAction
};

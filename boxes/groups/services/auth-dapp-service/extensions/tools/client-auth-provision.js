const { getCreateKeys } = require('./utils');
const { loadModels } = require('../models');
const fetch = require('node-fetch');


const getEndpointForContract = ({
  payer,
  service
}) => {
  return "http://localhost:13015";
};
module.exports = { getEndpointForContract };

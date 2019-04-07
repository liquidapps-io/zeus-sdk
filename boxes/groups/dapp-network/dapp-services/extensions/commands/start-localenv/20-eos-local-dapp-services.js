const providerRunHandler = require('../run/dapp-services-node');


const artifacts = require('../../tools/eos/artifacts');
const deployer = require('../../tools/eos/deployer');
const { getCreateAccount } = require('../../tools/eos/utils');

const { dappServicesContract } = require("../../tools/eos/dapp-services")
const servicescontract = dappServicesContract;
var servicesC = artifacts.require(`./dappservices/`);


async function deployLocalExtensions() {
    var deployedContract = await deployer.deploy(servicesC, servicescontract);
    var provider = "pprovider1";
    var key = await getCreateAccount(provider);
    var blocksPerSecond = 2;
    var blocksPerMinute = 60 * blocksPerSecond;
    var blocksPerHour = 60 * blocksPerMinute;
    var blocksPerDay = 24 * blocksPerHour;
    var blocksPerYear = 365 * blocksPerDay;
    var numberOfBlocksToTwice = blocksPerYear;
    var inflation = 0.02;
    await deployedContract.contractInstance.create({
        maximum_supply_amount: 5000000000 * 10000,
        inflation_per_block: Math.pow(1.00 + inflation, 1.0 / (numberOfBlocksToTwice)) - 1.0,
        inflation_starts_at: new Date().getTime()
    }, {
        authorization: `${servicescontract}@active`,
        broadcast: true,
        sign: true
    });
    await deployedContract.contractInstance.issue({
        to: servicescontract,
        quantity: "1000000000.0000 DAPP",
        memo: ""
    }, {
        authorization: `${servicescontract}@active`,
        broadcast: true,
        sign: true,
    });


    return deployedContract;
}

module.exports = async(args) => {
    await deployLocalExtensions();
    return providerRunHandler.handler(args);
};

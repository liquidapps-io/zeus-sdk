const { emojMap, execPromise } = require("../../helpers/_exec");
var path = require('path');

var cmd = 'dapp-cluster';
module.exports = {
    description: "setup a cluster",
    builder: (yargs) => {
        yargs.option('key', {
            describe: 'active private key for DSP',
            default: ""
        }).option('snapshot', {
            describe: 'load from latest snapshot',
            default: "true"
        }).option('full-replay', {
            describe: 'full replay',
            default: "false"
        }).option('dappservices-contract', {
            describe: 'dappservices contract account (only for testing)',
            default: "dappservices"
        }).option('dappservices-contract-logs', {
            describe: 'log service contract account (only for testing)',
            default: "logservices1"
        }).option('dappservices-contract-ipfs', {
            describe: 'ipfs service contract account (only for testing)',
            default: "ipfsservice1"
        }).option('cluster-name', {
            describe: 'helm release name',
            default: "dsp"
        }).demandOption(['key']);
    },
    command: `${cmd} <dspaccount>`,
    handler: async(args) => {
        var helmargs = [
            `--set eosnode.snapshot=${args['snapshot'] == 'true'}`,
            `--set eosnode.replay=${args['full-replay'] == 'true'}`,
            `--set dspnode.contracts.dappservices=${args['dappservices-contract']}`,
            `--set dspnode.contracts.ipfs=${args['dappservices-contract-ipfs']}`,
            `--set dspnode.contracts.logs=${args['dappservices-contract-logs']}`,
            `--set dspnode.dspaccount=${args['dspaccount']}`,
            `--set dspnode.dspkey=${args['key']}`
        ];
        try {
            await execPromise(`helm install ${helmargs.join(' ')} . --name ${args['cluster-name']}`, { cwd: path.resolve('./dapp-dsp-k8s-helm') });
        }
        catch (e) {
            console.log(emojMap.white_frowning_face + "failed", e);
            return;
        }
        console.log(emojMap.ok + `launching cluster`);
    }
}

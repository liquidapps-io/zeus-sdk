const { requireBox } = require('@liquidapps/box-utils');
const { saveModel } = requireBox('seed-models/tools/models');
var SnapshotHelpers = requireBox('airdrop/tools/snapshot-storage').default;
var cmd = 'create';

module.exports = {
    description: "create airdrop",
    builder: (yargs) => {
        yargs.option('account-cap', {
            describe: 'maximum tokens per account',
            default: ''
        }).option('prefix', {
            describe: '',
            default: ''
        }).option('grab-memo', {
            describe: 'memo every account will get on "issue" after grab',
            default: 'Congrats, You can claim {{TKN}} tokens provided to you through an airdrop'
        }).option('notify-memo', {
            describe: 'memo format every account will get on "issueairdrop"',
            default: ''
        }).option('storage-type', {
            describe: 'snapshot storage type (s3)',
            default: 's3'
        }).option('snapshot-url-format', {
            describe: 'snapshot url format',
            default: 'https://www.eossnapshots.io/data/{{YYYY}}-{{MM}}/{{YYYY}}{{MM}}{{DD}}_account_snapshot.csv'
        }).option('bucket', {
            describe: '',
        }).option('prefix', {
            describe: '',
        }).option('date', {
            describe: '',
        }).option('token-contract', {
            describe: '',
        }).option('airdrop-contract', {
            describe: '',
        }).option('issuer', {
            describe: '',
        }).demandOption(['token-contract', 'airdrop-contract', 'bucket', 'issuer', 'date']).example(`$0 create ${cmd} my-airdrop1 100000.0000 TKN --token-contract mytoken11111 --airdrop-contract airdrops1234 --date 2019-04-01 --issuer theissuer1 --bucket myairdrops.s3.bucket`);
    },
    command: `${cmd} <name> <quantity> <token-symbol>`,
    handler: async (args) => {
        var model = {
            name: args["name"],
            storage: {
                type: args["storage-type"],
                bucket: args["bucket"],
                prefix: args["prefix"]
            },
            quantity: args["quantity"],
            token_symbol: args["token-symbol"],
            token_contract: args["token-contract"],
            date: args["date"],
            issuer: args["issuer"],
            account_cap: args["account-cap"],
            snapshot_url_format: args["snapshot-url-format"],
            grab_memo: args['grab-memo'],
            notify_memo: args['notify-memo'],
            airdrop_contract: args['airdrop-contract']
        };
        // save model locally
        await saveModel('airdrops', model.name, model);
        // save model in storage (s3) under bucket/prefix/name/model.json
        var snapshotHelpers = await SnapshotHelpers(args);
        await snapshotHelpers.handler.saveModel(model);
    }
}

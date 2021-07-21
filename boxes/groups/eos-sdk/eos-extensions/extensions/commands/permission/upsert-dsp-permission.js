const { emojMap, execPromise } = require('../../helpers/_exec');
var { loadModels } = require('../../tools/models');
var { getEosWrapper } = require('../../tools/eos/eos-wrapper');

var cmd = 'upsert-dsp-permission';
module.exports = {
  description: 'add a DSP permission so the consumer can be billed',
  builder: (yargs) => {
    yargs.option('endpoint', {
        describe: 'EOS node endpoint'
    }).option('contract', {
        describe: 'consumer contract name'
    }).option('key', {
      describe: 'active private key for consumer contract'
    }).option('providers', {
      describe: 'comma deliminated list of providers: provider1,provider2,provider3'
    }).option('services', {
      describe: 'comma deliminated list of services: ipfs,oracle,vaccounts'
    }).demandOption(['key','contract','endpoint','providers','services']);
  },
  command: `${cmd} <endpoint> <contract> <key> <providers> <services>`,
  handler: async(args) => {
    let contract = args.contract;
    let providers = args.providers.split(",");
    let services = args.services.split(",");

    var config = {
        httpEndpoint: args.endpoint,
        keyProvider: [args.key],
        expireInSeconds: 120,
        sign: true,
        broadcast: true,
        blocksBehind: 10,
    }

    var models = await loadModels('dapp-services');
    var eos = await getEosWrapper(config);
    let auth = providers.map(p=>{
        return {
            permission: { actor: p, permission: 'active' },
            weight: 1,
        }
    });

    try{
        console.log(`Updating 'dsp' permission on '${contract}'`);
        await (await eos.contract('eosio')).updateauth({
            account: contract,
            permission: 'dsp',
            parent: 'active',
            auth: {
                threshold: 1,
                keys: [],
                accounts: auth,
                waits: []
            }
        }, { authorization: `${contract}@active` });
    } catch(e) {
        console.log(`Failed to update 'dsp' permission on '${contract}'`);
    }
    
    try {
        console.log(`Linking xactions to 'dsp' permission on '${contract}'`);
        await Promise.all(services.map(async(s) => {
            let model = models.find(m => m.name == s);
            let commandNames = Object.keys(model.commands);
            await Promise.all(commandNames.map(async(command) => {
                console.log(`Linking ${model.name}:x${command} to 'dsp' permission`);
                try {
                    await (await eos.contract('eosio')).linkauth({
                        account: contract,
                        code: contract,
                        type: `x${command}`,
                        requirement: 'dsp'
                    }, { authorization: `${contract}@active` });
                } catch(e) {
                    console.log(`Failed to link ${model.name}:x${command} to 'dsp' permission`);
                }                
            }));
        }))    
    } catch(e) {
        console.log(`Failed to link xactions to 'dsp' permission on '${contract}'`);
    }  
    console.log(emojMap.ok + ` dsp permission created and linked successfully`);
  }
};

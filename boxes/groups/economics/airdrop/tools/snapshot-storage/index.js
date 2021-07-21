const { requireBox } = require('@liquidapps/box-utils');
var s3StorageHandler = require('./s3').default;
var { loadModels } = requireBox('seed-models/tools/models');
var format = require('./format');
var { getEos } = requireBox('seed-eos/tools/eos/utils');

// factory
export default async function (args) {
    var model = (await loadModels('airdrops')).find(a => a.name === args['name']);
    var handler = new s3StorageHandler(args, model);
    var eos = await getEos(null, args);

    return {
        model,
        handler,
        format,
        eos
    }
}

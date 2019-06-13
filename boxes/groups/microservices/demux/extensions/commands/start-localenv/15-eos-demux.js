module.exports = (args) => {

    if (args.creator !== 'eosio') { return; } // only local
    var moreEnv = {
        TEST_ENV: 'true'
    };
    return require('../run/demux').handler(args);
};

var path = require('path');
var os = require('os');
var fs = require('fs');
var exec = require('child_process').exec;

var cmd = 'airdrop';

module.exports = {
    description: "create airdrop",
    builder: (yargs) => {
        yargs.example(`$0 create ${cmd} mytoken AIR`);
    },
    command: `${cmd} <token_contract> <token_symbol> <db_contract>`,
    handler:async (args)=>{


    }
}
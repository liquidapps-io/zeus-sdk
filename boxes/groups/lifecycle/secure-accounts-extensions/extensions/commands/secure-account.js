var path = require('path');
var os = require('os');
var fs = require('fs');
var exec = require('child_process').exec;

const execPromise = function(cmd,options) {
    return new Promise(function(resolve, reject) {
        exec(cmd,options, function(err, stdout) {
            
            if (err) {
                err.stdout = stdout;
                return reject(err);
            }
            resolve(stdout);
        });
    });
}
var cmd = 'secure-account';

module.exports = {
    description: "secures an account",
    builder: (yargs) => {
        yargs.example(`$0 ${cmd}`);
    },
    command: `${cmd} <account> <owner-key> <active-key>`,
    handler:async (args)=>{
    }
}
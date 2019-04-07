#!/usr/bin/env node

require("babel-core/register");
require("babel-polyfill");
const path = require("path");
var pm2 = require('pm2');
const platform = "ubuntu";
var command = process.argv[2];
switch (command) {
    case "reload":
        process.exit(0);
        break;
    case "kill":
        pm2.stop(__dirname + '/ecosystem.config.js', function(err, apps) {
            if (err) throw err;
            process.exit(0);
        })
        break;
    case "resurrect":
        pm2.start(__dirname + '/ecosystem.config.js', function(err, apps) {
            if (err) throw err;
            process.exit(0);
        });
        break;
    case undefined:
    case "":
    case null:
        console.log('installing dsp')
        pm2.connect(function(err) {
            if (err) {
                console.error(err);
                process.exit(2);
            }
            pm2.start(__dirname + '/ecosystem.config.js', function(err, apps) {
                if (err) throw err;
                pm2.startup("", { serviceName: "dsp" },
                    function(err, apps) {
                        pm2.disconnect(); // Disconnects from PM2
                        if (err) throw err
                        process.exit(0);
                    });
            })

        });
        break;
    default:
        throw new Error('unknown')
        // code
}

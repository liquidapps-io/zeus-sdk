const fs = require('fs');
const path = require('path');
const mapping = require('../helpers/_mapping');
const { execPromise } = require('../helpers/_exec');

module.exports = {
    description: 'Create, Add or Remove a Box',
    builder: (yargs) => {
        yargs
            .example(`$0 box create`)
            .example(`$0 box add liquidx-jungle 1.0.0 https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/0a98835c75debf2f1d875be8be39591501b15352f7c017799d0ebf3342668d2c.zip`)
            .example(`$0 box remove liquidx-jungle 1.0.0`)
    },
    command: 'box <option> [name] [boxVersion] [uri]',

    handler: async (args) => {
        // option to create a new box or add an exiting box
        if (args.option === 'create') {

            fs.copyFileSync(path.join(__dirname, '../resources/sample.gitignore'), './.gitignore');

            // const goIpfs = {
            //     "version": "v0.4.20",
            //     "distUrl": "https://s3.us-east-2.amazonaws.com/liquidapps.artifacts"
            // }
            const dependencies = {
                "is-wsl": "^2.0.0",
                "big-integer": "^1.6.36",
                "@liquidapps/box-utils": "^1.0.0",
                "bytebuffer": "^5.0.1",
                "chalk": "^2.4.1",
                "dotenv": "^6.1.0",
                "node-emoji": "^1.8.1",
                "nodemon": "^1.18.5",
                "prompt": "^1.0.0",
                "readline-sync": "^1.4.9",
                "sleep-promise": "^8.0.1",
                "stream-buffers": "^3.0.1",
                "temp": "^0.8.3",
                "add-dependencies": "^1.1.0",                
                "whatwg-fetch": "^2.0.4",
                "yargs": "^12.0.2",
                "fcbuffer": "^2.2.2"
            }

            await execPromise('npm init -y');
            let packageJson = JSON.parse(fs.readFileSync(path.resolve('./package.json')));
            if (packageJson.dependencies && Object.keys(packageJson).length) {
                packageJson.dependencies = { ...packageJson.dependencies, ...dependencies }
            } else {
                packageJson.dependencies = dependencies;
            }
            // packageJson["go-ipfs"] = goIpfs;
            fs.writeFileSync(`./package.json`, JSON.stringify(packageJson, null, 4), function (err) { if (err) throw err; });

            // default zeus-box.json options
            const json = {
                "version": "1.0.0",
                "ignore": [
                    ".gitignore"
                ],
                "commands": {
                    "Compile contracts": "zeus compile",
                    "Migrate contracts": "zeus migrate",
                    "Test contracts": "zeus test -c"
                },
                "hooks": {
                    "post-unpack": "echo hello",
                    "post-install": "git clone ..."
                },
                "install": {
                    "npm": {}
                },
                "dependencies": {}
            }
            fs.writeFileSync(`./zeus-box.json`, JSON.stringify(json, null, 4), function (err) { if (err) throw err; });
            console.log(`Wrote to ${process.cwd()}/zeus-box.json:\n`);
            console.log(JSON.stringify(json, null, 4));
        } else if (args.option === 'add') {
            // return error if name and uri are not present
            if (!args.name || !args.boxVersion || !args.uri) {
                console.log(`Be sure to include the name, version and uri: zeus box add liquidx-jungle 1.0.0 https://cloudflare-ipfs.com/ipfs/QmNksJqvwHzNtAtYZVqFZFfdCVciY4ojTU2oFZQSFG9U7B/index.html\n`)
                return;
            }
            mapping.add(args.storagePath, args.name, args.boxVersion, args.uri);
        } else if (args.option === 'remove') {
            // return error if name and uri are not present
            if (!args.name || !args.boxVersion) {
                console.log(`Be sure to include the name and version: zeus box remove liquidx-jungle 1.0.0\n`)
                return;
            }
            mapping.remove(args.storagePath, args.name, args.boxVersion);
        } else {
            console.log('Unknown zeus box option:', args.option);
        }
    }
};

const fs = require('fs');
const path = require('path');

module.exports = {
  description: 'Create or Add a Box',
  builder: (yargs) => {
    yargs
      .example(`$0 box create`)
      .example(`$0 box add liquidx-jungle https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/0a98835c75debf2f1d875be8be39591501b15352f7c017799d0ebf3342668d2c.zip`)
  },
  command: 'box <option> <name> [uri]',

  handler: async(args) => {
    // option to create a new box or add an exiting box
    if(args.option === 'create'){
        // check if path exists for creating new box
        if (!fs.existsSync(`./${args.name}`)){
            fs.mkdirSync(`./${args.name}`);
            // default zeus-box.json options
            const json = {
                "ignore": [
                    "README.md"
                ],
                "commands": {
                    "Compile contracts": "zeus compile",
                    "Migrate contracts": "zeus migrate",
                    "Test contracts": "zeus test"
                },
                "hooks": {
                    "post-unpack": "echo hello",
                    "post-install": "git clone ..."
                },
                "install":{
                    "npm": {}
                },
                "dependencies": []
            }
            // write file to ./box/zeus-box.json
            fs.writeFileSync(`./${args.name}/zeus-box.json`, JSON.stringify(json), function(err) { if (err) throw err; });
            console.log(`Added ./${args.name} directory and example zeus-box.json`)
        } else {
            console.log(`The path: ./${args.name} is taken`)
        }
    } else if (args.option === 'add'){
        // return error if name and uri are not present
        if(!args.name || !args.uri){
            console.log(`Be sure to include the name and uri: zeus box add liquidx-jungle https://cloudflare-ipfs.com/ipfs/QmNksJqvwHzNtAtYZVqFZFfdCVciY4ojTU2oFZQSFG9U7B/index.html\n`)
            return;
        }
        console.log('updating local mapping ', args.name);
        // find mapping file from global command directory
        const mappingFile = path.resolve(__dirname, '../mapping.js');
        const boxes = require('../mapping');
        // set boxname: ipfs://blah
        boxes[args.name] = args.uri;
        // write new mapping.js file
        fs.writeFileSync(path.resolve(mappingFile), `module.exports = ${JSON.stringify(boxes, null, 2)};`);
        console.log(`Added ${args.name}: ${args.uri}`);
      }
  }
};

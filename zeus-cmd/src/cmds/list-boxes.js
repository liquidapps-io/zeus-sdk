var mapping = require("../mapping");

module.exports = {
    description: "list canned boxes",
    builder: (yargs) => {
        yargs.example('$0 list-boxes');
    },
    command: 'list-boxes',
    handler:async (args)=>{
        console.log(Object.keys(mapping).join('\n'));
    }
}
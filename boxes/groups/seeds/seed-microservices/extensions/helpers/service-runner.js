const {execPromise} = require('./_exec') ;
const path = require('path');
const kill = require('kill-port');

module.exports = (filePath, port)=> {
    var cmd = path.basename(filePath, '.js');
    return {
    description: `runs the ${cmd} service`,
    builder: (yargs) => {
        yargs.option('port', {
                description: 'port to listen on',
                default: port || 8080
            }).example(`$0 run ${cmd}`);
    },
    command: `${cmd}`,
    handler:async (args)=>{
        try{ await kill(port); }catch(e){}
        var stdout = await execPromise(`PORT=${port} node services/${cmd}/index.js`, {
            env:{
                ...process.env, 
                ZEUS_ARGS: JSON.stringify(args),
                DAEMONIZE_PROCESS: true 
            }
        }); 
    }
}};
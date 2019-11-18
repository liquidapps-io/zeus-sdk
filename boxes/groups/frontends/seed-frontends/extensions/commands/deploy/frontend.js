var path = require('path');
var os = require('os');
var fs = require('fs');
var { execPromise, emojMap } = require('../../helpers/_exec');
var getDefaultArgs = require('../../helpers/getDefaultArgs');

var { getEos } = require('../../tools/eos/utils');
var buildFrontend = require('../build/frontend');
var AuthClient = require('../../tools/auth-client');

var cmd = 'frontend';

module.exports = {
  description: 'deploy frontend',
  builder: (yargs) => {
    yargs.option('ipfs', {
      // describe: '',
      default: true
    }).option('storage-provider', {
      // describe: '',
      default: ''
    }).option('storage-account', {
      // describe: '',
      default: ''
    }).option('storage-key', {
      // describe: '',
      default: ''
    }).option('register', {
      // describe: '',
      default: false
    }).option('register-dns', {
      // describe: '',
      default: false
    }).option('register-name', {
      // describe: '',
      default: ''
    }).option('nodeos-endpoint', {
      // describe: '',
      default: ''
    }).option('build', {
      // describe: '',
      default: true
    }).example(`$0 ${cmd}`);
  },
  command: `${cmd} <frontend>`,
  handler: async(args) => {
    if (args.frontend) {
      if (args.build) { await buildFrontend.handler(args); }

      console.log(emojMap.cloud + 'deploying frontend', args.frontend);
      if (args['storage-provider']) {
        // tar
        var filename = 'frontend-staging.tar';
        var stdout = await execPromise(`${process.env.TAR || 'tar'} cvf ${filename} build`, {
          cwd: path.join(path.resolve('./frontends'), args.frontend)
        });
        var apiID = `${args['storage-provider']}-storage`;
        var authClient = new AuthClient(apiID, 'authenticato', null, args['nodeos-endpoint']);
        var keys = { active: { privateKey: args['storage-key'] } };
        const account = args['storage-account'];
        const permission = "active";
        var content = fs.readFileSync(path.join('./frontends', filename));

        const result = await authClient.invokeAuthedCall({ payload: { archive: { data: content.toString('hex') }, contract: account }, service: "liquidstorag", account, permission, keys, action: "upload_public", skipClientCode: true });
        // invalidate
        var hash = result.uri.split('/')[1];
        if (args.register) {
          var metadata = `{\\"enabled\\": true, \\"ipfshash\\":\\"${hash}\\", \\"name\\": \\"${account}\\"}`;
          var eos = await getEos(args.register, args);
          var contract = await eos.contract('dappnetwork1');
          await contract.regdapp(args.register, metadata);
          // TODO set LiquidDNS

        }
        var ipfsUrl = `https://ipfs.io/ipfs/${hash}`;


        console.log(emojMap.ok + `frontend deployed to ${ipfsUrl}`);
      }
      else if (args.ipfs) {
        var stdout = await execPromise(`${process.env.IPFS || 'ipfs'} add -r build`, {
          cwd: path.join(path.resolve('./frontends'), args.frontend)
        });
        var lines = stdout.split('\n');

        var hash = lines[lines.length - 2].split(' ')[1];
        var uri = `ipfs://${hash}`;
        var ipfsUrl = `https://ipfs.io/ipfs/${hash}`;

        if (args.register) {
          var metadata = `{\\"enabled\\": true, \\"ipfshash\\":\\"${hash}\\", \\"name\\": \\"${args.registerName || args.register}\\"}`;
          var eos = await getEos(args.register, args);
          var contract = await eos.contract('dappnetwork1');
          await contract.regdapp(args.register, metadata);
        }

        console.log(emojMap.ok + `frontend deployed to ${ipfsUrl}`);
      }
      else {
        var stdout = await execPromise(`${process.env.NPM || 'npm'} run deploy`, {
          // cwd: path.resolve("./contracts/eos")
          env: process.env,
          cwd: path.join(path.resolve('./frontends'), args.frontend)
        });
        console.log(stdout);
      }

      // console.log(stdout);
    }
    else {
      throw new Error('all not supported yet');
    }
  }
};

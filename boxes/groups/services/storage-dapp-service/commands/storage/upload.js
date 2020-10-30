const { requireBox } = require('@liquidapps/box-utils');
const { createClient } = requireBox("client-lib-base/client/dist/src/dapp-client-lib");
const { execPromise, emojMap } = requireBox('seed-zeus-support/_exec');
const fetch = require('isomorphic-fetch');
const fs = require('fs');
const path = require('path');

module.exports = {
  description: 'Upload a file, directory or archive to LiquidStorage IPFS',
  builder: (yargs) => {
    yargs
      .option('dsp-url', {
        describe: 'DAPP Service Provider endpoint',
        alias: 'u',
        default: 'http://127.0.0.1:13015'
      })
      .option('permission', {
        describe: 'permission to upload file',
        alias: 'p',
        default: 'active'
      })
      .option('raw-leaves', {
        describe: 'returns raw leaves URI for IPFS instead of pointer to all leaves',
        default: true
      })
      .example(`$0 storage upload 5jqee4kl1ns1 package.json 5J5hLqZrc3DvURBtwapKjpYH676QMmoZvFUy2NGkyeYv4ZuxxhK`)
      .example(`$0 storage upload 5jqee4kl1ns1 logs 5J5hLqZrc3DvURBtwapKjpYH676QMmoZvFUy2NGkyeYv4ZuxxhK`)
      .example(`$0 storage upload 5jqee4kl1ns1 YourTarBall.tar 5J5hLqZrc3DvURBtwapKjpYH676QMmoZvFUy2NGkyeYv4ZuxxhK`)
      .example(`$0 storage upload 5jqee4kl1ns1 package.json 5J5hLqZrc3DvURBtwapKjpYH676QMmoZvFUy2NGkyeYv4ZuxxhK --dsp-url http://kylin-dsp-2.liquidapps.io/`)
      .example(`$0 storage upload 5jqee4kl1ns1 package.json 5J5hLqZrc3DvURBtwapKjpYH676QMmoZvFUy2NGkyeYv4ZuxxhK --dsp-url http://kylin-dsp-2.liquidapps.io/ --permission upload`)
  },
  command: 'upload <contract> <path> <key>',

  handler: async (args) => {
    try {
      let data, response;
      const endpoint = args.dspUrl;
      const key = args.key;
      const permission = args.permission;
      const getClient = () => createClient({ httpEndpoint: endpoint, fetch });
      const service = await (await getClient()).service('storage', args.contract);
      const options = {
        rawLeaves: args.rawLeaves
      }
      // check if file exists
      if (!fs.existsSync(args.path)) {
        throw (`${args.path} does not exist\n`);
        // if file exists, check if path is dir
      } else if (fs.lstatSync(args.path).isDirectory()) {
        // if dir, tar dir and upload with archive
        console.log('Directory detected');
        const archiveName = `${path.basename(args.path)}.tar`
        await execPromise(`tar -cf ${archiveName} ${args.path}`);
        data = fs.readFileSync(archiveName);
        response = await service.upload_public_archive(
          data,
          key,
          permission,
          options
        );
        // rm archive
        await execPromise(`rm ${archiveName}`);
        // if is file
      } else if (fs.lstatSync(args.path).isFile()) {
        // check if archive
        if (args.path.includes(".tar")) {
          // if archive, use archive option
          console.log('Archive detected');
          data = fs.readFileSync(`${path.basename(args.path)}`);
          response = await service.upload_public_archive(
            data,
            key,
            permission,
            options
          );
        } else {
          // else is file, upload with file option
          console.log('File detected');
          data = fs.readFileSync(args.path);
          response = await service.upload_public_file(
            data,
            key,
            permission,
            options
          );
        }
      }
      console.log(emojMap.ok + 'Uploaded file: ' + response.uri);
    } catch (e) {
      console.log(`${emojMap.white_frowning_face} IPFS Upload failed\n`);
      // if command run without dapp client built, need to build
      if (e.code === "MODULE_NOT_FOUND") {
        console.log(`Build dapp-client by running "zeus start-localenv 01-dapp-client.js"`);
        return;
      }
      if (e.json) {
        throw (e.json.error);
      } else {
        throw (e);
      }
    }
  }
};

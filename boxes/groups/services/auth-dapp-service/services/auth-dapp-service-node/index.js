var { nodeFactory } = require('../dapp-services-node/generic-dapp-service-node');
var apiID = "ssAuthAPI";
var AuthClient = require('../../extensions/tools/auth-client');
// todo: periodically call "usage" 
// todo: add multisig signature from DSP
var permissionCode = "identify";
var permissionCodes = [permissionCode];

var authClient = new AuthClient(apiID, "authenticato");
nodeFactory('auth', {
  api: {
    get_code: async({ req, body }, res) => {
      var { publickey } = body;
      const clientCode = await authClient.getNewClientCode({ req, publickey });
      await authClient.addClientCode({ clientCode, permissionCodes });
      res.send(JSON.stringify({ code: clientCode }));

    },
    auth_account_call: async({ req, body }, res) => {
      try {

        await authClient.validate({ ...body, req, allowClientSide: false }, async({ clientCode, payload, account, permission }) => {
          if (!(await authClient.checkPermissions({ clientCode, permissionCode })))
            throw new Error('permissions error');
          var payload_hash = await authClient.hashData256(body.payload)
          res.send(JSON.stringify({ payload_hash, account, permission, client_code: clientCode }));
        });
      }
      catch (e) {
        res.status(400);
        console.error("error:", e);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    },
    auth_call: async({ req, body }, res) => {
      try {
        await authClient.validate({ ...body, req, allowClientSide: true }, async({ clientCode, payload, account, permission }) => {
          if (!(await authClient.checkPermissions({ clientCode, permissionCode })))
            throw new Error('permissions error');
          var payload_hash = await authClient.hashData256(body.payload)
          res.send(JSON.stringify({ payload_hash, account, permission, client_code: clientCode }));
        });
      }
      catch (e) {
        res.status(400);
        console.error("error:", e);
        res.send(JSON.stringify({ error: e.toString() }));
      }
    }
    // auth: async({ body }, res) => {
    //   var authRes = await auth(body);
    //   // res.send
    // }
  }
});

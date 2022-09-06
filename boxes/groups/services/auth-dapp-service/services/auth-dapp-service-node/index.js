const { requireBox } = require('@liquidapps/box-utils');
var { nodeFactory } = requireBox('dapp-services/services/dapp-services-node/generic-dapp-service-node');
var AuthClient = requireBox('auth-dapp-service/tools/auth-client');
// todo: periodically call "usage"
// todo: add multisig signature from DSP
var permissionCode = "identify";
var permissionCodes = [permissionCode];

var authClient = new AuthClient();
nodeFactory('auth', {
  api: {
    auth_account_call: async ({ req, body }, res) => {
      try {
        await authClient.validate({ ...body, req, allowClientSide: false }, async ({ clientCode, payload, account, permission }) => {
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
  }
});

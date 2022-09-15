require("mocha");
const { requireBox, getBoxesDir } = require('@liquidapps/box-utils');
const fs = require("fs");
const { assert } = require("chai"); // Using Assert style
const fetch = require("node-fetch");
const ecc = require("eosjs-ecc");
const { JsonRpc } = require("eosjs");
const {
  getTestContract,
  getCreateKeys,
} = requireBox('seed-eos/tools/eos/utils');
const { createClient } = requireBox("client-lib-base/client/dist/src/dapp-client-lib");
const artifacts = requireBox('seed-eos/tools/eos/artifacts');
const deployer = requireBox('seed-eos/tools/eos/deployer');
const { genAllocateDAPPTokens } = requireBox('dapp-services/tools/eos/dapp-services');
const { getIpfsFileAsBuffer } = requireBox("storage-dapp-service/services/storage-dapp-service-node/common.js")

//dappclient requirement
global.fetch = fetch;
var endpoint = "http://localhost:13015";

const rpc = new JsonRpc(endpoint, { fetch });

const contractCode = "thezeostoken";
const authContractCode = "authenticator";

var ctrtStorage = artifacts.require(`./${contractCode}/`);
var ctrtAuth = artifacts.require(`./${authContractCode}/`);

describe(`ZEOS Test`, async () => {
  var testcontract;
  const code = "thezeostoken";
  let dappClient;
  let storageClient;
  const boxDir = getBoxesDir();
  const permission = "active";
  const keys = await getCreateKeys(code);
  const key = keys.active.privateKey;

  before(done => {
    (async () => {
      try {
        dappClient = await createClient({
          httpEndpoint: endpoint,
          fetch,
        });
        vramClient = await dappClient.service('ipfs', code);
        storageClient = await dappClient.service("storage", code);
        var deployedStorage = await deployer.deploy(ctrtStorage, code);
        var deployedAuth = await deployer.deploy(ctrtAuth, "authentikeos");

        await genAllocateDAPPTokens(deployedStorage, "storage");
        await genAllocateDAPPTokens(deployedStorage, "ipfs");
        await genAllocateDAPPTokens(deployedStorage, "oracle", "pprovider1", "default");
        await genAllocateDAPPTokens(deployedStorage, "oracle", "pprovider2", "foobar");
        testcontract = await getTestContract(code);

        let info = await rpc.get_info();
        let chainId = info.chain_id;

        done();
      } catch (e) {
        done(e);
      }
    })();
  });
  
  it('ZEOS Upload groth16 verifier key and call setvk', done => {
    (async () => {
      try {
        const data = Buffer.from("14590b8a5810e748809975f79bb818a739b8f26770879eb834e9720117ebbec7a5b8c9b17886687428fc17982e00808e0141c3ddd4044c37fcd6f50fdc6f7c0e026e58cd7626996c59421377e9bdee23ab197b41469b4bd02bd94993c91c55180063ec11f58e351eb06c1a666153c9afd3a7a9828d0cbb4649f36f74b58d680a286a5ae143a06781c4e42eef537240c101ec066c0da8327d8f7a615acd5219c30a2d74d31aa21208d97cb36b7667487ba06449cedbbe8aa26bd82bca7213654108aee00c52b826dfa80f025414255ae597b8921ae9bb57438137e90032e299f700b3da8ee6899b4312df140b18b7452f0f6aa8ead1e950afe80aae9e30c7df9eb2addf41f0398f03168fda5c8a7aee305bbc3570507f282976fcc3afcfde8fc1095bd5b5486d77d8b113cb4c011732857a855f7d085dbd7427f94230000510e4d9c5dddce9009de4d89d68976412bb80049f08b4c6804306e0faf378a30bbcff3ded2fb5f71ca036a9641489ce2004f00f6314cca6efcc3110d20b2a7fec0cd102a87460cb3705ef2f5d8f3ba6303c544b580426fd3175186ebea182ed0e69f8e9e575fa15a07bf1a5cad6065043baa00023ecd090a1a4e1d02f055ffc49ef825dd357e92e0ff363792d8e7193a7b474d5d4bf456110c8f92f18525ea0c1568d092450b7ca77930e2a5ebf592d87b7b64c3ef5aa9e9f61e4597a06faf31ec4622576aa84dcbf2be9375e7a366a0741170e8b800579df0719c433b7f189d7408390841e895c6b3d341297b933f553d806559559a04f4c8972b9a1471608879e580f9be2b7148d152518a534e9210051d885ee936605da0fba97e9666bd9f291119d39600a2fb1484fb9f1907ec5bf211e0a74c9f4d023ac99cf938f11acabec86428e23b1451d02c3249aad4041f3ef66c9b8a2ec531bc6dbd49061d6cb649988119bc4fb25a669eb12b092a002136ace1184fc7237107f32276e20bcda8a7c8bb5063f5294e072e4d9c468c3fb1d387419d6d5ffd3338287ae6ca684d055204ee2f81efa6d54eb218299f51575c1d12ed619133cf2abf8ecd62f685dd5da8b6606e53491e164bdd71f1535c35329a19a60ce892955f8c6d1a4de03d8da6eae1fa4eeae5c8c0c9e041cd76f2ae8495b080ce08861b6df3f23b2331fb96337d270f5b8bb99b0009e4237494133cdfafa83747d31a18c6ab8d9060ea33e7d14ff5e000000030c38b9c8670f540c17cf9b033a4ae659c206c8662c6a2739a7c02b9f814b2e14a948c9606991b783de2945fd932ed2591548f8daa4bc35780949c79d346e001a3883cdaeaf89720a95f2ef046b2c6c02d6d9867bea27c186e250bd53e72ffc081319f58eff6d4cbb047be675df5c4e12234dea8a24983011a2edc6e4eb8fae5355a7d51bb425735b6237e6a619db965d0f76f13130d79d57c1ac71c5acea06b1ed536e315290b57a4e4355013c55ab76233190e085c599125a4ee73f1edc70f514623fbaac7447545f5bb35b6600b778d596e0f133f268e8a776941f6e645f8d7e650001d2a42b8808cacce15ba23acd0b903d5664607981ffe4df61c84b526818884f791f443aa126278737c6a8db552b2eddb134b7838f1e08e16452b34114", "utf8");
        const options = {
          rawLeaves: true
        };
        const result = await storageClient.upload_public_file(
          data,
          key,
          permission,
          options
        );
        
        // set vk ipfs hash on chain
        var res = await testcontract.setvk({
          code: "thezeostoken",
          id: "zeosgrothkey",
          vk: result.uri.substr(7),
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        
        // check if setvk was successful and correct key is in table
        res = await fetch(endpoint + '/v1/chain/get_table_rows', {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ code: 'thezeostoken', table: 'vk', scope: 'thezeostoken', index_position: 'primary', key_type: 'name', lower_bound: "zeosgrothkey", upper_bound: "zeosgrothkey" })
        });
        var resJson = await res.json();
        assert.equal(resJson.rows[0], "e0156c995e86a9fa317a6232726868664435586f4b57657031777278513678576a61694263787038666f50413344464451676d4a583673743450");
        assert.equal("zb2rhhfD5XoKWep1wrxQ6xWjaiBcxp8foPA3DFDQgmJX6st4P", result.uri.substr(7));
        
        // fetch vk back from liquidstorage and check if it's correct
        var vk_ipfs = result.uri.substr(7);
        res = await fetch(endpoint + '/v1/dsp/liquidstorag/get_uri', {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ uri: 'ipfs://' + vk_ipfs })
        });
        resJson = await res.json();
        var vk_str = Buffer.from(resJson.data, 'base64').toString();
        assert.equal(vk_str, data);
  
        done();
      } catch (e) {
        console.log(e);
        done(e);
      }
    })();
  });
  it('ZEOS verify groth16 proof', done => {
    (async () => {
      try {
        var res = await testcontract.verifyproof({
          type: "groth16",
          code: "thezeostoken",
          id: "zeosgrothkey",
          proof: "981855436af9b3bbdf87da586d9136cda3dbdf04000ec5d0df1ad8a2e3649033411a164efc183406f8d0f1ec1584e7e5849b3dbfa163e8744fe7d12f649c74b5ef444531a08ca85a87c567ddc3e0de0757b8fdf8222ef6890b1291549ca4f2751381726462c0fcd8894b509d3cf9ce0fe9f8d61f28399ddb6de2f0e63396766dec99db7f0da5e3c939dc5d28aa4aa9a998c4369acafee766c6884146ddd1012df0a6097f94f96ef84dabbb1e9bd37730fe419901ee5abe98e517def6fbd708ab",
          inputs: "0203a2313304977f312fdff49de507586a8da7b7dc0f08770c52da0ecf00491b050000000000000000000000000000000000000000000000000000000000000000",
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  
  it('ZEOS Upload halo2 verifier key and call setvk', done => {
    (async () => {
      try {
        const data = Buffer.from("040000001000000000000000040000000500000087f01e6687dd9c9144cad7973f11ca91ca505d3ce0d5ad3b8a2bfdf77ca0bc13435320f266fe919f23d45acebc29cafe7d8731c566c52d1a17fd06da4c05cc14c26664431703c69104322a985568b6a1b33e4393f186d0b2b59d9a093e7a103f8086f0af665701edece5f56ff0678b2be0759f8ae68819fcd361f1d42123f53c3d159a61f61c02028eb7804997268c9e66467ac85c6d672a7678a1a79d04d815c8ea659eaad7dffbfb2500e554d6d40c9ab98537a39298d589875e5862fb272a0200000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000080200000000000000eff8218a6e994053d7abd55bc09bbc9233932cbd8bdb324783821fc820a962233d159a61f61c02028eb7804997268c9e66467ac85c6d672a7678a1a79d04d81500000000000000000000000000000000000000000000000000000000000000100200000000000000a7a5b8d39422f313c8d5f93df56b610097d5f36e73367f25c526ddc95878182f31c9fc21181f2693fba502017c133a4e5181263719d67182508fa1c4a9e06f2c10b6de0c5c5b775474286ac7087fc811000c082b8df6e52a1a410e864a728f3dc7876a01dde0481164db457610e4ffaa4d235519c8325ee4736c09b7d53a5b1a0400000000000000618ad37f6fb96f47bdb16dce0cf6e9ae6b6d1afe42d768d94891889f1190f433e171fdbcf9be962bf61f01121387894f2a1677f126606ab520ef4a645005000be0017e2e9e385284f8c7aa9f5f44a2629b17d02ff80c73623ca0b7a8462a023d735cd09e1db4d393adb48bd25b476f5fc22e11cb8f3c19c42b6e3388ce016b32ae0b0bae18811b4837eb78f388275d6c30b35bc617cd474f3cb83115a63d023a2f271a8ed079c6040ce60d47530664dce6624345a43a1dc8921d2643b051e202578fc520c447cc9872dfa53c1869deee0ef7ac94338f0d71bc4e8c5045638500100b6193b91b441241b6aaa65498c67eda039b60c715752a5347f271e41d6918020000000000000002000000000000000100000000000000010000000000000001000000000000000100000000000000010000000000000003000000000000006d756c010000000000000000000000000000000100000000000000070000000200000001000000000000000100000000000000000000000600000007000000030000000000000000000000000000000000000000000000030000000100000000000000010000000000000000000000050000000300000002000000000000000000000000000000010000000100000000000000000000000000000001030000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000100000003000000000000000000000000000000000000000100000000000000000000000000000000000000010000000200000000000000020000000000000001000000000000000100000000000000000000000000000000000000020000000000000000000000000000000000000001000000000000000000000004000000000000000000000000000000020000000000000000000000010000000000000000000000000000000100000000000000000000000000000000000000010000000000000000000000000000000003000000000000004d1b722bf3eb6582aaaf747fadaed7feb3a1ed1c186f3e38855785dba765113e", "utf8");
        const options = {
          rawLeaves: true
        };
        const result = await storageClient.upload_public_file(
          data,
          key,
          permission,
          options
        );
        
        // set vk ipfs hash on chain
        var res = await testcontract.setvk({
          code: "thezeostoken",
          id: "zeoshalo2key",
          vk: result.uri.substr(7),
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        
        // check if setvk was successful and correct key is in table
        res = await fetch(endpoint + '/v1/chain/get_table_rows', {
          method: 'POST',
          mode: 'cors',
          body: JSON.stringify({ code: 'thezeostoken', table: 'vk', scope: 'thezeostoken', index_position: 'primary', key_type: 'name', lower_bound: "zeoshalo2key", upper_bound: "zeoshalo2key" })
        });
        var resJson = await res.json();
        assert.equal(resJson.rows[0], "e01514349a86a9fa317a62327268676954776f7270736f384b4e57376a6f6d5835355472567333504a6a4b50526a6b7a31696d4d38694a395931");
        assert.equal("zb2rhgiTworpso8KNW7jomX55TrVs3PJjKPRjkz1imM8iJ9Y1", result.uri.substr(7));
        
        // fetch vk back from liquidstorage and check if it's correct
        var vk_ipfs = result.uri.substr(7);
        res = await fetch(endpoint + '/v1/dsp/liquidstorag/get_uri', {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ uri: 'ipfs://' + vk_ipfs })
        });
        resJson = await res.json();
        var vk_str = Buffer.from(resJson.data, 'base64').toString();
        assert.equal(vk_str, data);
        
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
  it('ZEOS verify halo2 proof', done => {
    (async () => {
      try {
        var res = await testcontract.verifyproof({
          type: "halo2",
          code: "thezeostoken",
          id: "zeoshalo2key",
          proof: "2927b6b1fdb28fb12b7a158e7562ed18222d9604358cec532815c41991d252b4071c88f6a0badce8e2feee0cc2458fd27084fe9196adbf03bf849fec4e292713cd88f5e1c116670e5666f620a2cce7ef01d50abeb76fbfe1c92f84f9c9d25414b883d7f9564fce6c637724d934933f08275768753a3882e72793f12db0b050204e17c4de398701e9bae8cdf31d1acccfd0b30542b82f8e935375c1a6333ba73e4ff8a6d58ebc469cbc5b7b91767861323d27b00a178d113faade0c70fdee3f1c131961df833ede7d3f2f6c992139bef4d6211751fb8514f3d13e86733cd27811258f03d4cbf2b82495b3ad79a01309ac305e0aeb2eb21482cac342204963850d52da81becb1ca5b6a74d4b61501c7d9d91cfeea5f97192c3c50cd9424a438d3954f71f3de19c08e83d02b2ce8d7bfc0c4f00369dfa1eef7449b1bdadc1df3b13672442e6147476cbf0f185008d1b9cfb2aaa9c55fe0d618f8e6e3ec54647bb12ff2381548f8b3fa18b66c71fff12d06bb6f99616f872acb77c6e93d72636da2f959a75ea1fd3fc5e0fab6c58751e231a8f677a9d1d6213d7b92730bde93b2317c3ff0797f92490ac777b46a1161436d7e5b8cfa03116237c5e610cd3e170332b8d54509be626c48a9cfadb486cb9c92bc810b625b9f39ff935b6117f3268d2155c7c0b847cc5bc220022e631c37ae381149347749e9e942f4464bf5b8b0f42039fd60993fae5b82d9dbb9fb858f05730cdc18b3b98f2b1b6dda9b72f0280f029d9b36fb59b4d5c179e3a4d253996019edacad9b45b1e5fdc8558fa499575392662faf1acf918ed4a9e10f04f83473e8f68ff8ec6a18de6aa07db84b19c525439fb1a6e335d1cc5d562ab4089d460f1f76afcdc49c9318e7f799121bfbed66738911a8cbfa1696188f1d484922d60509ac84d7e5515f3d22c54533ce2f2fe9c14c637be9d1c51102e59cedbf5b57da29d9509d390ab876d36e7ebd85cab580f0e01d96f52c5c6af0e4412b2c8ff2b6dfe53f9002570d7882dde0bd53bca84872d9f3004054b9ed7b6c16b8c5d23b2bc548e9dff64e200868666d0486accb8151ef7a6ee6bd3b50f2cf3807e62cad0d56d4aa5e96269eaf256c0eff092d00107145a64c53b9ce3617ef8a435a3a5321c9a8c7d55de0485d73cb51fa51b59beb51af8e2594823f30c660e74ce612e626350e96282bbcf087a016933a135ab31811b8df313de6cf77bb067ec50c4c63b368d09977e0746eddda1afa96373f1158600345a0ad6a0be8abd053368127f721422469a83a4cc46b4dc787fcacf1867d939f80b02334fde9cd57c1ebdae31b4475bbed152bab4e2769d3c3ee170a5931411882b140472113a66d1e7f78ad11b6ff325175d5e3d7844ab2aa79d602e315b33b685bac698815aa1c14eeb17b295a0316ea82189a830f2b333b63f6f6269b02d6a33053b46f82dd00cce695434bcd80a099b62c95f194767275eeb88a424f1204908bc936f17d6fff28eead1d1e054dea25d266f432e477c194fa5673f2efa25db7b631ef232186893dba5d9e177b17ceb524ea57334553a97a03d9cd01b2e001f56c880fdde040834e5babfa9eaa74aa90a342ba363a0ed4c1c9033bfff8524a4e7803769606cfaee4af47612fd8976f875a9df5ef7fab05e2bb173212ca91038c346b3762ca0a4799365f810e61719f69e34d3a94f8b3d77b9a1260ef00a39c2f703ce3df2e9f1428ab76bab5f113d70f4ad0ab84c96bcf31ad31d5d6a28891ce68be4340eeb0791d3a59ec669d8433361b205e0c191817703f37449ba7736babdb1aee7d043ccd7b9740a259df885db17d74cae4912448b644f59dbf2b1af30c5b305efa09fc1aa9eb3b033f539ac63f4852ddb6e02e175f0f9e880dccca55405c39f99eabc0ccebdaab69df779ad2d5a2c41b561f1fc89dfedbcb3f21a8c3a7877b913341729af8e3e1f14772776c96d67ad1fcc018941315b465df2bb14b8b3c2116752df34fad0942e6706244c160ef8225a129f6179cfd094d4bd3d2626dc8e89a24b43ec280b2c08eb6c022c547d1484769afaf946900b70e3821135",
          inputs: "0111fcffffbc8b3c77701c386a97384c2c79ffffffffffffffffffffffffffff3f",
        }, {
          authorization: `${code}@active`,
          broadcast: true,
          sign: true
        });
        done();
      }
      catch (e) {
        done(e);
      }
    })();
  });
});

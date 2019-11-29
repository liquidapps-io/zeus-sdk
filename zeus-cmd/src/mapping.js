var path = require('path');
var fs = require('fs');

const MAPPINGFILE = 'mapping.json';

const load = (args) => {
  const mappingFile = path.join(args.storagePath, MAPPINGFILE);
  var mapping;
  if (fs.existsSync(mappingFile)) {
    mapping = JSON.parse(fs.readFileSync(mappingFile));
  } else {
    mapping = DEFAULT;
  }
  return mapping;
};

const save = (args, mapping) => {
  const mappingFile = path.join(args.storagePath, MAPPINGFILE);
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
};

const DEFAULT = {
  'microauctions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/783f09bb892346fb1aae580d8d6c3fd57427b0baaa1228121e01f6f1bf2fba15.zip',
  'test-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/94f4a35006cb6b398affb3aa4835e239943c9f812e5562a8893afcca34ca682e.zip',
  'seed-migrations': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/0e17d894a1613e76d7148f5dbfa6507e95f9c5d7b42aa84983b1c436061106c9.zip',
  'seed-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/704ae6060caa37949f26e3f45c94915810be68ab510863b80231243edcdfb1d1.zip',
  'log-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/6b2dc1c5622703e482b5f392cacc77ff19476fd87588f6dc40ca35a0ea1e08c5.zip',
  'demux': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/fb4c3cc040f0f07ff9a48357ee4969ee635d234079deefa63f3d0c9f86b032a0.zip',
  'zeus-eos': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/175bf2af5283efcef283db3b5fb7c2d50402e6c385ea1904b63daccd7329be8b.zip',
  'eos-extensions': 'ipfs://QmQTZbhEbfLEEmN9QgG7TjkNLnbJ5xuvqWSH99BgENefSD',
  'eos-common': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/05c474f9e455584b613c398843ff78fc793e579e8d13a86f38141c4eeae1d48e.zip',
  'vgrab': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/fe06f27017fc795850e1e1792497d9bdd25f0106eeddd9b23a763cba3235b59f.zip',
  'seed-frontends': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/5059f13eaf0577d8d6f052bc4f4d982f6a80cdf07c1ed59701a05b8cb6219f23.zip',
  'core-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/6841df8b63ff299636b4a30fe8ee0588754ab768b2443533307cad2c1b6ccf5e.zip',
  'seed-empty': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/e768cf2cfe37c8d4e975f1acfac825bd0ff2d9aa3187c40bfa99073b31025a45.zip',
  'testbox': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/97710b6f0735b4993ec14f59089a17a543d8bbd64af2c5b8ff628a53d4f0bf18.zip',
  'seed-eos': 'ipfs://QmfB36gXBBrDBJM1xvXNoXJuYG1GhBREb6fCUrRtw1rq2J',
  'seed-microservices': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/9a10269dc01ef4c38e28a3e01665bd9a6b73a215ecb5448417ff839776ead7e8.zip',
  'seed-utils': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/7f555938ec8dfea6c9ba1dfd64a669414cd3a5264511b9d8600958f81252186d.zip',
  'cron-dapp-service': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/840d36bc24d5ec57b495b2ff39a24452045c0f55c29165eeb75853e862698575.zip',
  'sample-eos-cpp': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/fca84742661699c47330a921c1b1e6f820216d628bf8d34a2d3238cd0275f837.zip',
  'dapp-cluster-k8s': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/020c3c9dd7ec66d3888006b9a3266375d5613c7dde9226b95662878bc2903b2d.zip',
  'seed-models': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/245d8615e674590d4f117a6279d5d6ce07432ccee5f2e5d86b180109fea3cf2c.zip',
  'run-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/650d10bd0af368856038efb801bd66d34b6eefda5cd2d9a2f992e0834fd41948.zip',
  'publish-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/c5efcf513c25d59b6a9b9173d2049e28e06bc4e98d440f1f96631f81ed33cae9.zip',
  'helloworld': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/4bf7db938541347c26a39e64e52b95c97186ab37e05f47e10918ae1104a1300b.zip',
  'create-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/fefae04f80d1bb5a527fc6af81614fcd7166c02b1ff1da2608a55cacfb5d020f.zip',
  'dapp-services-deploy': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/12e64a540a120b6015fa62fbc451e424bdcadf1abad1ad40e9ca2029abc81529.zip',
  'ipfs-dapp-service': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/a17d2df87157d7e436380dcd88088d2c5565b72016269a6a2c1b84a6f4bf9c4b.zip',
  'build-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/8dbf2a4a12478ab9868bd0fcdf3b57789a7eb0d20905599fc247f48ea6780834.zip',
  'eosio-system-contracts': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/05a46145ceec7d5946435c4309ae0d1dfe187c533d4dc64ed040ae09e681ab43.zip',
  'mocha': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/fb1fcc216cd529739513088aa11284c71965e9300b9476044e535cceb2feaa1a.zip',
  'all-dapp-services': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/586c06e8ca84aa734dd9df89cbeb8fa80eeee376bbded68cc6aa24ed6e228ced.zip',
  'token': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/aa0324de4256a486ad5e993fde112ed65c25aed37654cb6f5235483f685e31fc.zip',
  'events': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/2450f62435cf5222ad664ccf98e45d604a34aa36cf99457c0c13afc22dcfcc55.zip',
  'seed-tests': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/339986f5ac97585aff7fb6bb7bfc990e0cbd87b4f981e8fa09039cbf3a40a205.zip',
  'unbox-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/b8a310d08fdb9b8d60a8b070011c5be961e448bfec87f91f9181fc900131f7eb.zip',
  'migrations-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/5c6fbf36faa8781df7a312d9f25099da0b3dfdcf25c7dcc11c53a2b73b6f87fb.zip',
  'deepfreeze': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/0698daafbba6ba9492786d72d96813783c0d74c360a17048c0283de09b77daa6.zip',
  'coldtoken': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/95272170f722dd8a2cff56b419c5256ec61d27439ef9091d8953e2d5dbfa660b.zip',
  'hooks-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/2adbf2fbf3c488258885f0f84c76361807f9c815a55fe39e4126eae7e4c895ee.zip',
  'oracle-dapp-service': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/f5020f9dbed8c6921a2e5ae66ea05914d9b00fbbb9ad3b4f39dab5f703bce5a6.zip',
  'update-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/e0de143abbcaca1af3cb68354e581adc7763869dfa2e9c2b67b038b754986ba0.zip',
  'log-dapp-service': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/0b4a1ac0cfc467c6a4fc8704df35fd784c32c3418fbf0d412a2b130297a4c2b1.zip',
  'seed-zeus-support': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/6b4b228170621b2c96d6c2e02d2defa8818b191fd4083bd3b30bc7d51e85d5d7.zip',
  'upgrade-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/bbd169eed955bbcd037d66bcd562b23bfda6f36200a62ceea60eed1f4390642b.zip',
  'dapp-services': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/a6d6a3495cdcd49117f4e90dc3b8bab8af9cd92bbcb1057248db33f83c22d75b.zip',
  'localenv-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/428faf33ab3dc7ea3436ee78a2eb6a5f4e61442943f1d962aeef4888bc6f294e.zip',
  'repo-zeusrepoeos': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/50c81fb939e6e74316ef11e587f3afafcb0fcb94679833998ee5aa5938f93894.zip',
  'liquidapps-deployment': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/b753e8edd032424518ca402077a5d8de12409e4d73eb9083dae0b50ebf7a4f07.zip',
  'seed': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/d091c74c0c40ca72d8f42e1fdbf124affe932c12f53254f567aa02293ecd75b6.zip',
  'hooks-cpp-contracts': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/9f98553ddd29ac2238ebd182ab929e3e18fd338b14cc8562656a57b300ca0a61.zip',
  'hooks-npm': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/17417d1d2b66dc753380ce4a66e0112ed199db4962f91c9989a7e25697981190.zip',
  'framework-tests': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/aad9881812fbfff3ce226d389b082ee9cd6c9b70e21968043e7727baf3b8d895.zip',
  'contract-migrations-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/27fb961d07c63ef7baa504c3c79c0f53ae51beb45850482cdb6d6bca2cfba6f7.zip',
  'unlock-extensions': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/d139bdfe48b5ff957b04ef76d0d75c470096c8e0c4713b7a3d0fc190e4051df0.zip',
  'seed-zeus-base': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/692065c823ffee373e487e94c402177d0f0d88a7e2125b89d1f12a76c778eb66.zip',
  'eos-client-js': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/3d7874eaca665d69d7ea8a3cd07145724a4e0b4430e43d410ffd50a6f1fba48d.zip',
  'cardgame': 'https://s3.us-east-2.amazonaws.com/liquidapps.artifacts/boxes/bddc9f188c638a349c52b8df0e58479734474711f708e26729f058984827c63c.zip'
};

module.exports = { load, save };

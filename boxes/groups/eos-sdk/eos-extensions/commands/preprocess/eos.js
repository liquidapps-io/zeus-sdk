const { requireBox } = require('@liquidapps/box-utils');
const { execPromise } = requireBox('seed-zeus-support/_exec');
const dockerrm = async (name) => {
  try {
    await execPromise(`docker rm -f ${name}`);
  } catch (e) {

  }
};
module.exports = async (args) => {
  await dockerrm('zeus-pp');
  const dockerImage = process.env.CDT_DOCKER_LINT || 'natpdev/leap-cdt';
  await execPromise(`docker run -w /contracts -u $(id -u \$USER) --rm --name zeus-pp -i -v $PWD/contracts/eos:/contracts ${dockerImage} g++ -std=c++17 -E -I/usr/local/eosio.cdt/include $CODE/$CODE.cpp  > contracts/eos/$CODE/$CODE.full.cpp && docker run -u $(id -u \$USER) --rm --name zeus-pp2 -i -v $PWD/contracts/eos:/contracts ${dockerImage} clang-format -i /contracts/$CODE/$CODE.full.cpp`, {
    env: { ...process.env, CODE: args.contract }
  });
};

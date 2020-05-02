const { loadSettings, deployer, artifacts } = requireBox('liquidapps-deployment/settings');

module.exports = async function () {
  var settings = await loadSettings();
  var services = settings.services;
  await Promise.all(Object.keys(services).map(async serviceContract => {
    var serviceC = artifacts.require(`./${serviceContract}/`);
    var serviceAccount = services[serviceContract];
    return await deployer.deploy(serviceC, serviceAccount);
  }));
};

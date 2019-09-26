const db = require('./models');

// gross syncing solution as sync() must be called in each method
let synced = false;

async function getServiceRequest(key) {
  await sync();
  return db.ServiceRequest.findOne({
    where: { key }
  });
}

// pass in new fields to be set
async function updateServiceRequest(key, data, { request_block_num, signal_block_num, usage_block_num }, overwriteData = false) {
  await sync();
  try {
    const serviceRequest = await getServiceRequest(key);
    if (serviceRequest === null) {
      return false;
    }
    serviceRequest.data = overwriteData ? data : { ...serviceRequest.data, ...data }
    serviceRequest.request_block_num = request_block_num;
    serviceRequest.signal_block_num = signal_block_num;
    serviceRequest.usage_block_num = usage_block_num;
    await serviceRequest.save();
    return true;
  }
  catch (e) {
    // handle
    console.error('error updating svc req', e)
    throw e;
  }
}

async function createServiceRequest(key) {
  await sync();
  while (true) {
    var res = await db.ServiceRequest.findOne({
      where: { key }
    });
    if (!res) {
      try {
        return db.ServiceRequest.create({ key, data: {} });
      }
      catch (e) {
        if (e.name === 'SequelizeOptimisticLockError')
          continue;
        else throw e;
      }
    }
    return res;
  }
}

// settings table contains singleton with key 'settings'
async function getSettings() {
  await sync();
  return db.Settings.findOne({
    where: { key: 'settings' }
  });
}

async function updateSettings(data) {
  await sync();
  const currentSettings = await getSettings();
  if (currentSettings) {
    data = { ...currentSettings.data, ...data };
    await db.Settings.update({ data }, { where: { key: 'settings' }});
  } else {
    await db.Settings.create({ key: 'settings', data });
  }
}

async function sync() {
  if (synced)
    return;

  await db.sequelize.sync();
  synced = true;
}

module.exports = {
  getServiceRequest,
  updateServiceRequest,
  createServiceRequest,
  getSettings,
  updateSettings
};


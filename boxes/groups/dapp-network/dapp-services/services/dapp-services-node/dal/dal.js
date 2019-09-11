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
async function updateServiceRequest(key, fields) {
  await sync();
  try {
    const serviceRequest = await getServiceRequest(key);
    const currentValue = serviceRequest.value;
    const newValue = { ...currentValue, ...fields };
    await db.ServiceRequest.updateOne(
      { value: newValue },
      { where: { key } }
    );
  } catch(e) {
    // handle
  }
}

async function createServiceRequest(key, value) {
  await sync();
  return db.ServiceRequest.create({ key, value });
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
  createServiceRequest
};

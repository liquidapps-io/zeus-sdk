const db = require('./models');

// not async, just returns promise
function getServiceRequest(key) {
  return db.ServiceRequest.findOne({
    where: { key }
  });
}

// pass in new fields to be set
async function updateServiceRequest(key, fields) {
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

// not async, just returns promise
function createServiceRequest(key, value) {
  return db.ServiceRequest.create({ key, value });
}

module.exports = {
  getServiceRequest,
  updateServiceRequest,
  createServiceRequest
};

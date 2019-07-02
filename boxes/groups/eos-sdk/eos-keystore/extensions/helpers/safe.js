const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline-sync');

const algorithm = 'aes-256-cbc';

function encryptData(data, filePath, password) {
  // safety first
  if (fs.existsSync(filePath))
    throw new Error('cannot overwrite encrypted file')
  
  const cipher = crypto.createCipher(algorithm, password);
  let encryptedData = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  fs.writeFileSync(filePath, encryptedData, 'hex');
}

function decryptData(filePath, password) {
  const encryptedData = fs.readFileSync(filePath, 'hex');
  const decipher = crypto.createDecipher(algorithm, password);
  let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
  decryptedData += decipher.final('utf8');
  return JSON.parse(decryptedData.toString());
}

function promptEncryptData(data, filePath) {
  let pw1, pw2;
  while(true) {
    pw1 = readline.question('Enter your password:\n');
    pw2 = readline.question('Enter your password again:\n');
    if (pw1 === pw2)
      break;
    
    console.log("Passwords don't match, try again");
  }

  encryptData(data, filePath, pw1);
}

function promptDecryptData(filePath) {
  const passWord = readline.question('Enter your password:\n');
  try {
    let data = decryptData(filePath, passWord);
    return data;
  } catch(e) {
    // assuming for now that the wrong password is the
    // only time an error is thrown
    console.log('Wrong password, try again.');
    return promptDecryptData(filePath);
  }
}

module.exports = {
  promptEncryptData,
  promptDecryptData,
  decryptData,
  encryptData
}


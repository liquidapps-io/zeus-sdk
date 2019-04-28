import React from 'react';
import ReactDOM from 'react-dom';
import Index from './pages/index';

import Eos from 'eosjs';

// eosio endpoint
// var debug = false;
// var endpoint = "https://api.eosrio.io";
// if(debug)
//   endpoint = "http://54.186.222.85:8888";

// if(window.location.host ===  "heartbeat.liquideos.com"){
//   endpoint = "http://api.eosrio.io";
// }

// if(window.location.host === "jungle-heartbeat.liquideos.com"){
//   endpoint = "http://dev.cryptolions.io:38888";
// }

const network = {
  blockchain: 'eos',
  protocol: 'https',
  host: 'nodes.get-scatter.com',
  port: 443,
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
};
var jungle = false;
var local = true;
if (jungle) {
  network.chainId = '038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca';
  network.port = 443;
  network.host = 'jungle.eosio.cr';
  network.protocol = 'https';
}

if (local) {
  network.chainId = 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f';
  network.port = 8888;
  network.host = '54.186.222.85';
  network.protocol = 'http';
}

// var ScatterJS = window.ScatterJS;
async function init () {
  // window.scatter = ScatterJS.scatter;
  const scatter = window.scatter;
  const connected = await scatter.connect('AirdropGrabber');
  if (!connected) {
    // User does not have Scatter Desktop or Classic installed.
    return false;
  }
  const requiredFields = { accounts: [network] };
  // Use `scatter` normally now.

  await scatter.getIdentity(requiredFields);
  const account = scatter.identity.accounts.find(x => x.blockchain === 'eos');
  // You can pass in any additional options you want into the eosjs reference.
  const eosOptions = { expireInSeconds: 600 };
  window.accountName = account.name;
  // Get a proxy reference to eosjs which you can use to sign transactions with a user's Scatter.
  const eos = scatter.eos(network, Eos, eosOptions, 'http');
  window.eos = eos;
}
init();
ReactDOM.render(<Index />, document.getElementById('root'));

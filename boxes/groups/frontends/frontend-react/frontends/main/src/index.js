import React from 'react';
import ReactDOM from 'react-dom';
import Index from './pages/index';

import ScatterJS from '@scatterjs/core';
import ScatterEOS from '@scatterjs/eosjs2';
import {JsonRpc, Api} from 'eosjs';

ScatterJS.plugins( new ScatterEOS() );

const mainnet = false;
const jungle = false;
const kylin = true;
const local = false;
let chainId, host, port, protocol;
const blockchain = 'eos';
if (mainnet) {
  chainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
  port = 443;
  host = 'nodes.get-scatter.com';
  protocol = 'https';
}
if (jungle) {
  chainId = '038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca';
  port = 443;
  host = 'jungle.eosio.cr';
  protocol = 'https';
}
if (kylin) {
  chainId = '5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191';
  port = 443;
  host = 'api.kylin.alohaeos.com';
  protocol = 'https';
}
if (local) {
  chainId = 'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f';
  port = 8888;
  host = 'localhost';
  protocol = 'http';
}

function init () {
    const network = ScatterJS.Network.fromJson({
        blockchain,
        chainId,
        host,
        port,
        protocol
    });
    const rpc = new JsonRpc(network.fullhost());

    ScatterJS.connect('dapp', {network}).then(connected => {
        if(!connected) return console.error('no scatter');

        const eos = ScatterJS.eos(network, Api, {rpc});

        ScatterJS.login().then(id => {
            if(!id) return console.error('no identity');
            const account = ScatterJS.account('eos');

            eos.transact({
                actions: [{
                    account: 'eosio.token',
                    name: 'transfer',
                    authorization: [{
                        actor: account.name,
                        permission: account.authority,
                    }],
                    data: {
                        from: account.name,
                        to: 'safetransfer',
                        quantity: '0.0001 EOS',
                        memo: account.name,
                    },
                }]
            }, {
                blocksBehind: 3,
                expireSeconds: 30,
            }).then(res => {
                console.log('sent: ', res);
            }).catch(err => {
                console.error('error: ', err);
            });
        });
    });
}
init();
ReactDOM.render(<Index />, document.getElementById('root'));
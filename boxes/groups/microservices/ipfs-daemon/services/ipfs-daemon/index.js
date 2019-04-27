#!/usr/bin/env node

if (process.env.DAEMONIZE_PROCESS) { require('daemonize-process')(); }
const kill = require('kill-port');

require('babel-core/register');
require('babel-polyfill');
const { promisify } = require('util');
const fs = require('fs');
const IPFSFactory = require('ipfsd-ctl');

function error (e) {
  console.error(e);
  fs.writeFileSync('.out.txt', e);
  process.exit(1);
}

async function run () {
  const f = IPFSFactory.create({ type: 'go' });
  try { await kill(5001); } catch (e) {}
  try { await kill(4002); } catch (e) {}
  f.spanwAsync = promisify(f.spawn);

  const ipfsd = await f.spanwAsync({
    config: {
      Addresses: {
        Swarm: [
          '/ip4/0.0.0.0/tcp/4002',
          '/ip4/127.0.0.1/tcp/4003/ws'
        ],
        API: '/ip4/127.0.0.1/tcp/5001'
      },
      Bootstrap: [
        '/ip4/104.236.176.52/tcp/4001/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
        '/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
        '/ip4/104.236.179.241/tcp/4001/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
        '/ip4/162.243.248.213/tcp/4001/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
        '/ip4/128.199.219.111/tcp/4001/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
        '/ip4/104.236.76.40/tcp/4001/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
        '/ip4/178.62.158.247/tcp/4001/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
        '/ip4/178.62.61.185/tcp/4001/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
        '/ip4/104.236.151.122/tcp/4001/ipfs/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx',
        '/ip6/2604:a880:1:20::1f9:9001/tcp/4001/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
        '/ip6/2604:a880:1:20::203:d001/tcp/4001/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
        '/ip6/2604:a880:0:1010::23:d001/tcp/4001/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
        '/ip6/2400:6180:0:d0::151:6001/tcp/4001/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
        '/ip6/2604:a880:800:10::4a:5001/tcp/4001/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
        '/ip6/2a03:b0c0:0:1010::23:1001/tcp/4001/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
        '/ip6/2a03:b0c0:1:d0::e7:1/tcp/4001/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
        '/ip6/2604:a880:1:20::1d9:6001/tcp/4001/ipfs/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx',
        '/dns4/node0.preload.ipfs.io/tcp/443/wss/ipfs/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
        '/dns4/node1.preload.ipfs.io/tcp/443/wss/ipfs/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6'
      ]
    },
    start: true,
    init: true,
    disposable: true
  });
  ipfsd.initAsync = promisify(ipfsd.init);
  ipfsd.startAsync = promisify(ipfsd.start);
  if (!ipfsd.initialized) { await ipfsd.initAsync(); }
  if (!ipfsd.started) { await ipfsd.startAsync(); }
  ipfsd.api.idAsync = promisify(ipfsd.api.id);
  const id = await ipfsd.api.idAsync();
  const appWebHookListener = genApp();
  fs.writeFileSync('.out.txt', JSON.stringify(ipfsd));
  appWebHookListener.listen(process.env.PORT || 3199, () => console.log(`ipfs daemon controller listening on port ${process.env.PORT || 3199}!`));
}

run().catch(error);

const express = require('express');
const genApp = () => {
  return express();
};

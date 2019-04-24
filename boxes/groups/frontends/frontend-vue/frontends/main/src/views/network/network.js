var Eos = require('eosjs');
var axios = require('axios');
var _ = require('lodash');
import eos from './eos.js';

var _stopIndex = {};
var _runningState = {};

var configs = {
    eos: eos
}


var _currentSelectIndex = 0;


function getFullnodes(bpinfos) {
    var all = {};
    Object.keys(bpinfos).forEach((producer) => {
        var info = bpinfos[producer];
        if (info && !info.not_found && !info.error) {
            console.log(info, all)
            info.nodes.forEach((node) => {
                if (node.ssl_endpoint) {
                    node.producer = producer;
                    all[node.ssl_endpoint] = node;
                }
            })
        }
        else {

        }
    })

    return all;
}




class seedTester {

    constructor(rank, networkType, network) {
        this.currentIndex = 0;
        this.rank = rank;
        this.networkType = networkType;
        this.network = network;
        this.all = this.config.getEndpoints(networkType);
        this.stop = false;
        start();
    }

    retry() {
        this.currentIndex = 0;
        start();
    }

    async start() {
        var cachekey = 'rank_' + networkType;
        var cachekeyTime = 'rank_' + networkType + '_time';
        if (window.localStorage.getItem(cachekey)) {
            var cache = JSON.parse(window.localStorage.getItem(cachekey));
            var cacheTime = window.localStorage.getItem(cachekeyTime);
            if (cacheTime && ((Date.now() - cacheTime) > (86400000 * 2))) {
                cache.forEach((v) => {
                    rank.push(v);
                })
                console.log(rank);
                return;
            }
        }

        for (let index = this.currentIndex; index < all.length; index++) {
            const element = all[index];
            this.currentIndex++;
            if (this.stop) {
                this.stop = false;
                break;
            }
            try {
                var testnet = axios.create({
                    baseURL: element.ssl_endpoint,
                    timeout: 10000,
                    headers: {}
                });
                var timeStart = Date.now();
                var result = await testnet.get('/v1/chain/get_info');
                var timeSpend = Date.now() - timeStart;
                console.log(result, timeSpend);
                element.delay = timeSpend;
                rank.push({
                    index: index,
                    time: timeSpend
                })
            }
            catch (e) {}
        }

        rank = _.sortBy(rank, ['time']);
        window.localStorage.setItem(cachekey, JSON.stringify(rank));
        console.log(rank);
    }

    stop() {
        this.stop = true;
    }
}




function matchBetterEndpoints(rank, networkType, network, allEndpoints) {
    // var allEndpoints = this.config.getEndpoints(networkType);

    (async() => {
        var cachekey = 'rank_' + networkType;
        if (window.localStorage.getItem(cachekey)) {
            var cache = JSON.parse(window.localStorage.getItem(cachekey));
            cache.forEach((v) => {
                rank.push(v);
            })
            console.log(rank);
            return;
        }

        if (_runningState[networkType]) {
            // lock
            return;
        }

        _runningState[networkType] = true;

        for (let index = 0; index < allEndpoints.length; index++) {
            const element = allEndpoints[index];
            try {
                var testnet = axios.create({
                    baseURL: element.ssl_endpoint,
                    timeout: 10000,
                    headers: {}
                });
                var timeStart = Date.now();
                var result = await testnet.get('/v1/chain/get_info');
                var timeSpend = Date.now() - timeStart;
                console.log(result, timeSpend);
                element.delay = timeSpend;
                if (result.data.server_version_string) {
                    console.log('matchEndpoints', result.data.server_version_string);
                    rank.push({
                        index: index,
                        time: timeSpend
                    })
                }
            }
            catch (e) {}
        }

        _runningState[networkType] = false;
        rank = _.sortBy(rank, ['time']);
        window.localStorage.setItem(cachekey, JSON.stringify(rank));
        console.log(rank);
    })();
}





export default class NetworkHelper {

    constructor(projectType) {
        this.config = configs[projectType] ? configs[projectType] : configs.eos;

        console.log('NetworkHelper', this.config, configs)
        this.networkList = this.config.getNetWorkList();
    }

    getAvaibleNetwork() {
        return this.networkList;
    }

    getNetworkInfo(networkType) {
        var last = this.networkList.filter((d) => {
            if (d.key == networkType) {
                console.log('getNetworkInfo', d)
                return true;
            };
        });

        return last[0];
    }

    markError(httpEndpoint, error, networkType) {
        networkType = networkType || 'eosmain';
        // if(error.indexOf('Failed to fetch') > -1){
        // }
        console.log('markError', error, httpEndpoint);
    }

    getAllEndpoints(networkType) {
        return this._getAvaibleEndpoints(networkType);
    }

    // 
    getAvaibleEndpoints(networkType) {
        networkType = networkType || 'eosmain';
        var rank = [];
        var currentNetwork = this.networkList.filter((d) => { if (d.key == networkType) return true; });
        var allEndpoint = this.config.getEndpoints(networkType);
        // async
        matchBetterEndpoints(rank, networkType, currentNetwork, allEndpoint);
        var allEndpoints = this.config.getEndpoints(networkType);

        if (rank.length >= 2) {
            var scoreRank = _.sortBy(rank, ['time']);
            if (_currentSelectIndex > scoreRank.length) {
                _currentSelectIndex = 0;
            }
            var selectedRank = scoreRank[_currentSelectIndex];
            var endpointData = allEndpoints[selectedRank.index];
            // console.log('scoreRank', scoreRank, allEndpoints);
            if (endpointData) {
                endpointData.delay = selectedRank.time;
            }
            _currentSelectIndex++;
            return endpointData;
        }
        else {
            // console.log('1');
            var randomIndex = Math.floor(Math.random() * rank.length);
            return allEndpoints[randomIndex];
        }
    }

    _getAvaibleEndpoints(networkType) {
        networkType = networkType || 'eosmain';
        var rank = [];
        var currentNetwork = this.networkList.filter((d) => { if (d.key == networkType) return true; });
        var allEndpoint = this.config.getEndpoints(networkType);
        // async
        matchBetterEndpoints(rank, networkType, currentNetwork, allEndpoint);
        var allEndpoints = this.config.getEndpoints(networkType);
        var scoreRank = _.sortBy(rank, ['time']);
        var sortedEndpoints = [];

        if (scoreRank.length) {
            scoreRank.forEach((selectedRank) => {
                var endpointData = allEndpoints[selectedRank.index];
                // console.log('scoreRank', scoreRank, allEndpoints);
                if (endpointData) {
                    endpointData.delay = selectedRank.time;
                }

                sortedEndpoints.push(endpointData);
            })
        }
        else {
            return allEndpoints;
        }

        return sortedEndpoints;
    }

    getClient(networkType, config) {
        var currentNetwork = this.getNetworkInfo(networkType);
        var endpoint = this.getAvaibleEndpoints(networkType);
        console.log('getClient', this, currentNetwork);
        var client = Eos({
            chainId: currentNetwork.chainId,
            httpEndpoint: endpoint.ssl_endpoint,
            logger: {
                log: null,
                error: null
            }
        })
        return client;
    }
}

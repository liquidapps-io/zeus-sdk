#! /bin/bash
read -e -p "Mainnet Account name: " -i "ctestpegxm" mn
read -e -p "Sidechain Account name: " -i "nfttestpegx" sc
echo "assets"; cleos get table $mn $mn assets | jq '.rows'
echo "batches"; cleos get table $mn $mn batches | jq '.rows'
echo "bmessages"; cleos get table $mn $mn bmessages | jq '.rows'
echo "config"; cleos get table $mn $mn config | jq '.rows'
echo "fbatches"; cleos get table $mn $mn fbatches | jq '.rows'
echo "fmessages"; cleos get table $mn $mn fmessages | jq '.rows'
echo "history"; cleos get table $mn $mn history | jq '.rows'
echo "ibatch"; cleos get table $mn $mn ibatch | jq '.rows'
echo "ibatches"; cleos get table $mn $mn ibatches | jq '.rows'
echo "imessage"; cleos get table $mn $mn imessage | jq '.rows'
echo "imessages"; cleos get table $mn $mn imessages | jq '.rows'
echo "ipfsentry"; cleos get table $mn $mn ipfsentry | jq '.rows'
echo "oracleentry"; cleos get table $mn $mn oracleentry | jq '.rows'
echo "pmessages"; cleos get table $mn $mn pmessages | jq '.rows'
echo "settings"; cleos get table $mn $mn settings | jq '.rows'
echo "timerentry"; cleos get table $mn $mn timerentry | jq '.rows'
echo "assets"; cleos -u http://localhost:2424 get table $sc $sc assets | jq '.rows'
echo "batches"; cleos -u http://localhost:2424 get table $sc $sc batches | jq '.rows'
echo "bmessages"; cleos -u http://localhost:2424 get table $sc $sc bmessages | jq '.rows'
echo "config"; cleos -u http://localhost:2424 get table $sc $sc config | jq '.rows'
echo "fbatches"; cleos -u http://localhost:2424 get table $sc $sc fbatches | jq '.rows'
echo "fmessages"; cleos -u http://localhost:2424 get table $sc $sc fmessages | jq '.rows'
echo "history"; cleos -u http://localhost:2424 get table $sc $sc history | jq '.rows'
echo "ibatch"; cleos -u http://localhost:2424 get table $sc $sc ibatch | jq '.rows'
echo "ibatches"; cleos -u http://localhost:2424 get table $sc $sc ibatches | jq '.rows'
echo "imessage"; cleos -u http://localhost:2424 get table $sc $sc imessage | jq '.rows'
echo "imessages"; cleos -u http://localhost:2424 get table $sc $sc imessages | jq '.rows'
echo "ipfsentry"; cleos -u http://localhost:2424 get table $sc $sc ipfsentry | jq '.rows'
echo "oracleentry"; cleos -u http://localhost:2424 get table $sc $sc oracleentry | jq '.rows'
echo "pmessages"; cleos -u http://localhost:2424 get table $sc $sc pmessages | jq '.rows'
echo "settings"; cleos -u http://localhost:2424 get table $sc $sc settings | jq '.rows'
echo "timerentry"; cleos -u http://localhost:2424 get table $sc $sc timerentry | jq '.rows'
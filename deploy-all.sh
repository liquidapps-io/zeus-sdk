#! /bin/bash
set -e
set +x
OLDDIR=$PWD
THEDIR=`mktemp -d`
# export SKIP_IPFS_GATEWAY=true
if [ "$SKIP_IPFS_GATEWAY" == "true" ]
then
    zeus deploy canned-boxes --no-invalidate 
else
    sudo killall ipfs
    zeus deploy canned-boxes --invalidate 
fi
git add . || true
git commit -am "version" || true
git push || true


if [ "$SKIP_TEST" == "true" ]
then
    exit
fi


cd $THEDIR

export DEMUX_BACKEND=state_history_plugin
export IPFS_HOST=localhost
# zeus unbox helloworld -c --test
mkdir framework-tests; cd framework-tests
zeus box create
zeus unbox framework-tests -c 
zeus test -c
cd ..

# zeus unbox microauctions -c 
# cd microauctions
# zeus test -c
# cd ..

# zeus unbox dapp-sample -c --test
# zeus unbox sample-eos-assemblyscript -c --test
# zeus unbox helloworld -c 
# cd helloworld
# zeus test -c
# zeus create contract-deployment helloworld helloworld1
# zeus migrate
# sudo rm -rf $THEDIR
cd $OLDDIR


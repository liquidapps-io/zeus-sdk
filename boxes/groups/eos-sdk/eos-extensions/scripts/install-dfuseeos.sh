#!/bin/bash

ARCH=$( uname )
OS_NAME=$( cat /etc/os-release | grep ^NAME | cut -d'=' -f2 | sed 's/\"//gI' )
OS_VER=$( grep VERSION_ID /etc/os-release | cut -d'=' -f2 | sed 's/[^0-9\.]//gI' | cut -d'.' -f1 )
OS_MAJ=$(echo "${OS_VER}" | cut -d'.' -f1)
printf "\\nARCHITECTURE: %s" "${ARCH}"
printf "\\nOS NAME: %s" "${OS_NAME}"
printf "\\nOS VERSION: %s\\n" "${OS_VER}"

if [ "$ARCH" == "Linux" ]; then
    case "$OS_NAME" in
    "Ubuntu")
    	if [ "${OS_MAJ}" -lt 18 ] ; then
    		printf "You must be running Ubuntu 18.04.x or higher to install EOSIO.\\n"
    		printf "Exiting now.\\n"
    		exit 1
    	fi
        if ! [ -x "$(command --version dfuseeos)" ]; then
    		if [ "$OS_MAJ" = 22 ]; then
                wget https://github.com/NatPDeveloper/antelope-firehose/raw/main/dfuse-eosio_linux_amd64_v1.tar.gz
                tar -zxvf dfuse-eosio_linux_amd64_v1.tar.gz
                sudo mv ./dfuse-eosio_linux_amd64_v1/dfuseeos /usr/bin/
                rm dfuse-eosio_linux_amd64_v1.tar.gz
            elif [[ "$OS_MAJ" = 20 ]]; then
                wget https://github.com/NatPDeveloper/antelope-firehose/raw/main/dfuse-eosio_linux_amd64_v1.tar.gz
                tar -zxvf dfuse-eosio_linux_amd64_v1.tar.gz
                sudo mv ./dfuse-eosio_linux_amd64_v1/dfuseeos /usr/bin/
                rm dfuse-eosio_linux_amd64_v1.tar.gz
            elif [[ "$OS_MAJ" = 18 ]]; then
                wget https://github.com/NatPDeveloper/antelope-firehose/raw/main/dfuse-eosio_linux_amd64_v1.tar.gz
                tar -zxvf dfuse-eosio_linux_amd64_v1.tar.gz
                sudo mv ./dfuse-eosio_linux_amd64_v1/dfuseeos /usr/bin/
                rm dfuse-eosio_linux_amd64_v1.tar.gz
    		fi
            printf "\\ndfuseeos installed.\\n"
        else
            printf "\\ndfuseeos already installed.\\n"
        fi
    ;;
    *)
    printf "\\nUnsupported Linux Distribution. Exiting now.\\n\\n"
    exit 1
    esac
elif [ "$ARCH" == "Darwin" ] ; then
    if [ "${OS_MIN}" -lt 12 ]; then
    	echo "You must be running Mac OS 10.14.x or higher to install EOSIO."
    	echo "Exiting now."
    	exit 1
    fi
    if ! [ -x "$(command -v dfuseeos)" ]; then
            wget https://github.com/NatPDeveloper/antelope-firehose/raw/main/dfuse-eosio_darwin_amd64_v1.tar.gz
            tar -zxvf dfuse-eosio_darwin_amd64_v1.tar.gz
            sudo mv ./dfuse-eosio_darwin_amd64_v1/dfuseeos /usr/bin/
            rm dfuse-eosio_darwin_amd64_v1.tar.gz
        printf "\\ndfuseeos installed.\\n"
    else
        printf "\\ndfuseeos already installed.\\n"
    fi
else 
    printf "\\nUnsupported OS: %s\\n" "${ARCH}"
fi
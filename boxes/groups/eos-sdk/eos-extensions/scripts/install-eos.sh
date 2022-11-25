#!/bin/bash

ARCH=$( uname )
NODEOS_VERSION=2.1.0
LEAP_VERSION=3.2.0
if [ "$ARCH" == "Darwin" ] ; then
    OS_NAME=MacOSX
    OS_VER=$(sw_vers -productVersion)
else 
    OS_NAME=$( cat /etc/os-release | grep ^NAME | cut -d'=' -f2 | sed 's/\"//gI' )
    OS_VER=$( grep VERSION_ID /etc/os-release | cut -d'=' -f2 | sed 's/[^0-9\.]//gI' | cut -d'.' -f1 )
    OS_MAJ=$(echo "${OS_VER}" | cut -d'.' -f1)
fi
printf "\\nARCHITECTURE: %s" "${ARCH}"
printf "\\nOS NAME: %s" "${OS_NAME}"
printf "\\nOS VERSION: %s\\n" "${OS_VER}"

if [ "$ARCH" == "Linux" ]; then
    case "$OS_NAME" in
    "Amazon Linux AMI"|"Amazon Linux")
        if [[ "${OS_NAME}" == "Amazon Linux AMI" && "${OS_VER}" -lt 2017 ]]; then
        	printf "You must be running Amazon Linux 2017.09 or higher to install EOSIO.\\n"
        	printf "exiting now.\\n"
        	exit 1
    	elif [[ "${OS_NAME}" == "Amazon Linux AMI" && "${OS_VER}" = 2018 ]]; then
        	printf "\\nAmazon Linux AMI 2018 support is deprecated, installing v1.6.4.\\n"
            NODEOS_VERSION=1.6.4
        fi
        if ! [ -x "$(command -v nodeos)" ]; then
            wget https://github.com/EOSIO/eos/releases/download/v${NODEOS_VERSION}/eosio-${NODEOS_VERSION}-1.el7.x86_64.rpm
            sudo yum install -y ./eosio-${NODEOS_VERSION}-1.el7.x86_64.rpm
            rm ./eosio-${NODEOS_VERSION}-1.el7.x86_64.rpm
            printf "\\nnodeos installed.\\n"
        else
            printf "\\nnodeos already installed.\\n"
        fi
        wait
    ;;
    "CentOS Linux")
        if [ "${OS_VER}" -lt 7 ]; then
        	printf "\\nYou must be running Centos 7 or higher to install EOSIO.\\n"
        	printf "Exiting now.\\n\\n"
        	exit 1;
        fi
        if ! [ -x "$(command -v nodeos)" ]; then
            wget https://github.com/EOSIO/eos/releases/download/v${NODEOS_VERSION}/eosio-${NODEOS_VERSION}-1.el7.x86_64.rpm
            sudo yum install -y ./eosio-${NODEOS_VERSION}-1.el7.x86_64.rpm
            rm ./eosio-${NODEOS_VERSION}-1.el7.x86_64.rpm
            printf "\\nnodeos installed.\\n"
        else
            printf "\\nnodeos already installed.\\n"
        fi
        wait
    ;;
    "elementary OS")
        if ! [ -x "$(command -v nodeos)" ]; then
    	    wget https://github.com/EOSIO/eos/releases/download/v${NODEOS_VERSION}/eosio_${NODEOS_VERSION}-1-ubuntu-18.04_amd64.deb
            sudo apt install -y ./eosio_${NODEOS_VERSION}-1-ubuntu-18.04_amd64.deb
            rm ./eosio_${NODEOS_VERSION}-1-ubuntu-18.04_amd64.deb
            printf "\\nnodeos installed.\\n"
        else
            printf "\\nnodeos already installed.\\n"
        fi
    ;;
    "Fedora")
        if [ "${OS_VER}" -lt 25 ]; then
        	printf "You must be running Fedora 25 or higher to install EOSIO.\\n"
        	printf "Exiting now.\\n"
        	exit 1;
        fi
        if ! [ -x "$(command -v nodeos)" ]; then
            wget https://github.com/EOSIO/eos/releases/download/v${NODEOS_VERSION}/eosio-${NODEOS_VERSION}-1.fc27.x86_64.rpm
            sudo yum install -y ./eosio-${NODEOS_VERSION}-1.fc27.x86_64.rpm
            rm ./eosio-${NODEOS_VERSION}-1.fc27.x86_64.rpm
            printf "\\nnodeos installed.\\n"
        else
            printf "\\nnodeos already installed.\\n"
        fi
        wait
    ;;
    "Linux Mint")
        if [ "${OS_MAJ}" -lt 18 ]; then
            printf "\\tYou must be running Linux Mint 18.x or higher to install EOSIO.\\n"
            printf "\\tExiting now.\\n"
            exit 1
        fi
        if ! [ -x "$(command -v nodeos)" ]; then
    	    wget https://github.com/EOSIO/eos/releases/download/v${NODEOS_VERSION}/eosio_${NODEOS_VERSION}-1-ubuntu-18.04_amd64.deb
            sudo apt install -y ./eosio_${NODEOS_VERSION}-1-ubuntu-18.04_amd64.deb
            rm ./eosio_${NODEOS_VERSION}-1-ubuntu-18.04_amd64.deb
            printf "\\nnodeos installed.\\n"
        else
            printf "\\nnodeos already installed.\\n"
        fi
    ;;
    "Ubuntu")
    	if [ "${OS_MAJ}" -lt 18 ] ; then
    		printf "You must be running Ubuntu 18.04.x or higher to install EOSIO.\\n"
    		printf "Exiting now.\\n"
    		exit 1
    	fi
        if ! [ -x "$(command -v nodeos)" ]; then
    		if [ "$OS_MAJ" = 22 ]; then
                wget https://github.com/AntelopeIO/leap/releases/download/v${LEAP_VERSION}/leap_${LEAP_VERSION}-ubuntu22.04_amd64.deb
                sudo apt install -y ./leap_${LEAP_VERSION}-ubuntu22.04_amd64.deb
                rm ./leap_${LEAP_VERSION}-ubuntu22.04_amd64.deb
            elif [[ "$OS_MAJ" = 20 ]]; then
                wget https://github.com/AntelopeIO/leap/releases/download/v${LEAP_VERSION}/leap_${LEAP_VERSION}-ubuntu20.04_amd64.deb
                sudo apt install -y ./leap_${LEAP_VERSION}-ubuntu20.04_amd64.deb
                rm ./leap_${LEAP_VERSION}-ubuntu20.04_amd64.deb
            elif [[ "$OS_MAJ" = 18 ]]; then
                wget https://github.com/AntelopeIO/leap/releases/download/v${LEAP_VERSION}/leap_${LEAP_VERSION}-ubuntu18.04_amd64.deb
                sudo apt install -y ./leap_${LEAP_VERSION}-ubuntu18.04_amd64.deb
                rm ./leap_${LEAP_VERSION}-ubuntu18.04_amd64.deb
    		fi
            printf "\\nnodeos installed.\\n"
        else
            printf "\\nnodeos already installed.\\n"
        fi
    ;;
    "Debian GNU/Linux")
    	if [ $OS_MAJ -lt 10 ]; then
    		printf "You must be running Debian 10 to install EOSIO.\n"
    		printf "Exiting now.\n"
    		exit 1
    	fi
        if ! [ -x "$(command -v nodeos)" ]; then
    	    wget https://github.com/EOSIO/eos/releases/download/v${NODEOS_VERSION}/eosio_${NODEOS_VERSION}-1-ubuntu-18.04_amd64.deb
            sudo apt install -y ./eosio_${NODEOS_VERSION}-1-ubuntu-18.04_amd64.deb
            rm ./eosio_${NODEOS_VERSION}-1-ubuntu-18.04_amd64.deb
            printf "\\nnodeos installed.\\n"
        else
            printf "\\nnodeos already installed.\\n"
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
    if ! [ -x "$(command -v nodeos)" ]; then
        brew tap eosio/eosio
        brew install eosio/eosio/eosio
        printf "\\nnodeos installed.\\n"
    else
        printf "\\nnodeos already installed.\\n"
    fi
else 
    printf "\\nUnsupported OS: %s\\n" "${ARCH}"
fi
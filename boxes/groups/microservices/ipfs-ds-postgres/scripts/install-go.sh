#!/bin/bash

GO_VERSION=1.19.4
ARCH=$( uname )
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
    "Ubuntu")
    	if [ "${OS_MAJ}" -lt 18 ] ; then
    		printf "You must be running Ubuntu 18.04.x or higher to install go.\\n"
    		printf "Exiting now.\\n"
    		exit 1
    	fi
        if ! [ -x "$(command go version)" ]; then
                wget https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz
                sudo tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
                export PATH=$PATH:/usr/local/go/bin
                rm ./go${GO_VERSION}.linux-amd64.tar.gz
                rm -rf ./go
                go install github.com/alanshaw/ipfs-ds-postgres@latest
            printf "\\ngo installed.\\n"
        else
            printf "\\ngo already installed.\\n"
        fi
    ;;
    *)
    printf "\\nUnsupported Linux Distribution. Exiting now.\\n\\n"
    exit 1
    esac
elif [ "$ARCH" == "Darwin" ] ; then
    if [ "${OS_MIN}" -lt 12 ]; then
    	echo "You must be running Mac OS 10.14.x or higher to install go."
    	echo "Exiting now."
    	exit 1
    fi
    if ! [ -x "$(command go version)" ]; then
        brew tap golang
        brew install golang
        go install github.com/alanshaw/ipfs-ds-postgres@latest
        printf "\\ngo installed.\\n"
    else
        printf "\\ngo already installed.\\n"
    fi
else 
    printf "\\nUnsupported OS: %s\\n" "${ARCH}"
fi
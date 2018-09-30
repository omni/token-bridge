#9!/usr/bin/env bash

if [ -f .env ]; then
  source .env
fi

if [ "$1" == "" ]; then
  echo "Account is not specified" 1>&2
  exit 1
fi

account=$1

remoteUrl=""

if [ "$2" == "" ]; then
  if [ "${RPC_URL}" == "" ]; then
    echo "RPC URL is not specified" 1>&2
    exit 1
  else
    remoteUrl="${RPC_URL}"
  fi
else
  remoteUrl=$2
fi

jsonpp=`which json_pp`

if [ "${jsonpp}" == "" ]; then
  curl --data '{"method":"eth_getTransactionCount","params":["'$account'", "latest"],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST ${remoteUrl}
else
  curl -s --data '{"method":"eth_getTransactionCount","params":["'$account'", "latest"],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST ${remoteUrl} | ${jsonpp}
fi

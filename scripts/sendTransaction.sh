#!/usr/bin/env bash

if [ -f .env ]; then
  source .env
fi

if [ "$1" == "" ]; then
  echo "Transaction payload is not specified" 1>&2
  exit 1
fi

rawTx=$1

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

curl --data '{"method":"eth_sendRawTransaction","params":["'$rawTx'"],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST ${remoteUrl}

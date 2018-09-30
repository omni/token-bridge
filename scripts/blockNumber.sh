#!/usr/bin/env bash

if [ -f .env ]; then
  source .env
fi

remoteUrl=""

if [ "$1" == "" ]; then
  if [ "${RPC_URL}" == "" ]; then
    echo "RPC URL is not specified" 1>&2
    exit 1
  else
    remoteUrl="${RPC_URL}"
  fi
else
  remoteUrl=$1
fi

curl --data '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST "${remoteUrl}"

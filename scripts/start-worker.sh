#!/usr/bin/env bash

set -o pipefail

WORKERS_DIR="src/"
LOGS_DIR="logs/"

WORKER="${WORKERS_DIR}${1}.js"
CONFIG="${2}.config.js"
LOG="${LOGS_DIR}${2}.txt"

if [ "${NODE_ENV}" = "production" ]; then
  exec node "${WORKER}" "${CONFIG}"
else
  node "${WORKER}" "${CONFIG}" | tee -a "${LOG}" | pino-pretty
fi

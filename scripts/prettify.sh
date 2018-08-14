#!/usr/bin/env bash

# Prettify the input only if we are not in production
if [ "$NODE_ENV" = "production" ]
then
  cat
else
  pino-pretty
fi

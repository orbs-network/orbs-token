#!/usr/bin/env bash

if [ "$SOLIDITY_COVERAGE" = true ]; then
  port=7555
else
  port=7545
fi

# Import common variables.
. scripts/common.sh

# Executes cleanup function at script exit.
trap cleanup EXIT

if ganache_running $port; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"

  if [ "$SOLIDITY_COVERAGE" = true ]; then
    ./node_modules/.bin/testrpc-sc -l 0xfffffffffff $accounts -p "$port" > ganache.log &
  else
    ./node_modules/.bin/ganache-cli $accounts -p "$port" > ganache.log &
  fi

  ganache_pid=$!
fi

# Run the truffle test or the solidity-coverage suite.
if [ "$SOLIDITY_COVERAGE" = true ]; then
  SOLIDITY_COVERAGE=true ./node_modules/.bin/solidity-coverage
else
  ./node_modules/.bin/truffle test "$@"
fi

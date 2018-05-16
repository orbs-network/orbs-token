# Orbs Platform Token

[![CircleCI](https://circleci.com/gh/orbs-network/orbs-token/tree/master.svg?style=svg)](https://circleci.com/gh/orbs-network/orbs-token/tree/master)
[![codecov](https://codecov.io/gh/orbs-network/orbs-token/branch/master/graph/badge.svg)](https://codecov.io/gh/orbs-network/orbs-token)

This is the repository for the [Orbs Token](https://orbs.com) smart contract.

![Orbs Token](logo.jpg)

Orbs is a public blockchain built for the needs of apps with millions of users, from SLAs to adjustable fee models to on-demand capacity.

## Contracts

Please see the [contracts/](contracts) directory.

The contracts written in [Solidity](https://solidity.readthedocs.io/en/develop/) and tested using [Truffle](http://truffleframework.com/) and [ganache](https://github.com/trufflesuite/ganache). It also uses [CircleCI](https://circleci.com/gh/orbs-network/orbs-token) for automatic CI and [solidity-coverage](https://github.com/sc-forks/solidity-coverage) and [codecov](https://codecov.io/gh/orbs-network/orbs-token) for ensuring 100% tests code coverage.

### Dependencies

Installing the dependencies using [yarn][Yarn]

> $ yarn install

### Test

In order to run the tests, please execute the `scripts/test.sh` script.

> $ ./scripts/test.sh

### Code Coverage

In order to run the test coverage, please execute the `scripts/coverage.sh` script.

> $ ./scripts/coverage.sh

<iframe width="100%" src="/coverage/index.html" frameborder="1" />

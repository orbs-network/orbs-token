# Orbs Platform Token

[![CircleCI](https://circleci.com/gh/orbs-network/orbs-token/tree/master.svg?style=svg)](https://circleci.com/gh/orbs-network/orbs-token/tree/master)
[![codecov](https://codecov.io/gh/orbs-network/orbs-token/branch/master/graph/badge.svg)](https://codecov.io/gh/orbs-network/orbs-token)

This is the repository for the [Orbs Token](https://orbs.com) smart contract.

<div align="center">
    <img alt="logo" src="/logo.jpg" />
</div>

Orbs is a public blockchain built for the needs of apps with millions of users, from SLAs to adjustable fee models to on-demand capacity.

## Contracts

Please see the [contracts/](contracts) directory.

The contracts written in [Solidity](https://solidity.readthedocs.io/en/develop/) and tested using [Truffle](http://truffleframework.com/) and [ganache](https://github.com/trufflesuite/ganache). It also uses [CircleCI](https://circleci.com/gh/orbs-network/orbs-token) for automatic CI and [solidity-coverage](https://github.com/sc-forks/solidity-coverage) and [codecov](https://codecov.io/gh/orbs-network/orbs-token) for ensuring 100% tests code coverage.

### Security Audit
- [SmartDec](SmartDec%20OrbsToken%20Security%20Audit.pdf)
- [80Trill](80Trill_OrbsToken_Audit_v1.0.pdf)

### Dependencies

Installing the dependencies using [yarn][https://yarnpkg.com/]

> $ yarn install

### Test

In order to run the tests, please execute the `scripts/test.sh` script.

> $ ./scripts/test.sh

<div align="center">
    <img alt="tests" src="/images/tests.png" />
</div>

You can see the full code coverage [here](https://circleci.com/gh/orbs-network/orbs-token).

### Code Coverage

In order to run the test coverage, please execute the `scripts/coverage.sh` script.

> $ ./scripts/coverage.sh

<div align="center">
    <img alt="coverage" src="/images/coverage.png" />
</div>

You can see the full code coverage [here](https://codecov.io/gh/orbs-network/orbs-token/tree/master/contracts).

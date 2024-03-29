<div align="center">
    <img alt="logo" src="/logo.jpg" />
</div>

# Orbs Platform Token

[![CircleCI](https://circleci.com/gh/orbs-network/orbs-token/tree/master.svg?style=svg)](https://circleci.com/gh/orbs-network/orbs-token/tree/master)
[![codecov](https://codecov.io/gh/orbs-network/orbs-token/branch/master/graph/badge.svg)](https://codecov.io/gh/orbs-network/orbs-token)

This is the repository for the [Orbs Token](https://orbs.com) smart contract.

Orbs is a public blockchain built for the needs of apps with millions of users, from SLAs to adjustable fee models to on-demand capacity.

## Official contract instances

* Ethereum ORBS ERC20: [0xff56Cc6b1E6dEd347aA0B7676C85AB0B3D08B0FA](https://etherscan.io/token/0xff56cc6b1e6ded347aa0b7676c85ab0b3d08b0fa)
* Polygon ORBS ERC20: [0x614389eaae0a6821dc49062d56bda3d9d45fa2ff](https://polygonscan.com/address/0x614389eaae0a6821dc49062d56bda3d9d45fa2ff)

## Contracts

Please see the [contracts/](contracts) directory.

The contracts written in [Solidity](https://solidity.readthedocs.io/en/develop/) and tested using [Truffle](http://truffleframework.com/) and [ganache](https://github.com/trufflesuite/ganache). It also uses [CircleCI](https://circleci.com/gh/orbs-network/orbs-token) for automatic CI and [solidity-coverage](https://github.com/sc-forks/solidity-coverage) and [codecov](https://codecov.io/gh/orbs-network/orbs-token) for ensuring 100% tests code coverage.

### Security Audit
Orbs received security audits on the token smart contract in May 2018 from SmartDEC, 80Trill and Bok Consulting Pty Ltd.

- [SmartDec](SmartDec%20OrbsToken%20Security%20Audit.pdf)
- [80Trill](80Trill_OrbsToken_Audit_v1.0.pdf)
- [Bok Consulting Pty](https://github.com/bokkypoobah/OrbsSubscriptionSmartContractAudit/tree/alpha/audit)

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

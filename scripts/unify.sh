#!/usr/bin/env bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

function unify() {
	grep -v "^[pragma|import]" $DIR/$1 >> Unified.sol
}

echo "pragma solidity 0.4.23;" > Unified.sol

unify ../node_modules/zeppelin-solidity/contracts/math/Math.sol
unify ../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol
unify ../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol
unify ../node_modules/zeppelin-solidity/contracts/ownership/CanReclaimToken.sol
unify ../node_modules/zeppelin-solidity/contracts/ownership/HasNoContracts.sol
unify ../node_modules/zeppelin-solidity/contracts/ownership/HasNoTokens.sol
unify ../node_modules/zeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol
unify ../node_modules/zeppelin-solidity/contracts/token/ERC20/ERC20.sol
unify ../node_modules/zeppelin-solidity/contracts/token/ERC20/BasicToken.sol
unify ../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol
unify ../node_modules/zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol

unify ../contracts/OrbsToken.sol

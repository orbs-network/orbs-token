pragma solidity 0.4.23;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


/// Test token with predefined supply.
contract TestERC20Token is StandardToken {
    constructor(uint256 _supply) public {
        totalSupply_ = _supply;
        balances[msg.sender] = _supply;
    }
}

pragma solidity 0.4.23;

import "zeppelin-solidity/contracts/ownership/HasNoContracts.sol";
import "zeppelin-solidity/contracts/ownership/HasNoTokens.sol";
import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract OrbsToken is HasNoTokens, HasNoContracts, StandardToken {
    // solhint-disable const-name-snakecase
    string public constant name = "Orbs";
    string public constant symbol = "ORBS";
    uint8 public constant decimals = 18;
    // solhint-enable const-name-snakecase

    // Total supply of the ORBS token.
    uint256 public constant TOTAL_SUPPLY = 10 * 10 ** 9 * 10 ** uint256(decimals); // 10B

    constructor(address _distributor) public {
        require(_distributor != address(0), "Distributor address must not be 0!");

        totalSupply_ = totalSupply_.add(TOTAL_SUPPLY);
        balances[_distributor] = balances[_distributor].add(TOTAL_SUPPLY);
        emit Transfer(address(0), _distributor, TOTAL_SUPPLY);
    }
}

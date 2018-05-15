pragma solidity 0.4.23;

import "../../contracts/MultiSigWallet.sol";


contract MultiSigWalletMock is MultiSigWallet {
    uint256 public transactionId;

    constructor(address[] _owners, uint _required) public MultiSigWallet(_owners, _required) {
    }

    function submitTransaction(address _destination, uint _value, bytes _data) public returns (uint _transactionId) {
        transactionId = super.submitTransaction(_destination, _value, _data);

        return transactionId;
    }
}

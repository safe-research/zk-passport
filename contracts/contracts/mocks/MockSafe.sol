// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * @title MockSafe
 * @notice Mock contract for testing SafeRecovery functionality
 * @dev This contract simulates the Safe wallet behavior for testing
 */
contract MockSafe {
    bool private _shouldFail;
    
    /// @notice Allow the contract to receive ETH
    receive() external payable {}
    
    /// @notice Sets whether the Safe should fail transactions for testing
    /// @param shouldFail Whether execTransactionFromModule should fail
    function setShouldFail(bool shouldFail) external {
        _shouldFail = shouldFail;
    }
    
    /// @notice Mock implementation of execTransactionFromModule
    /// @return success Whether the transaction succeeded (opposite of _shouldFail)
    function execTransactionFromModule(
        address,
        uint256,
        bytes calldata,
        uint8
    ) external view returns (bool success) {
        return !_shouldFail;
    }
}
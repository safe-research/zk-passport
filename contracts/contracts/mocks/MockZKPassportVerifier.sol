// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * @title MockZKPassportVerifier
 * @notice Mock contract for testing SafeRecovery functionality
 * @dev This contract simulates the ZKPassport verifier behavior for testing
 */

struct ProofVerificationParams {
    bytes32 vkeyHash;
    bytes proof;
    bytes32[] publicInputs;
    bytes committedInputs;
    uint256[] committedInputCounts;
    uint256 validityPeriodInDays;
    string domain;
    string scope;
    bool devMode;
}

contract MockZKPassportVerifier {
    bool private _verificationResult;
    bytes32 private _uniqueIdentifier;

    /// @notice Sets the verification result for testing
    /// @param result Whether the proof should be considered valid
    /// @param identifier The unique identifier to return
    function setVerificationResult(bool result, bytes32 identifier) external {
        _verificationResult = result;
        _uniqueIdentifier = identifier;
    }

    /// @notice Mock implementation of verifyProof
    /// @return verified The verification result set by setVerificationResult
    /// @return uniqueIdentifier The unique identifier set by setVerificationResult
    function verifyProof(
        ProofVerificationParams calldata params
    ) external view returns (bool verified, bytes32 uniqueIdentifier) {
        // Silence unused parameter warning
        params;
        return (_verificationResult, _uniqueIdentifier);
    }
}
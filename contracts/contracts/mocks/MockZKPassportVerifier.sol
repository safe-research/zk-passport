// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IZKPassportVerifier.sol";

/**
 * @title MockZKPassportVerifier
 * @notice Mock verifier contract for testing
 */
contract MockZKPassportVerifier is IZKPassportVerifier {
    bool public verificationResult;
    bytes32 public uniqueIdentifier;
    address public boundAddress1;
    address public boundAddress2;
    address public boundAddress3;

    function setVerificationResult(bool _result, bytes32 _identifier) external {
        verificationResult = _result;
        uniqueIdentifier = _identifier;
    }

    function setBoundData(address _addr1, address _addr2, address _addr3) external {
        boundAddress1 = _addr1;
        boundAddress2 = _addr2;
        boundAddress3 = _addr3;
    }

    function verifyProof(ProofVerificationParams calldata) 
        external 
        view 
        override 
        returns (bool, bytes32) 
    {
        return (verificationResult, uniqueIdentifier);
    }

    function getBindProofInputs(bytes calldata, uint256[] calldata) 
        external 
        pure 
        override 
        returns (bytes memory) 
    {
        // Return dummy data
        return abi.encode("mock_data");
    }

    function getBoundData(bytes calldata) 
        external 
        view 
        override 
        returns (address, address, address) 
    {
        return (boundAddress1, boundAddress2, boundAddress3);
    }
}
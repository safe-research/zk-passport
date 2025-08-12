// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MockEIP1271Consumer
 * @notice Mock contract that consumes EIP-1271 signatures
 */
contract MockEIP1271Consumer {
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;
    
    /**
     * @notice Verifies a signature using EIP-1271
     * @param signer The contract that should validate the signature
     * @param hash The hash that was signed
     * @param signature The signature to verify
     * @return valid True if the signature is valid
     */
    function verifySignature(
        address signer,
        bytes32 hash,
        bytes memory signature
    ) external view returns (bool valid) {
        bytes4 result = IEIP1271(signer).isValidSignature(hash, signature);
        return result == MAGICVALUE;
    }
}

interface IEIP1271 {
    function isValidSignature(bytes32 hash, bytes memory signature)
        external
        view
        returns (bytes4 magicValue);
}


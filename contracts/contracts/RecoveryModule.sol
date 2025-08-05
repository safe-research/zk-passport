// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@safe-global/safe-contracts/contracts/common/Enum.sol";
import "@safe-global/safe-contracts/contracts/Safe.sol";
import "../interface/IOwnerManager.sol";
import "../interface/IZKPassportVerifier.sol";

/**
 * @title SafeRecoveryModule
 * @notice A recovery module for Safe wallets using ZKPassport identity verification
 * @dev This contract allows users to register their identity and recover Safe access
 * @author ZKPassport Team
 */

// ============ MAIN CONTRACT ============
contract ZKPassportSafeRecovery {
    // ============ STATE VARIABLES ============
    
    /// @notice ZKPassport verifier contract
    IZKPassportVerifier public immutable zkPassportVerifier;
    
    /// @notice Maps Safe addresses to their registered recovery identifiers
    mapping(address => bytes32) public safeToRecoverer;

    // ============ EVENTS ============
    
    /// @notice Emitted when a Safe is registered for recovery
    /// @param safeAddress The Safe that was registered
    /// @param uniqueIdentifier The unique identifier for recovery
    event SafeRegistered(address indexed safeAddress, bytes32 indexed uniqueIdentifier);
    
    /// @notice Emitted when a Safe owner is recovered
    /// @param safeAddress The Safe that was recovered
    /// @param oldOwner The owner that was replaced
    /// @param newOwner The new owner address
    /// @param recoverer The address that initiated recovery
    event OwnerRecovered(
        address indexed safeAddress,
        address indexed oldOwner,
        address indexed newOwner,
        address recoverer
    );

    // ============ ERRORS ============
    
    error InvalidProof();
    error SafeNotRegistered();
    error OwnerSwapFailed();
    error ZeroAddress();

    // ============ CONSTRUCTOR ============
    
    /// @notice Initializes the recovery module
    /// @param _verifierAddress Address of the ZKPassport verifier contract
    constructor(address _verifierAddress) {
        if (_verifierAddress == address(0)) revert ZeroAddress();
        zkPassportVerifier = IZKPassportVerifier(_verifierAddress);
    }

    // ============ EXTERNAL FUNCTIONS ============
    
    /// @notice Registers a Safe for recovery using ZK proof
    /// @param params ZK proof verification parameters
    /// @param safeAddress Address of the Safe to register
    /// @dev The caller must provide a valid ZK proof of their identity
    function register(
        ProofVerificationParams calldata params,
        address safeAddress
    ) external {
        require(msg.sender == safeAddress, "Only Safe can register a guardian");
        if (safeAddress == address(0)) revert ZeroAddress();
        
        // Verify the ZK proof
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier.verifyProof(params);
        if (!verified) revert InvalidProof();

        // Store the unique identifier for this Safe
        safeToRecoverer[safeAddress] = uniqueIdentifier;

        emit SafeRegistered(safeAddress, uniqueIdentifier);
    }

    /// @notice Recovers a Safe by swapping owners using ZK proof
    /// @param params ZK proof verification parameters
    /// @param safeAddress Address of the Safe to recover
    /// @param oldOwner Current owner to be replaced
    /// @param newOwner New owner address
    /// @param previousOwner Owner before oldOwner in the linked list
    /// @dev The caller must provide the same ZK proof used during registration
    function recover(
        ProofVerificationParams calldata params,
        address safeAddress,
        address oldOwner,
        address newOwner,
        address previousOwner
    ) external {
        if (safeAddress == address(0) || oldOwner == address(0) || newOwner == address(0)) {
            revert ZeroAddress();
        }

        // Verify the ZK proof
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier.verifyProof(params);
        if (!verified) revert InvalidProof();

        // Check if the Safe is registered with this identifier
        if (safeToRecoverer[safeAddress] != uniqueIdentifier) {
            revert SafeNotRegistered();
        }

        // Execute the owner swap through the Safe
        bool success = Safe(payable(safeAddress)).execTransactionFromModule(
            safeAddress,
            0,
            abi.encodeCall(IOwnerManager.swapOwner, (previousOwner, oldOwner, newOwner)),
            Enum.Operation.Call
        );

        if (!success) revert OwnerSwapFailed();

        emit OwnerRecovered(safeAddress, oldOwner, newOwner, msg.sender);
    }

    // ============ VIEW FUNCTIONS ============
    
    /// @notice Checks if a Safe is registered for recovery
    /// @param safeAddress Safe address to check
    /// @return True if the Safe is registered
    function isRegistered(address safeAddress) external view returns (bool) {
        return safeToRecoverer[safeAddress] != bytes32(0);
    }

    /// @notice Gets the recovery identifier for a Safe
    /// @param safeAddress Safe address to query
    /// @return The unique identifier used for recovery
    function getRecoveryIdentifier(address safeAddress) external view returns (bytes32) {
        return safeToRecoverer[safeAddress];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@safe-global/safe-contracts/contracts/common/Enum.sol";
import "@safe-global/safe-contracts/contracts/Safe.sol";
import "../interfaces/IOwnerManager.sol";
import "../interfaces/IZKPassportVerifier.sol";

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
    mapping(bytes => bool) public isProofUsed;

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
    error ProofAlreadyUsed();

    // ============ CONSTRUCTOR ============
    
    /// @notice Initializes the recovery module
    /// @param _verifierAddress Address of the ZKPassport verifier contract
    constructor(address _verifierAddress) {
        if (_verifierAddress == address(0)) revert ZeroAddress();
        zkPassportVerifier = IZKPassportVerifier(_verifierAddress);
    }

    // ========= INTERNAL: hex string decoding =========
    function _fromHexChar(uint8 c) internal pure returns (uint8) {
        if (c >= uint8(bytes1('0')) && c <= uint8(bytes1('9'))) return c - uint8(bytes1('0'));
        if (c >= uint8(bytes1('a')) && c <= uint8(bytes1('f'))) return 10 + c - uint8(bytes1('a'));
        if (c >= uint8(bytes1('A')) && c <= uint8(bytes1('F'))) return 10 + c - uint8(bytes1('A'));
        revert("invalid hex char");
    }

    function _hexStringToBytes(string memory s) internal pure returns (bytes memory) {
        bytes memory ss = bytes(s);
        uint256 start = (ss.length >= 2 && ss[0] == '0' && (ss[1] == 'x' || ss[1] == 'X')) ? 2 : 0;
        require((ss.length - start) % 2 == 0, "hex length must be even");

        bytes memory r = new bytes((ss.length - start) / 2);
        for (uint256 i = 0; i < r.length; i++) {
            r[i] = bytes1(
                _fromHexChar(uint8(ss[start + 2*i])) * 16 +
                _fromHexChar(uint8(ss[start + 2*i + 1]))
            );
        }
        return r;
    }

    // ============ EXTERNAL FUNCTIONS ============
    
    /// @notice Registers a Safe for recovery using ZK proof
    /// @param params ZK proof verification parameters
    /// @dev The caller must provide a valid ZK proof of their identity
    function register(
        ProofVerificationParams calldata params
    ) external {
        // Verify the ZK proof
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier.verifyProof(params);
        if (!verified) revert InvalidProof();

        bytes memory data = zkPassportVerifier.getBindProofInputs(
          params.committedInputs,
          params.committedInputCounts
        );

        (address safeAddress,,) = zkPassportVerifier.getBoundData(data);
        require(msg.sender == safeAddress, "Only Safe can register a guardian");
        if (safeAddress == address(0)) revert ZeroAddress();
        
        // Store the unique identifier for this Safe
        safeToRecoverer[safeAddress] = uniqueIdentifier;
        emit SafeRegistered(safeAddress, uniqueIdentifier);
    }

    /// @notice Recovers a Safe by swapping owners using ZK proof
    /// @param params ZK proof verification parameters
    /// @dev The caller must provide the same ZK proof used during registration
    function recover(
        ProofVerificationParams calldata params
    ) external {
        // Verify the ZK proof
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier.verifyProof(params);
        if (!verified) revert InvalidProof();
        if (isProofUsed[params.proof]) revert ProofAlreadyUsed();
        isProofUsed[params.proof] = true;
        
        bytes memory data = zkPassportVerifier.getBindProofInputs(
          params.committedInputs,
          params.committedInputCounts
        );

        (,,string memory customData) = zkPassportVerifier.getBoundData(data);
        // customData is a hex string (0x...) of abi.encode(...) parameters. Decode to bytes, then abi.decode
        bytes memory payload = _hexStringToBytes(customData);
        (address previousOwner, address oldOwner, address newOwner, address safeAddress) = abi.decode(payload, (address, address, address, address));

        if (previousOwner == address(0) || oldOwner == address(0) || newOwner == address(0) || safeAddress == address(0)) {
            revert ZeroAddress();
        } else if (previousOwner == newOwner) {
            revert OwnerSwapFailed();
        }

        if (previousOwner == oldOwner) {
            revert OwnerSwapFailed();
        }

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

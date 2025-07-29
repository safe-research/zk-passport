// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@safe-global/safe-contracts/contracts/common/Enum.sol";
import "@safe-global/safe-contracts/contracts/Safe.sol";

/**
 * @title SafeRecoveryModule
 * @notice A recovery module for Safe wallets using ZKPassport identity verification
 * @dev This contract allows users to register their identity and recover Safe access
 * @author ZKPassport Team
 */

// ============ ENUMS ============

/// @notice Types of ZK proofs supported by the system
enum ProofType {
    DISCLOSE,
    AGE,
    BIRTHDATE,
    EXPIRY_DATE,
    NATIONALITY_INCLUSION,
    NATIONALITY_EXCLUSION,
    ISSUING_COUNTRY_INCLUSION,
    ISSUING_COUNTRY_EXCLUSION
}

// ============ STRUCTS ============

/// @notice Parameters required for ZK proof verification
struct ProofVerificationParams {
    bytes32 vkeyHash;              // Verification key hash
    bytes proof;                   // ZK proof data
    bytes32[] publicInputs;        // Public inputs for the proof
    bytes committedInputs;         // Committed inputs
    uint256[] committedInputCounts; // Counts for committed inputs
    uint256 validityPeriodInDays;  // How long the proof is valid
    string domain;                 // Domain scope
    string scope;                  // Proof scope
    bool devMode;                  // Whether in development mode
}

// ============ INTERFACES ============

/// @notice Interface for ZKPassport verification functionality
interface IZKPassportVerifier {
    /// @notice Verifies a ZK proof and returns verification status
    /// @param params Proof verification parameters
    /// @return verified Whether the proof is valid
    /// @return uniqueIdentifier Unique identifier for the prover
    function verifyProof(
        ProofVerificationParams calldata params
    ) external returns (bool verified, bytes32 uniqueIdentifier);

    /// @notice Gets age proof inputs
    function getAgeProofInputs(
        bytes calldata committedInputs,
        uint256[] calldata committedInputCounts
    ) external view returns (uint256 currentDate, uint8 minAge, uint8 maxAge);

    /// @notice Gets disclose proof inputs
    function getDiscloseProofInputs(
        bytes calldata committedInputs,
        uint256[] calldata committedInputCounts
    ) external pure returns (bytes memory discloseMask, bytes memory discloseBytes);

    /// @notice Gets disclosed data from proof
    function getDisclosedData(
        bytes calldata discloseBytes,
        bool isIDCard
    ) external view returns (
        string memory name,
        string memory issuingCountry,
        string memory nationality,
        string memory gender,
        string memory birthDate,
        string memory expiryDate,
        string memory documentNumber,
        string memory documentType
    );

    /// @notice Gets country proof inputs
    function getCountryProofInputs(
        bytes calldata committedInputs,
        uint256[] calldata committedInputCounts,
        ProofType proofType
    ) external pure returns (string[] memory countryList);

    /// @notice Gets date proof inputs
    function getDateProofInputs(
        bytes calldata committedInputs,
        uint256[] calldata committedInputCounts,
        ProofType proofType
    ) external pure returns (uint256 currentDate, uint256 minDate, uint256 maxDate);

    /// @notice Gets bind proof inputs
    function getBindProofInputs(
        bytes calldata committedInputs,
        uint256[] calldata committedInputCounts
    ) external pure returns (bytes memory data);

    /// @notice Gets bound data
    function getBoundData(
        bytes calldata data
    ) external view returns (
        address userAddress,
        uint256 chainId,
        string memory customData
    );

    /// @notice Verifies proof scopes
    function verifyScopes(
        bytes32[] calldata publicInputs,
        string calldata domain,
        string calldata scope
    ) external view returns (bool);
}

/// @notice Interface for Safe owner management functionality
interface IOwnerManager {
    // ============ EVENTS ============
    event AddedOwner(address indexed owner);
    event RemovedOwner(address indexed owner);
    event ChangedThreshold(uint256 threshold);

    // ============ FUNCTIONS ============
    
    /// @notice Adds a new owner to the Safe
    /// @param owner New owner address
    /// @param _threshold New threshold for transactions
    function addOwnerWithThreshold(address owner, uint256 _threshold) external;

    /// @notice Removes an owner from the Safe
    /// @param prevOwner Previous owner in the linked list
    /// @param owner Owner to remove
    /// @param _threshold New threshold for transactions
    function removeOwner(address prevOwner, address owner, uint256 _threshold) external;

    /// @notice Swaps an existing owner with a new one
    /// @param prevOwner Previous owner in the linked list
    /// @param oldOwner Owner to replace
    /// @param newOwner New owner address
    function swapOwner(address prevOwner, address oldOwner, address newOwner) external;

    /// @notice Changes the transaction threshold
    /// @param _threshold New threshold value
    function changeThreshold(uint256 _threshold) external;

    /// @notice Gets the current threshold
    /// @return Current threshold value
    function getThreshold() external view returns (uint256);

    /// @notice Checks if address is an owner
    /// @param owner Address to check
    /// @return True if address is an owner
    function isOwner(address owner) external view returns (bool);

    /// @notice Gets all owners
    /// @return Array of owner addresses
    function getOwners() external view returns (address[] memory);
}

// ============ MAIN CONTRACT ============

contract SafeRecovery {
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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

enum BoundDataIdentifier {
    NONE,
    USER_ADDRESS,
    CHAIN_ID,
    CUSTOM_DATA
}

// ============ STRUCTS ============

/// @notice Parameters required for ZK proof verification
struct ProofVerificationParams {
    bytes32 vkeyHash;              // Verification key hash
    bytes proof;                   // ZK proof data
    bytes32[] publicInputs;        // Public inputs for the proof
    bytes committedInputs;         // Committed inputs
    uint256[] committedInputCounts; // Counts for committed inputs
    uint256 validityPeriodInSeconds;  // How long the proof is valid
    string domain;                 // Domain scope
    string scope;                  // Proof scope
    bool devMode;                  // Whether in development mode
}

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
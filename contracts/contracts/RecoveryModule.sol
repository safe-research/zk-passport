pragma solidity ^0.8.21;

import "@safe-global/safe-contracts/contracts/common/Enum.sol";
import "@safe-global/safe-contracts/contracts/Safe.sol";

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

interface IZKPassportVerifier {
    // Verify the proof
    function verifyProof(
        ProofVerificationParams calldata params
    ) external returns (bool verified, bytes32 uniqueIdentifier);

    // Get the inputs for the age proof
    function getAgeProofInputs(
        bytes calldata committedInputs,
        uint256[] calldata committedInputCounts
    ) external view returns (uint256 currentDate, uint8 minAge, uint8 maxAge);

    // Get the inputs for the disclose proof
    function getDiscloseProofInputs(
        bytes calldata committedInputs,
        uint256[] calldata committedInputCounts
    )
        external
        pure
        returns (bytes memory discloseMask, bytes memory discloseBytes);

    // Get the disclosed data from the proof
    function getDisclosedData(
        bytes calldata discloseBytes,
        bool isIDCard
    )
        external
        view
        returns (
            string memory name,
            string memory issuingCountry,
            string memory nationality,
            string memory gender,
            string memory birthDate,
            string memory expiryDate,
            string memory documentNumber,
            string memory documentType
        );

    // Get the inputs for the nationality/issuing country inclusion and exclusion proofs
    function getCountryProofInputs(
        bytes calldata committedInputs,
        uint256[] calldata committedInputCounts,
        ProofType proofType
    ) external pure returns (string[] memory countryList);

    // Get the inputs for the birthdate and expiry date proofs
    function getDateProofInputs(
        bytes calldata committedInputs,
        uint256[] calldata committedInputCounts,
        ProofType proofType
    )
        external
        pure
        returns (uint256 currentDate, uint256 minDate, uint256 maxDate);

    // Get the inputs for the bind proof
    function getBindProofInputs(
        bytes calldata committedInputs,
        uint256[] calldata committedInputCounts
    ) external pure returns (bytes memory data);

    // Get the bound data from the raw data returned by the getBindProofInputs function
    function getBoundData(
        bytes calldata data
    )
        external
        view
        returns (
            address userAddress,
            uint256 chainId,
            string memory customData
        );

    // Verify the scope of the proof
    function verifyScopes(
        bytes32[] calldata publicInputs,
        string calldata domain,
        string calldata scope
    ) external view returns (bool);
}

contract SafeRecovery {
    IZKPassportVerifier public zkPassportVerifier;

    // Map users to their verified unique identifiers
    mapping(address => bytes32) public safeToRecoverer;

    constructor(address _verifierAddress) {
        zkPassportVerifier = IZKPassportVerifier(_verifierAddress);
    }

    function register(
        ProofVerificationParams calldata params,
        address safeAddress
    ) public returns (bytes32) {
        // Verify the proof
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier
            .verifyProof(params);
        require(verified, "Proof is invalid");

        // Store the unique identifier
        safeToRecoverer[safeAddress] = uniqueIdentifier;

        return uniqueIdentifier;
    }

    // Your contract functionality using the verification
    function Recover(
        ProofVerificationParams calldata params,
        address safeAddress,
        address oldOwner,
        address newOwner,
        address previousOwner
    ) public {
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier
            .verifyProof(params);
        require(verified, "Proof is invalid");
        require(
            safeToRecoverer[safeAddress] == uniqueIdentifier,
            "Safe not registered"
        );

        bytes memory data = abi.encodeWithSignature(
            "swapOwners(address,address,address)",
            previousOwner,
            oldOwner,
            newOwner
        );
        require(
            Safe(payable(safeAddress)).execTransactionFromModule(
                safeAddress,
                0,
                data,
                Enum.Operation.Call
            ),
            "Could not execute token transfer"
        );
    }
}

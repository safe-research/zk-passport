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

interface IOwnerManager {
    event AddedOwner(address indexed owner);
    event RemovedOwner(address indexed owner);
    event ChangedThreshold(uint256 threshold);

    /**
     * @notice Adds the owner `owner` to the Safe and updates the threshold to `_threshold`.
     * @dev This can only be done via a Safe transaction.
     * @param owner New owner address.
     * @param _threshold New threshold.
     */
    function addOwnerWithThreshold(address owner, uint256 _threshold) external;

    /**
     * @notice Removes the owner `owner` from the Safe and updates the threshold to `_threshold`.
     * @dev This can only be done via a Safe transaction.
     * @param prevOwner Owner that pointed to the owner to be removed in the linked list
     * @param owner Owner address to be removed.
     * @param _threshold New threshold.
     */
    function removeOwner(address prevOwner, address owner, uint256 _threshold) external;

    /**
     * @notice Replaces the owner `oldOwner` in the Safe with `newOwner`.
     * @dev This can only be done via a Safe transaction.
     * @param prevOwner Owner that pointed to the owner to be replaced in the linked list
     * @param oldOwner Owner address to be replaced.
     * @param newOwner New owner address.
     */
    function swapOwner(address prevOwner, address oldOwner, address newOwner) external;

    /**
     * @notice Changes the threshold of the Safe to `_threshold`.
     * @dev This can only be done via a Safe transaction.
     * @param _threshold New threshold.
     */
    function changeThreshold(uint256 _threshold) external;

    /**
     * @notice Returns the number of required confirmations for a Safe transaction aka the threshold.
     * @return Threshold number.
     */
    function getThreshold() external view returns (uint256);

    /**
     * @notice Returns if `owner` is an owner of the Safe.
     * @return Boolean if owner is an owner of the Safe.
     */
    function isOwner(address owner) external view returns (bool);

    /**
     * @notice Returns a list of Safe owners.
     * @return Array of Safe owners.
     */
    function getOwners() external view returns (address[] memory);
}

contract SafeRecovery {
    IZKPassportVerifier public zkPassportVerifier;

    // Map users to their verified unique identifiers
    mapping(address => bytes32) public safeToRecoverer;

    // Events
    event SafeRegistered(address indexed safeAddress, bytes32 indexed uniqueIdentifier);

    constructor(address _verifierAddress) {
        zkPassportVerifier = IZKPassportVerifier(_verifierAddress);
    }

    function register(
        ProofVerificationParams calldata params,
        address safeAddress
    ) public {
        // Verify the proof
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier
            .verifyProof(params);
        require(verified, "Proof is invalid");

        // Store the unique identifier
        safeToRecoverer[safeAddress] = uniqueIdentifier;

        // Log the registration
        emit SafeRegistered(safeAddress, uniqueIdentifier);
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

        require(
            Safe(payable(safeAddress)).execTransactionFromModule(
                safeAddress,
                0,
                abi.encodeCall(IOwnerManager.swapOwner, (previousOwner, oldOwner, newOwner)),
                Enum.Operation.Call
            ),
            "Could not swap owners"
        );
    }
}

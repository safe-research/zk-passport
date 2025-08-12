// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IZKPassportVerifier.sol";

/**
 * @title ZKPassportEIP1271
 * @notice EIP-1271 signature validation using ZKPassport proofs
 * @dev Implements isValidSignature for ZK proof-based signature validation
 * @author ZKPassport Team
 */
contract ZKPassportEIP1271 {
    // ============ CONSTANTS ============
    
    // EIP-1271 magic value for valid signature
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;
    
    // EIP-1271 magic value for invalid signature
    bytes4 internal constant INVALID_SIGNATURE = 0xffffffff;
    
    // ============ STATE VARIABLES ============
    
    /// @notice ZKPassport verifier contract
    IZKPassportVerifier public immutable zkPassportVerifier;
    
    /// @notice Authorized signers mapping (identity hash -> authorized)
    mapping(bytes32 => bool) public authorizedSigners;
    
    /// @notice Used proofs for replay protection
    mapping(bytes32 => bool) public usedProofHashes;
    
    /// @notice Owner of the contract (can add/remove authorized signers)
    address public owner;
    
    /// @notice Whether to enforce replay protection
    bool public replayProtectionEnabled;
    
    // ============ EVENTS ============
    
    event SignerAuthorized(bytes32 indexed identityHash);
    event SignerRevoked(bytes32 indexed identityHash);
    event SignatureValidated(bytes32 indexed hash, bytes32 indexed identityHash);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ReplayProtectionToggled(bool enabled);
    
    // ============ ERRORS ============
    
    error InvalidProof();
    error UnauthorizedSigner();
    error ProofAlreadyUsed();
    error InvalidSignatureFormat();
    error ZeroAddress();
    error OnlyOwner();
    
    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Initializes the EIP-1271 contract
     * @param _verifierAddress Address of the ZKPassport verifier contract
     * @param _owner Owner address who can manage authorized signers
     * @param _enableReplayProtection Whether to enable replay protection
     */
    constructor(
        address _verifierAddress,
        address _owner,
        bool _enableReplayProtection
    ) {
        if (_verifierAddress == address(0) || _owner == address(0)) {
            revert ZeroAddress();
        }
        zkPassportVerifier = IZKPassportVerifier(_verifierAddress);
        owner = _owner;
        replayProtectionEnabled = _enableReplayProtection;
    }
    
    // ============ EIP-1271 IMPLEMENTATION ============
    
    /**
     * @notice Validates a signature according to EIP-1271
     * @param _hash Hash of the data that was signed (can be empty for ZK proofs)
     * @param _signature Encoded ProofVerificationParams as signature
     * @return magicValue Returns MAGICVALUE (0x1626ba7e) if valid, INVALID_SIGNATURE otherwise
     */
    function isValidSignature(
        bytes32 _hash,
        bytes memory _signature
    ) public view returns (bytes4 magicValue) {
        if (_isValidZKSignature(_hash, _signature)) {
            return MAGICVALUE;
        }
        return INVALID_SIGNATURE;
    }
    
    /**
     * @notice Validates a signature with specific signer (extended version)
     * @param _hash Hash of the data that was signed
     * @param _signer Expected signer address (can be this contract's address)
     * @param _signature Encoded ProofVerificationParams as signature
     * @return magicValue Returns MAGICVALUE if valid
     */
    function isValidSignatureNow(
        bytes32 _hash,
        address _signer,
        bytes memory _signature
    ) external view returns (bytes4 magicValue) {
        // For ZK proofs, we can ignore the _signer parameter or validate it's this contract
        // The actual signer verification happens through the ZK proof
        if (_signer != address(this) && _signer != address(0)) {
            // Optionally enforce that signer must be this contract or zero
            return INVALID_SIGNATURE;
        }
        
        return isValidSignature(_hash, _signature);
    }
    
    /**
     * @notice Internal function to validate ZK signature
     * @param _hash Hash to validate (can be empty/zero for pure ZK proof validation)
     * @param _signature Encoded proof parameters
     * @return valid True if signature is valid
     */
    function _isValidZKSignature(
        bytes32 _hash,
        bytes memory _signature
    ) internal view returns (bool valid) {
        // Decode the signature into ProofVerificationParams
        ProofVerificationParams memory params;
        
        try this.decodeProofParams(_signature) returns (ProofVerificationParams memory decodedParams) {
            params = decodedParams;
        } catch {
            return false;
        }
        
        // Verify the ZK proof
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier.verifyProof(params);
        
        if (!verified) {
            return false;
        }
        
        // Check if the signer is authorized
        if (!authorizedSigners[uniqueIdentifier]) {
            return false;
        }
        
        // Check replay protection if enabled
        if (replayProtectionEnabled) {
            bytes32 proofHash = keccak256(params.proof);
            if (usedProofHashes[proofHash]) {
                return false;
            }
        }
        
        // If a specific hash is provided, we could optionally verify it's included in the proof
        // For now, we accept any valid proof from an authorized signer
        // The _hash parameter can be used for additional application-specific validation
        
        return true;
    }
    
    /**
     * @notice Validates and marks a signature as used (state-changing version)
     * @param _hash Hash of the data
     * @param _signature Encoded proof parameters
     * @return magicValue Returns MAGICVALUE if valid
     */
    function validateSignature(
        bytes32 _hash,
        bytes memory _signature
    ) external returns (bytes4 magicValue) {
        // Decode the signature
        ProofVerificationParams memory params = decodeProofParams(_signature);
        
        // Verify the ZK proof
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier.verifyProof(params);
        
        if (!verified) {
            revert InvalidProof();
        }
        
        // Check if the signer is authorized
        if (!authorizedSigners[uniqueIdentifier]) {
            revert UnauthorizedSigner();
        }
        
        // Check and mark proof as used if replay protection is enabled
        if (replayProtectionEnabled) {
            bytes32 proofHash = keccak256(params.proof);
            if (usedProofHashes[proofHash]) {
                revert ProofAlreadyUsed();
            }
            usedProofHashes[proofHash] = true;
        }
        
        emit SignatureValidated(_hash, uniqueIdentifier);
        
        return MAGICVALUE;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Authorizes a signer by their identity hash
     * @param _identityHash The unique identifier from ZKPassport
     */
    function authorizeSigner(bytes32 _identityHash) external onlyOwner {
        authorizedSigners[_identityHash] = true;
        emit SignerAuthorized(_identityHash);
    }
    
    /**
     * @notice Revokes a signer's authorization
     * @param _identityHash The unique identifier to revoke
     */
    function revokeSigner(bytes32 _identityHash) external onlyOwner {
        authorizedSigners[_identityHash] = false;
        emit SignerRevoked(_identityHash);
    }
    
    /**
     * @notice Toggles replay protection
     * @param _enabled Whether to enable replay protection
     */
    function setReplayProtection(bool _enabled) external onlyOwner {
        replayProtectionEnabled = _enabled;
        emit ReplayProtectionToggled(_enabled);
    }
    
    /**
     * @notice Transfers ownership of the contract
     * @param _newOwner The new owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }
    
    // ============ HELPER FUNCTIONS ============
    
    /**
     * @notice Decodes signature bytes into ProofVerificationParams
     * @param _signature The encoded signature
     * @return params The decoded parameters
     */
    function decodeProofParams(bytes memory _signature) 
        public 
        pure 
        returns (ProofVerificationParams memory params) 
    {
        if (_signature.length == 0) revert InvalidSignatureFormat();
        
        // Decode the signature bytes into the struct
        // This assumes the signature is ABI-encoded ProofVerificationParams
        (
            bytes32 vkeyHash,
            bytes memory proof,
            bytes32[] memory publicInputs,
            bytes memory committedInputs,
            uint256[] memory committedInputCounts,
            uint256 validityPeriodInDays,
            string memory domain,
            string memory scope,
            bool devMode
        ) = abi.decode(
            _signature,
            (bytes32, bytes, bytes32[], bytes, uint256[], uint256, string, string, bool)
        );
        
        params = ProofVerificationParams({
            vkeyHash: vkeyHash,
            proof: proof,
            publicInputs: publicInputs,
            committedInputs: committedInputs,
            committedInputCounts: committedInputCounts,
            validityPeriodInDays: validityPeriodInDays,
            domain: domain,
            scope: scope,
            devMode: devMode
        });
        
        return params;
    }
    
    /**
     * @notice Encodes ProofVerificationParams into signature bytes
     * @param params The parameters to encode
     * @return signature The encoded signature
     */
    function encodeProofParams(ProofVerificationParams memory params)
        external
        pure
        returns (bytes memory signature)
    {
        return abi.encode(
            params.vkeyHash,
            params.proof,
            params.publicInputs,
            params.committedInputs,
            params.committedInputCounts,
            params.validityPeriodInDays,
            params.domain,
            params.scope,
            params.devMode
        );
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Checks if an identity is authorized
     * @param _identityHash The identity hash to check
     * @return authorized True if authorized
     */
    function isAuthorized(bytes32 _identityHash) external view returns (bool) {
        return authorizedSigners[_identityHash];
    }
    
    /**
     * @notice Checks if a proof hash has been used
     * @param _proofHash The proof hash to check
     * @return used True if used
     */
    function isProofUsed(bytes32 _proofHash) external view returns (bool) {
        return usedProofHashes[_proofHash];
    }
    
    /**
     * @notice Gets the current owner
     * @return The owner address
     */
    function getOwner() external view returns (address) {
        return owner;
    }
}


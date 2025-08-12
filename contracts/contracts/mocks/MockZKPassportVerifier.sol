// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IZKPassportVerifier.sol";

contract MockZKPassportVerifier is IZKPassportVerifier {
    bool private _verified;
    bytes32 private _uniqueId;

    address private _boundUser;
    uint256 private _boundChainId;
    string private _boundCustomData;

    function setVerifyResult(bool verified, bytes32 uniqueId) external {
        _verified = verified;
        _uniqueId = uniqueId;
    }

    function setBoundData(address user, uint256 chainId, string memory customData) external {
        _boundUser = user;
        _boundChainId = chainId;
        _boundCustomData = customData;
    }

    // --- IZKPassportVerifier ---
    function verifyProof(
        ProofVerificationParams calldata /* params */
    ) external view override returns (bool verified, bytes32 uniqueIdentifier) {
        return (_verified, _uniqueId);
    }

    function getAgeProofInputs(
        bytes calldata /* committedInputs */, uint256[] calldata /* committedInputCounts */
    ) external pure override returns (uint256 currentDate, uint8 minAge, uint8 maxAge) {
        return (0, 0, 0);
    }

    function getDiscloseProofInputs(
        bytes calldata committedInputs,
        uint256[] calldata /* committedInputCounts */
    ) external pure override returns (bytes memory discloseMask, bytes memory discloseBytes) {
        return (bytes(""), committedInputs);
    }

    function getDisclosedData(
        bytes calldata /* discloseBytes */, bool /* isIDCard */
    ) external pure override returns (
        string memory name,
        string memory issuingCountry,
        string memory nationality,
        string memory gender,
        string memory birthDate,
        string memory expiryDate,
        string memory documentNumber,
        string memory documentType
    ) {
        return ("", "", "", "", "", "", "", "");
    }

    function getCountryProofInputs(
        bytes calldata /* committedInputs */, uint256[] calldata /* committedInputCounts */, ProofType /* proofType */
    ) external pure override returns (string[] memory countryList) {
        string[] memory empty;
        return empty;
    }

    function getDateProofInputs(
        bytes calldata /* committedInputs */, uint256[] calldata /* committedInputCounts */, ProofType /* proofType */
    ) external pure override returns (uint256 currentDate, uint256 minDate, uint256 maxDate) {
        return (0, 0, 0);
    }

    function getBindProofInputs(
        bytes calldata committedInputs, uint256[] calldata /* committedInputCounts */
    ) external pure override returns (bytes memory data) {
        // Simply forward committed inputs
        return committedInputs;
    }

    function getBoundData(
        bytes calldata /* data */
    ) external view override returns (
        address userAddress,
        uint256 chainId,
        string memory customData
    ) {
        return (_boundUser, _boundChainId, _boundCustomData);
    }

    function verifyScopes(
        bytes32[] calldata /* publicInputs */, string calldata /* domain */, string calldata /* scope */
    ) external pure override returns (bool) {
        return true;
    }
}



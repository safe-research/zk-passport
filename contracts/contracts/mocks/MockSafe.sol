// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@safe-global/safe-contracts/contracts/common/Enum.sol";
import "../ZKPassportSafeRecovery.sol";
import "../../interfaces/IZKPassportVerifier.sol";

contract MockSafe {
    event Executed(bytes data);
    bool public shouldSucceed = true;

    function setShouldSucceed(bool v) external { shouldSucceed = v; }

    function execTransactionFromModule(
        address /* to */, uint256 /* value */, bytes calldata data, Enum.Operation /* operation */
    ) external returns (bool success) {
        emit Executed(data);
        return shouldSucceed;
    }
}

interface IRecoveryModule {
    function register(ProofVerificationParams calldata params) external;
}

contract MockSafeCaller is MockSafe {
    function callRegister(address module, ProofVerificationParams calldata params) external {
        IRecoveryModule(module).register(params);
    }
}



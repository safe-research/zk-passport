// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@safe-global/safe-contracts/contracts/common/Enum.sol";

/**
 * @title MockSafe
 * @notice Mock Safe contract for testing
 */
contract MockSafe {
    address[] public owners;
    uint256 public threshold;
    mapping(address => bool) public isOwner;
    mapping(address => bool) public modules;
    
    event ExecutionSuccess(bytes32 txHash);
    event ExecutionFailure(bytes32 txHash);
    event EnabledModule(address module);
    event DisabledModule(address module);

    constructor(address[] memory _owners, uint256 _threshold) {
        require(_owners.length >= _threshold, "Invalid threshold");
        require(_threshold >= 1, "Threshold must be at least 1");
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Duplicate owner");
            owners.push(owner);
            isOwner[owner] = true;
        }
        threshold = _threshold;
    }

    function enableModule(address module) external {
        modules[module] = true;
        emit EnabledModule(module);
    }

    function disableModule(address module) external {
        modules[module] = false;
        emit DisabledModule(module);
    }

    function isModuleEnabled(address module) external view returns (bool) {
        return modules[module];
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getThreshold() external view returns (uint256) {
        return threshold;
    }

    function getModules() external view returns (address[] memory) {
        // For simplicity, return empty array
        address[] memory moduleList = new address[](0);
        return moduleList;
    }

    function execTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation operation
    ) external returns (bool success) {
        // Simulate transaction execution from Safe
        (success,) = to.call{value: value}(data);
        
        if (success) {
            emit ExecutionSuccess(keccak256(data));
        } else {
            emit ExecutionFailure(keccak256(data));
        }
    }

    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation
    ) external returns (bool success) {
        require(modules[msg.sender], "Module not enabled");
        
        // Simulate owner swap for testing
        if (data.length > 0) {
            // Decode swapOwner call
            bytes4 selector = bytes4(data[:4]);
            if (selector == bytes4(keccak256("swapOwner(address,address,address)"))) {
                (address prevOwner, address oldOwner, address newOwner) = abi.decode(data[4:], (address, address, address));
                
                // Simple swap simulation
                for (uint256 i = 0; i < owners.length; i++) {
                    if (owners[i] == oldOwner) {
                        owners[i] = newOwner;
                        isOwner[oldOwner] = false;
                        isOwner[newOwner] = true;
                        return true;
                    }
                }
                return false;
            }
        }
        
        (success,) = to.call{value: value}(data);
        return success;
    }

    function swapOwner(address prevOwner, address oldOwner, address newOwner) external {
        require(modules[msg.sender] || isOwner[msg.sender], "Not authorized");
        require(isOwner[oldOwner], "Old owner not found");
        require(!isOwner[newOwner], "New owner already exists");
        
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == oldOwner) {
                owners[i] = newOwner;
                isOwner[oldOwner] = false;
                isOwner[newOwner] = true;
                break;
            }
        }
    }

    receive() external payable {}
}
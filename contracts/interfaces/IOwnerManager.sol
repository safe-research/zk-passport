// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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
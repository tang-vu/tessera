// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentRegistry
/// @notice Minimal view surface of the agent registry consumed by other Tessera contracts.
interface IAgentRegistry {
    /// @notice Controller address authorized to sign receipts and act for `agentId`.
    function controllerOf(uint256 agentId) external view returns (address);

    /// @notice True if `agentId` has been registered.
    function exists(uint256 agentId) external view returns (bool);

    /// @notice Off-chain metadata URI (e.g. IPFS) describing the agent.
    function metadataURI(uint256 agentId) external view returns (string memory);

    /// @notice agentId controlled by `controller`, or 0 if none.
    function agentIdOf(address controller) external view returns (uint256);

    /// @notice Total number of registered agents (also the highest agentId).
    function agentCount() external view returns (uint256);
}

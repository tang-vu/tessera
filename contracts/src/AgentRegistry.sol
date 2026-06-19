// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title AgentRegistry
/// @notice Registry of AI agents. Each agent has a controller address (the key that signs reasoning
///         receipts and triggers settlements) plus an off-chain metadata URI. Agents are keyed by an
///         incremental agentId starting at 1 (0 means "not registered").
contract AgentRegistry is IAgentRegistry {
    struct Agent {
        address controller;
        string metadataURI;
        uint64 registeredAt;
    }

    /// @notice Total registered agents; also the highest valid agentId.
    uint256 public agentCount;

    /// @inheritdoc IAgentRegistry
    mapping(address => uint256) public agentIdOf;

    mapping(uint256 => Agent) private _agents;

    event AgentRegistered(uint256 indexed agentId, address indexed controller, string metadataURI);
    event ControllerUpdated(uint256 indexed agentId, address indexed oldController, address indexed newController);
    event MetadataUpdated(uint256 indexed agentId, string metadataURI);

    /// @notice Register a new agent controlled by `controller`.
    /// @dev One agent per controller address. Returns the new agentId.
    function register(address controller, string calldata uri) external returns (uint256 id) {
        require(controller != address(0), "controller=0");
        require(agentIdOf[controller] == 0, "controller registered");
        id = ++agentCount;
        _agents[id] = Agent({controller: controller, metadataURI: uri, registeredAt: uint64(block.timestamp)});
        agentIdOf[controller] = id;
        emit AgentRegistered(id, controller, uri);
    }

    /// @notice Transfer control of `agentId` to `newController`. Caller must be the current controller.
    function updateController(uint256 agentId, address newController) external {
        require(newController != address(0), "controller=0");
        require(agentIdOf[newController] == 0, "controller registered");
        Agent storage a = _agents[agentId];
        require(msg.sender == a.controller, "not controller");
        agentIdOf[a.controller] = 0;
        agentIdOf[newController] = agentId;
        emit ControllerUpdated(agentId, a.controller, newController);
        a.controller = newController;
    }

    /// @notice Update the off-chain metadata URI. Caller must be the controller.
    function updateMetadata(uint256 agentId, string calldata uri) external {
        Agent storage a = _agents[agentId];
        require(msg.sender == a.controller, "not controller");
        a.metadataURI = uri;
        emit MetadataUpdated(agentId, uri);
    }

    /// @inheritdoc IAgentRegistry
    function controllerOf(uint256 agentId) external view returns (address) {
        return _agents[agentId].controller;
    }

    /// @inheritdoc IAgentRegistry
    function metadataURI(uint256 agentId) external view returns (string memory) {
        return _agents[agentId].metadataURI;
    }

    /// @inheritdoc IAgentRegistry
    function exists(uint256 agentId) public view returns (bool) {
        return agentId != 0 && agentId <= agentCount;
    }

    /// @notice Full agent record.
    function getAgent(uint256 agentId)
        external
        view
        returns (address controller, string memory uri, uint64 registeredAt)
    {
        Agent storage a = _agents[agentId];
        return (a.controller, a.metadataURI, a.registeredAt);
    }
}

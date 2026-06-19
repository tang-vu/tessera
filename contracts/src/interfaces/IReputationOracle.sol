// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IReputationOracle
/// @notice Credit-scoring surface. Mutating calls are restricted to authorized recorder contracts.
interface IReputationOracle {
    /// @notice Current credit score for `agentId` in [0, 1000] (BASELINE if never scored).
    function scoreOf(uint256 agentId) external view returns (uint256);

    /// @notice Record the outcome of a settlement against an agent's reputation.
    /// @param amount Settlement amount in stablecoin base units (drives a capped volume bonus).
    /// @param success Whether the settlement executed successfully.
    /// @param onTime Whether it settled within the expected window.
    /// @param hasVerifiedReceipt Whether a verified reasoning receipt backed the settlement.
    function recordSettlement(
        uint256 agentId,
        uint256 amount,
        bool success,
        bool onTime,
        bool hasVerifiedReceipt
    ) external;

    /// @notice Reward an agent for honoring (repaying) a credit-line obligation.
    function recordRepayment(uint256 agentId, uint256 amount, bool onTime) external;

    /// @notice Record a dispute outcome. `resolvedAgainst` true => penalize the agent.
    function recordDispute(uint256 agentId, bool resolvedAgainst) external;

    /// @notice Slash an agent that defaulted on a credit-line obligation.
    function recordDefault(uint256 agentId) external;
}

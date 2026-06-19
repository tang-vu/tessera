// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ICreditPolicy
/// @notice Pure mapping from a credit score to credit terms.
interface ICreditPolicy {
    /// @notice Credit terms unlocked by `score`.
    /// @return creditLimit Max under-collateralized borrow in stablecoin base units.
    /// @return feeBps Borrow fee in basis points (1 bp = 0.01%).
    function terms(uint256 score) external view returns (uint256 creditLimit, uint16 feeBps);
}

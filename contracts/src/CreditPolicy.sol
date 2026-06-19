// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ICreditPolicy} from "./interfaces/ICreditPolicy.sol";

/// @title CreditPolicy
/// @notice Maps a reputation score to credit terms (limit + fee) via owner-configurable tiers.
///         This is the literal implementation of "honest agents get higher limits and lower fees".
///         Tiers are sorted ascending by `minScore`; the highest tier whose `minScore <= score` wins.
contract CreditPolicy is ICreditPolicy, Ownable {
    struct Tier {
        uint16 minScore;
        uint256 creditLimit; // stablecoin base units (6 decimals)
        uint16 feeBps; // 1 bp = 0.01%
    }

    Tier[] private _tiers;

    event TiersUpdated(uint256 count);

    /// @dev Default tiers (limits in 6-decimal USDC units):
    ///      <200 → (0, 1.00%) · 200–499 → (1k, 0.70%) · 500–799 → (10k, 0.45%) · ≥800 → (50k, 0.20%)
    constructor(address owner_) Ownable(owner_) {
        _tiers.push(Tier({minScore: 0, creditLimit: 0, feeBps: 100}));
        _tiers.push(Tier({minScore: 200, creditLimit: 1_000e6, feeBps: 70}));
        _tiers.push(Tier({minScore: 500, creditLimit: 10_000e6, feeBps: 45}));
        _tiers.push(Tier({minScore: 800, creditLimit: 50_000e6, feeBps: 20}));
    }

    /// @inheritdoc ICreditPolicy
    function terms(uint256 score) external view returns (uint256 creditLimit, uint16 feeBps) {
        uint256 len = _tiers.length;
        creditLimit = _tiers[0].creditLimit;
        feeBps = _tiers[0].feeBps;
        for (uint256 i = 1; i < len; i++) {
            if (score >= _tiers[i].minScore) {
                creditLimit = _tiers[i].creditLimit;
                feeBps = _tiers[i].feeBps;
            } else {
                break;
            }
        }
    }

    /// @notice Replace the tier table. Must start at minScore 0, be strictly ascending, fees ≤ 100%.
    function setTiers(Tier[] calldata newTiers) external onlyOwner {
        require(newTiers.length > 0, "empty");
        require(newTiers[0].minScore == 0, "first minScore!=0");
        delete _tiers;
        for (uint256 i = 0; i < newTiers.length; i++) {
            if (i > 0) require(newTiers[i].minScore > newTiers[i - 1].minScore, "unsorted");
            require(newTiers[i].feeBps <= 10_000, "fee>100%");
            _tiers.push(newTiers[i]);
        }
        emit TiersUpdated(newTiers.length);
    }

    /// @notice All configured tiers.
    function tiers() external view returns (Tier[] memory) {
        return _tiers;
    }

    /// @notice Number of configured tiers.
    function tierCount() external view returns (uint256) {
        return _tiers.length;
    }
}

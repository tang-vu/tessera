// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {IReputationOracle} from "./interfaces/IReputationOracle.sol";

/// @title ReputationOracle
/// @notice Transparent, on-chain credit score in [0, 1000] for each agent. The single source of truth
///         for agent reputation. Only authorized recorder contracts (SettlementHook, CreditLine) may
///         mutate scores; the scoring math is deliberately simple and fully auditable.
///
/// Scoring model (all constants below):
///  - Every agent starts at BASELINE (500).
///  - Successful, receipt-backed settlements reward score (+ a capped bonus scaled by volume,
///    + an on-time bonus / - a late penalty).
///  - Settlements without a verified receipt earn only a token reward (receipts are the point).
///  - Failures, disputes resolved against the agent, and credit defaults penalize score.
///  - A mild linear decay pulls stale scores back toward BASELINE so reputation reflects recent behavior.
contract ReputationOracle is IReputationOracle, Ownable {
    // ── Scoring constants (points) ──────────────────────────────────────────
    uint256 public constant BASELINE = 500;
    uint256 public constant MAX_SCORE = 1000;

    int256 internal constant REWARD_RECEIPTED = 25; // success + verified receipt
    int256 internal constant REWARD_NO_RECEIPT = 2; // success, no receipt
    int256 internal constant REPAY_REWARD = 25; // honored credit obligation
    int256 internal constant ONTIME_BONUS = 5;
    int256 internal constant LATE_PENALTY = 10;
    int256 internal constant FAIL_PENALTY = 40;
    int256 internal constant DISPUTE_PENALTY = 80;
    int256 internal constant DISPUTE_CLEARED_REWARD = 3;
    int256 internal constant DEFAULT_PENALTY = 150;

    uint256 internal constant VOLUME_BONUS_UNIT = 100e6; // +1 point per 100 USDC (6 decimals)
    int256 internal constant VOLUME_BONUS_MAX = 10;

    uint256 internal constant DECAY_PERIOD = 1 days;
    int256 internal constant DECAY_PER_PERIOD = 1; // points toward BASELINE per period

    IAgentRegistry public immutable registry;

    struct Rep {
        bool initialized;
        uint16 score;
        uint64 lastUpdate;
        uint32 settlements;
        uint32 failures;
        uint32 disputesLost;
        uint32 defaults;
        uint128 volume;
    }

    mapping(uint256 => Rep) private _rep;
    mapping(address => bool) public isRecorder;

    event ScoreUpdated(uint256 indexed agentId, uint256 newScore, int256 delta, string reason);
    event RecorderSet(address indexed recorder, bool allowed);

    modifier onlyRecorder() {
        require(isRecorder[msg.sender], "not recorder");
        _;
    }

    constructor(address registry_, address owner_) Ownable(owner_) {
        require(registry_ != address(0), "registry=0");
        registry = IAgentRegistry(registry_);
    }

    /// @notice Authorize or revoke a contract allowed to record reputation events.
    function setRecorder(address recorder, bool allowed) external onlyOwner {
        require(recorder != address(0), "recorder=0");
        isRecorder[recorder] = allowed;
        emit RecorderSet(recorder, allowed);
    }

    /// @inheritdoc IReputationOracle
    function scoreOf(uint256 agentId) public view returns (uint256) {
        Rep storage r = _rep[agentId];
        return r.initialized ? _decayed(r) : BASELINE;
    }

    /// @inheritdoc IReputationOracle
    function recordSettlement(uint256 agentId, uint256 amount, bool success, bool onTime, bool hasVerifiedReceipt)
        external
        onlyRecorder
    {
        require(registry.exists(agentId), "unknown agent");
        Rep storage r = _rep[agentId];
        int256 delta;
        string memory reason;
        if (success) {
            int256 base = hasVerifiedReceipt ? REWARD_RECEIPTED : REWARD_NO_RECEIPT;
            delta = base + _volumeBonus(amount) + (onTime ? ONTIME_BONUS : -LATE_PENALTY);
            r.settlements += 1;
            r.volume += uint128(amount);
            reason = hasVerifiedReceipt ? "settle:ok+receipt" : "settle:ok";
        } else {
            delta = -FAIL_PENALTY;
            r.failures += 1;
            reason = "settle:fail";
        }
        _applyDelta(agentId, delta, reason);
    }

    /// @inheritdoc IReputationOracle
    function recordRepayment(uint256 agentId, uint256 amount, bool onTime) external onlyRecorder {
        require(registry.exists(agentId), "unknown agent");
        int256 delta = REPAY_REWARD + _volumeBonus(amount) + (onTime ? ONTIME_BONUS : -LATE_PENALTY);
        _applyDelta(agentId, delta, "credit:repaid");
    }

    /// @inheritdoc IReputationOracle
    function recordDispute(uint256 agentId, bool resolvedAgainst) external onlyRecorder {
        require(registry.exists(agentId), "unknown agent");
        if (resolvedAgainst) {
            _rep[agentId].disputesLost += 1;
            _applyDelta(agentId, -DISPUTE_PENALTY, "dispute:lost");
        } else {
            _applyDelta(agentId, DISPUTE_CLEARED_REWARD, "dispute:cleared");
        }
    }

    /// @inheritdoc IReputationOracle
    function recordDefault(uint256 agentId) external onlyRecorder {
        require(registry.exists(agentId), "unknown agent");
        _rep[agentId].defaults += 1;
        _applyDelta(agentId, -DEFAULT_PENALTY, "credit:default");
    }

    /// @notice Full reputation record plus the current (decayed) score, for dashboards.
    function stats(uint256 agentId)
        external
        view
        returns (
            uint256 score,
            uint32 settlements,
            uint32 failures,
            uint32 disputesLost,
            uint32 defaults,
            uint128 volume,
            uint64 lastUpdate
        )
    {
        Rep storage r = _rep[agentId];
        return (scoreOf(agentId), r.settlements, r.failures, r.disputesLost, r.defaults, r.volume, r.lastUpdate);
    }

    // ── internals ───────────────────────────────────────────────────────────

    function _volumeBonus(uint256 amount) internal pure returns (int256) {
        uint256 b = amount / VOLUME_BONUS_UNIT;
        if (b > uint256(VOLUME_BONUS_MAX)) b = uint256(VOLUME_BONUS_MAX);
        return int256(b);
    }

    /// @dev Current score after applying linear decay toward BASELINE since `lastUpdate`.
    function _decayed(Rep storage r) internal view returns (uint16) {
        uint256 steps = (block.timestamp - r.lastUpdate) / DECAY_PERIOD;
        if (steps == 0) return r.score;
        int256 decayAmt = int256(steps) * DECAY_PER_PERIOD;
        int256 s = int256(uint256(r.score));
        int256 baseline = int256(BASELINE);
        if (s > baseline) {
            s -= decayAmt;
            if (s < baseline) s = baseline;
        } else if (s < baseline) {
            s += decayAmt;
            if (s > baseline) s = baseline;
        }
        return uint16(uint256(s));
    }

    function _applyDelta(uint256 agentId, int256 delta, string memory reason) internal {
        Rep storage r = _rep[agentId];
        int256 cur = int256(uint256(r.initialized ? _decayed(r) : uint16(BASELINE)));
        int256 next = cur + delta;
        if (next < 0) next = 0;
        if (next > int256(MAX_SCORE)) next = int256(MAX_SCORE);
        r.score = uint16(uint256(next));
        r.initialized = true;
        r.lastUpdate = uint64(block.timestamp);
        emit ScoreUpdated(agentId, uint256(next), delta, reason);
    }
}

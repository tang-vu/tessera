// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {IReceiptVerifier} from "./interfaces/IReceiptVerifier.sol";
import {IReputationOracle} from "./interfaces/IReputationOracle.sol";

/// @title SettlementHook
/// @notice Mock HSP (HashKey Settlement Protocol) settlement endpoint for the demo. Requires a verified
///         reasoning receipt for the settlement, performs a stablecoin transfer agent → payee, then
///         records the outcome with the ReputationOracle. On mainnet the mock transfer is replaced by
///         the real HSP settlement call (see the SWAP POINT below) — Tessera's scoring is unchanged by
///         that swap, it simply consumes the success/failure signal.
contract SettlementHook is Ownable {
    using SafeERC20 for IERC20;

    IAgentRegistry public immutable registry;
    IReceiptVerifier public immutable receipts;
    IReputationOracle public immutable oracle;
    IERC20 public immutable stablecoin;

    event Settled(
        uint256 indexed agentId, address indexed payee, uint256 amount, bytes32 indexed settlementId, bool onTime
    );
    event FailureReported(uint256 indexed agentId, uint256 amount);
    event DisputeReported(uint256 indexed agentId, bool resolvedAgainst);

    constructor(address registry_, address receipts_, address oracle_, address stablecoin_, address owner_)
        Ownable(owner_)
    {
        require(
            registry_ != address(0) && receipts_ != address(0) && oracle_ != address(0) && stablecoin_ != address(0),
            "zero addr"
        );
        registry = IAgentRegistry(registry_);
        receipts = IReceiptVerifier(receipts_);
        oracle = IReputationOracle(oracle_);
        stablecoin = IERC20(stablecoin_);
    }

    /// @notice Settle a payment for `agentId` to `payee`. The agent must control itself, have anchored a
    ///         verified receipt for `settlementId`, and have approved this contract for `amount`.
    /// @param onTime Whether the settlement is within its expected window (drives the reputation bonus).
    function settle(uint256 agentId, address payee, uint256 amount, bytes32 settlementId, bool onTime) external {
        require(registry.exists(agentId), "unknown agent");
        require(msg.sender == registry.controllerOf(agentId), "not controller");
        require(payee != address(0), "payee=0");
        require(amount > 0, "amount=0");
        require(receipts.verifiedReceipt(agentId, settlementId), "no receipt");

        address controller = msg.sender;

        // ─────────────────────────── HSP SWAP POINT ───────────────────────────
        // MOCK (testnet/demo): pull the stablecoin directly from the agent to the payee.
        stablecoin.safeTransferFrom(controller, payee, amount);
        // On HashKey mainnet, replace the single line above with the real HSP settlement:
        //   IHSPSettlement(HSP).settle(settlementId, address(stablecoin), controller, payee, amount, mandateHash);
        // HSP runs AML / sanctions / mandate checks off-chain via licensed nodes, then executes the
        // on-chain transfer atomically. Everything below (reputation accounting) is identical either way.
        // ───────────────────────────────────────────────────────────────────────

        oracle.recordSettlement(agentId, amount, true, onTime, true);
        emit Settled(agentId, payee, amount, settlementId, onTime);
    }

    /// @notice Report a failed settlement attempt for `agentId` (no successful transfer occurred).
    /// @dev Owner-gated: models the settlement coordinator relaying an HSP failure outcome. Used to seed
    ///      realistic histories and to penalize agents whose settlements bounce.
    function reportFailure(uint256 agentId, uint256 amount) external onlyOwner {
        require(registry.exists(agentId), "unknown agent");
        oracle.recordSettlement(agentId, amount, false, false, false);
        emit FailureReported(agentId, amount);
    }

    /// @notice Relay a dispute resolution outcome for `agentId`.
    /// @dev Owner-gated: in production this is driven by an off-chain arbitration / chargeback result.
    function reportDispute(uint256 agentId, bool resolvedAgainst) external onlyOwner {
        require(registry.exists(agentId), "unknown agent");
        oracle.recordDispute(agentId, resolvedAgainst);
        emit DisputeReported(agentId, resolvedAgainst);
    }
}

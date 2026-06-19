// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {IReceiptVerifier} from "./interfaces/IReceiptVerifier.sol";

/// @title ReceiptVerifier
/// @notice Anchors verifiable *reasoning receipts* on-chain. The full LLM reasoning trace is stored
///         off-chain (IPFS/Irys); only its keccak256 hash is anchored here, gated by an ECDSA
///         signature from the agent's controller. This binds an agent's stated reasoning to each
///         settlement so the reputation layer can require receipts for credit.
contract ReceiptVerifier is IReceiptVerifier {
    using MessageHashUtils for bytes32;

    IAgentRegistry public immutable registry;

    struct Receipt {
        bytes32 receiptHash;
        uint64 anchoredAt;
    }

    /// @dev agentId => settlementId => receipt
    mapping(uint256 => mapping(bytes32 => Receipt)) private _receipts;

    event ReceiptAnchored(
        uint256 indexed agentId,
        bytes32 indexed settlementId,
        bytes32 receiptHash,
        address signer
    );

    constructor(address registry_) {
        require(registry_ != address(0), "registry=0");
        registry = IAgentRegistry(registry_);
    }

    /// @notice Anchor a reasoning receipt for (agentId, settlementId).
    /// @param receiptHash keccak256 of the canonical off-chain reasoning trace.
    /// @param signature EIP-191 (`personal_sign`) signature over `receiptHash` by the agent controller.
    /// @dev Anyone may submit; the controller signature is the authenticity gate. One receipt per slot.
    function anchorReceipt(
        uint256 agentId,
        bytes32 settlementId,
        bytes32 receiptHash,
        bytes calldata signature
    ) external {
        require(registry.exists(agentId), "unknown agent");
        require(receiptHash != bytes32(0), "empty hash");
        require(_receipts[agentId][settlementId].anchoredAt == 0, "already anchored");

        address controller = registry.controllerOf(agentId);
        address signer = ECDSA.recover(receiptHash.toEthSignedMessageHash(), signature);
        require(signer == controller, "bad signature");

        _receipts[agentId][settlementId] = Receipt({receiptHash: receiptHash, anchoredAt: uint64(block.timestamp)});
        emit ReceiptAnchored(agentId, settlementId, receiptHash, signer);
    }

    /// @inheritdoc IReceiptVerifier
    function verifiedReceipt(uint256 agentId, bytes32 settlementId) external view returns (bool) {
        return _receipts[agentId][settlementId].anchoredAt != 0;
    }

    /// @inheritdoc IReceiptVerifier
    function receiptHashOf(uint256 agentId, bytes32 settlementId) external view returns (bytes32) {
        return _receipts[agentId][settlementId].receiptHash;
    }

    /// @notice Timestamp the receipt was anchored, or 0 if none.
    function anchoredAt(uint256 agentId, bytes32 settlementId) external view returns (uint64) {
        return _receipts[agentId][settlementId].anchoredAt;
    }
}

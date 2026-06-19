// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IReceiptVerifier
/// @notice View surface for checking anchored reasoning receipts.
interface IReceiptVerifier {
    /// @notice True if a signed reasoning receipt is anchored for (agentId, settlementId).
    function verifiedReceipt(uint256 agentId, bytes32 settlementId) external view returns (bool);

    /// @notice The anchored receipt hash for (agentId, settlementId), or bytes32(0) if none.
    function receiptHashOf(uint256 agentId, bytes32 settlementId) external view returns (bytes32);
}

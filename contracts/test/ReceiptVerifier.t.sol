// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TesseraTestBase} from "./helpers/TesseraTestBase.sol";

contract ReceiptVerifierTest is TesseraTestBase {
    uint256 internal constant AGENT_PK = 0xA11CE;
    uint256 internal constant WRONG_PK = 0xB0B;

    uint256 internal agentId;
    bytes32 internal constant SETTLEMENT_ID = keccak256("settlement-1");
    bytes32 internal constant RECEIPT_HASH = keccak256("reasoning-trace");

    function setUp() public override {
        super.setUp();
        (agentId,) = _registerAgent(AGENT_PK, "ipfs://agent");
    }

    function test_AnchorWithValidSignature() public {
        _anchorReceipt(agentId, SETTLEMENT_ID, RECEIPT_HASH, AGENT_PK);
        assertTrue(sys.verifier.verifiedReceipt(agentId, SETTLEMENT_ID));
        assertEq(sys.verifier.receiptHashOf(agentId, SETTLEMENT_ID), RECEIPT_HASH);
        assertGt(sys.verifier.anchoredAt(agentId, SETTLEMENT_ID), 0);
    }

    function test_RevertOnWrongSigner() public {
        bytes memory badSig = _signReceipt(WRONG_PK, RECEIPT_HASH);
        vm.expectRevert(bytes("bad signature"));
        sys.verifier.anchorReceipt(agentId, SETTLEMENT_ID, RECEIPT_HASH, badSig);
    }

    function test_RevertOnUnknownAgent() public {
        bytes memory sig = _signReceipt(AGENT_PK, RECEIPT_HASH);
        vm.expectRevert(bytes("unknown agent"));
        sys.verifier.anchorReceipt(999, SETTLEMENT_ID, RECEIPT_HASH, sig);
    }

    function test_RevertOnEmptyHash() public {
        bytes memory sig = _signReceipt(AGENT_PK, bytes32(0));
        vm.expectRevert(bytes("empty hash"));
        sys.verifier.anchorReceipt(agentId, SETTLEMENT_ID, bytes32(0), sig);
    }

    function test_RevertOnDoubleAnchor() public {
        _anchorReceipt(agentId, SETTLEMENT_ID, RECEIPT_HASH, AGENT_PK);
        bytes memory sig = _signReceipt(AGENT_PK, RECEIPT_HASH);
        vm.expectRevert(bytes("already anchored"));
        sys.verifier.anchorReceipt(agentId, SETTLEMENT_ID, RECEIPT_HASH, sig);
    }

    function test_UnverifiedByDefault() public view {
        assertFalse(sys.verifier.verifiedReceipt(agentId, keccak256("nope")));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TesseraTestBase} from "./helpers/TesseraTestBase.sol";

contract ReputationOracleTest is TesseraTestBase {
    uint256 internal constant PK = 0xA11CE;
    uint256 internal agentId;

    function setUp() public override {
        super.setUp();
        sys.oracle.setRecorder(address(this), true);
        (agentId,) = _registerAgent(PK, "ipfs://a");
    }

    function test_BaselineForUnscored() public view {
        assertEq(sys.oracle.scoreOf(agentId), 500);
        assertEq(sys.oracle.scoreOf(98765), 500); // unknown agent also reads baseline
    }

    function test_SuccessWithReceipt() public {
        // 25 base + 10 (capped volume bonus) + 5 on-time = +40
        sys.oracle.recordSettlement(agentId, 1_000e6, true, true, true);
        assertEq(sys.oracle.scoreOf(agentId), 540);
    }

    function test_VolumeBonusCapped() public {
        sys.oracle.recordSettlement(agentId, 10_000e6, true, true, true); // bonus capped at 10
        assertEq(sys.oracle.scoreOf(agentId), 540);
    }

    function test_SuccessWithoutReceiptSmallReward() public {
        // 2 base + 10 + 5 = +17 (receipts are the whole point → tiny reward without one)
        sys.oracle.recordSettlement(agentId, 1_000e6, true, true, false);
        assertEq(sys.oracle.scoreOf(agentId), 517);
    }

    function test_LateReducesReward() public {
        // 25 + 0 volume bonus - 10 late = +15
        sys.oracle.recordSettlement(agentId, 50e6, true, false, true);
        assertEq(sys.oracle.scoreOf(agentId), 515);
    }

    function test_FailurePenalty() public {
        sys.oracle.recordSettlement(agentId, 1_000e6, false, false, false); // -40
        assertEq(sys.oracle.scoreOf(agentId), 460);
    }

    function test_DisputeLostAndCleared() public {
        sys.oracle.recordDispute(agentId, true); // -80
        assertEq(sys.oracle.scoreOf(agentId), 420);
        sys.oracle.recordDispute(agentId, false); // +3
        assertEq(sys.oracle.scoreOf(agentId), 423);
    }

    function test_DefaultPenalty() public {
        sys.oracle.recordDefault(agentId); // -150
        assertEq(sys.oracle.scoreOf(agentId), 350);
    }

    function test_RepaymentReward() public {
        sys.oracle.recordRepayment(agentId, 1_000e6, true); // 25 + 10 + 5 = +40
        assertEq(sys.oracle.scoreOf(agentId), 540);
    }

    function test_ClampsAtMax() public {
        for (uint256 i; i < 20; i++) {
            sys.oracle.recordSettlement(agentId, 1_000e6, true, true, true);
        }
        assertEq(sys.oracle.scoreOf(agentId), 1000);
    }

    function test_ClampsAtZero() public {
        for (uint256 i; i < 10; i++) {
            sys.oracle.recordDefault(agentId);
        }
        assertEq(sys.oracle.scoreOf(agentId), 0);
    }

    function test_DecayTowardBaseline() public {
        sys.oracle.recordDispute(agentId, true); // 420
        vm.warp(block.timestamp + 30 days); // +1/day toward 500 → 450
        assertEq(sys.oracle.scoreOf(agentId), 450);
    }

    function test_OnlyRecorderCanRecord() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(bytes("not recorder"));
        sys.oracle.recordSettlement(agentId, 1, true, true, true);
    }

    function test_OnlyOwnerSetsRecorder() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert();
        sys.oracle.setRecorder(makeAddr("x"), true);
    }

    function test_StatsReflectActivity() public {
        sys.oracle.recordSettlement(agentId, 1_000e6, true, true, true);
        sys.oracle.recordSettlement(agentId, 500e6, false, false, false);
        (uint256 score, uint32 settlements, uint32 failures,,,,) = sys.oracle.stats(agentId);
        assertEq(settlements, 1);
        assertEq(failures, 1);
        assertEq(score, sys.oracle.scoreOf(agentId));
    }
}

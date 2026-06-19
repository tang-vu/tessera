// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TesseraTestBase} from "./helpers/TesseraTestBase.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice End-to-end proof of the Tessera demo loop: settle → receipt anchored → score updates →
///         credit terms change. Covers both an honest agent earning better terms and a dishonest
///         agent getting cut off.
contract IntegrationTest is TesseraTestBase {
    uint256 internal constant HONEST_PK = 0xA11CE;
    uint256 internal constant BAD_PK = 0xBAD;
    address internal payee = makeAddr("payee");
    address internal lp = makeAddr("lp");

    function test_FullLoop_HonestAgentEarnsBetterTermsAndCredit() public {
        (uint256 agentId, address controller) = _registerAgent(HONEST_PK, "ipfs://honest");

        // Start neutral: 500 → Established tier (10k limit, 0.45% fee).
        assertEq(sys.oracle.scoreOf(agentId), 500);
        (uint256 limit0, uint16 fee0) = sys.policy.terms(sys.oracle.scoreOf(agentId));
        assertEq(limit0, 10_000e6);
        assertEq(fee0, 45);

        _fundAndApprove(controller, address(sys.hook), 100_000e6);

        // 10 receipted, on-time settlements → +40 each → 900.
        for (uint256 i; i < 10; i++) {
            bytes32 sid = keccak256(abi.encodePacked("settlement", i));
            bytes32 rh = keccak256(abi.encodePacked("trace", i));
            _anchorReceipt(agentId, sid, rh, HONEST_PK);
            vm.prank(controller);
            sys.hook.settle(agentId, payee, 1_000e6, sid, true);
        }

        uint256 finalScore = sys.oracle.scoreOf(agentId);
        assertGe(finalScore, 800);
        (uint256 limit1, uint16 fee1) = sys.policy.terms(finalScore);

        // Terms visibly improved: higher limit, lower fee (Prime tier).
        assertEq(limit1, 50_000e6);
        assertEq(fee1, 20);
        assertGt(limit1, limit0);
        assertLt(fee1, fee0);
        assertEq(IERC20(address(sys.stablecoin)).balanceOf(payee), 10_000e6);

        // The prime score now unlocks large under-collateralized credit at the cheap rate.
        _fundAndApprove(lp, address(sys.creditLine), 60_000e6);
        vm.prank(lp);
        sys.creditLine.deposit(60_000e6);
        vm.prank(controller);
        sys.creditLine.borrow(40_000e6); // within the new 50k limit
        (uint256 principal,,,) = sys.creditLine.loans(agentId);
        assertEq(principal, 40_000e6);
    }

    function test_FullLoop_DishonestAgentCutOff() public {
        (uint256 agentId,) = _registerAgent(BAD_PK, "ipfs://bad");
        address badController = vm.addr(BAD_PK);

        // Failures + disputes drag the score below the trust floor.
        sys.hook.reportFailure(agentId, 1_000e6); // -40 → 460
        sys.hook.reportDispute(agentId, true); // -80 → 380
        sys.hook.reportDispute(agentId, true); // -80 → 300
        sys.hook.reportDispute(agentId, true); // -80 → 220
        sys.hook.reportFailure(agentId, 1_000e6); // -40 → 180

        uint256 score = sys.oracle.scoreOf(agentId);
        assertLt(score, 200);
        (uint256 limit, uint16 fee) = sys.policy.terms(score);
        assertEq(limit, 0); // Untrusted: no credit
        assertEq(fee, 100);

        // Credit is cut off entirely — even 1 base unit exceeds a zero limit.
        _fundAndApprove(lp, address(sys.creditLine), 10_000e6);
        vm.prank(lp);
        sys.creditLine.deposit(10_000e6);
        vm.prank(badController);
        vm.expectRevert(bytes("exceeds limit"));
        sys.creditLine.borrow(1);
    }
}

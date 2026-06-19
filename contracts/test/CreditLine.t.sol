// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TesseraTestBase} from "./helpers/TesseraTestBase.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CreditLineTest is TesseraTestBase {
    uint256 internal constant PK = 0xA11CE;
    uint256 internal agentId;
    address internal controller;
    address internal lp = makeAddr("lp");

    // score 500 (baseline) → limit 10_000e6, fee 45 bps
    uint256 internal constant FEE_ON_5K = (5_000e6 * 45) / 10_000; // 22.5e6

    function setUp() public override {
        super.setUp();
        (agentId, controller) = _registerAgent(PK, "ipfs://a");
    }

    function _seedPool(uint256 amount) internal {
        _fundAndApprove(lp, address(sys.creditLine), amount);
        vm.prank(lp);
        sys.creditLine.deposit(amount);
    }

    function test_DepositMintsShares() public {
        _seedPool(10_000e6);
        assertEq(sys.creditLine.sharesOf(lp), 10_000e6);
        assertEq(sys.creditLine.totalAssets(), 10_000e6);
    }

    function test_BorrowWithinLimit() public {
        _seedPool(20_000e6);
        vm.prank(controller);
        sys.creditLine.borrow(5_000e6);
        assertEq(IERC20(address(sys.stablecoin)).balanceOf(controller), 5_000e6);
        assertEq(sys.creditLine.totalPrincipalOut(), 5_000e6);
        (uint256 principal, uint256 feeOwed,,) = sys.creditLine.loans(agentId);
        assertEq(principal, 5_000e6);
        assertEq(feeOwed, FEE_ON_5K);
        assertEq(sys.creditLine.availableCredit(agentId), 5_000e6); // 10k limit - 5k used
    }

    function test_RevertBorrowExceedsLimit() public {
        _seedPool(50_000e6);
        vm.prank(controller);
        vm.expectRevert(bytes("exceeds limit"));
        sys.creditLine.borrow(20_000e6);
    }

    function test_RevertBorrowNotAgent() public {
        _seedPool(10_000e6);
        vm.prank(lp);
        vm.expectRevert(bytes("not an agent"));
        sys.creditLine.borrow(1_000e6);
    }

    function test_RepayAccruesYieldToLPs() public {
        _seedPool(20_000e6);
        vm.prank(controller);
        sys.creditLine.borrow(5_000e6);

        _fundAndApprove(controller, address(sys.creditLine), 5_000e6 + FEE_ON_5K);
        vm.prank(controller);
        sys.creditLine.repay(5_000e6 + FEE_ON_5K);

        (uint256 principal, uint256 feeOwed,, bool defaulted) = sys.creditLine.loans(agentId);
        assertEq(principal, 0);
        assertEq(feeOwed, 0);
        assertFalse(defaulted);
        assertEq(sys.creditLine.totalAssets(), 20_000e6 + FEE_ON_5K);

        uint256 lpShares = sys.creditLine.sharesOf(lp);
        vm.prank(lp);
        uint256 got = sys.creditLine.withdraw(lpShares);
        assertEq(got, 20_000e6 + FEE_ON_5K); // LP earned the borrow fee
        assertGt(sys.oracle.scoreOf(agentId), 500); // on-time repayment rewarded
    }

    function test_DefaultSlashesScoreAndLosesLPs() public {
        _seedPool(20_000e6);
        vm.prank(controller);
        sys.creditLine.borrow(5_000e6);

        vm.warp(block.timestamp + 8 days); // past 7-day due date
        sys.creditLine.markDefault(agentId);

        (uint256 principal,,, bool defaulted) = sys.creditLine.loans(agentId);
        assertEq(principal, 0);
        assertTrue(defaulted);
        assertEq(sys.creditLine.totalAssets(), 15_000e6); // 5k principal written off
        assertEq(sys.oracle.scoreOf(agentId), 350); // 500 - 150
    }

    function test_RevertMarkDefaultNotOverdue() public {
        _seedPool(20_000e6);
        vm.prank(controller);
        sys.creditLine.borrow(5_000e6);
        vm.expectRevert(bytes("not overdue"));
        sys.creditLine.markDefault(agentId);
    }

    function test_RevertBorrowAfterDefault() public {
        _seedPool(20_000e6);
        vm.prank(controller);
        sys.creditLine.borrow(5_000e6);
        vm.warp(block.timestamp + 8 days);
        sys.creditLine.markDefault(agentId);

        vm.prank(controller);
        vm.expectRevert(bytes("in default"));
        sys.creditLine.borrow(1);
    }
}

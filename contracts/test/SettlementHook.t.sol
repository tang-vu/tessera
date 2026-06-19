// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TesseraTestBase} from "./helpers/TesseraTestBase.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SettlementHookTest is TesseraTestBase {
    uint256 internal constant PK = 0xA11CE;
    uint256 internal agentId;
    address internal controller;
    address internal payee = makeAddr("payee");

    bytes32 internal constant SID = keccak256("s1");
    bytes32 internal constant RH = keccak256("trace");
    uint256 internal constant AMT = 1_000e6;

    function setUp() public override {
        super.setUp();
        (agentId, controller) = _registerAgent(PK, "ipfs://a");
    }

    function _prep() internal {
        _anchorReceipt(agentId, SID, RH, PK);
        _fundAndApprove(controller, address(sys.hook), AMT);
    }

    function test_SettleHappyPath() public {
        _prep();
        vm.prank(controller);
        sys.hook.settle(agentId, payee, AMT, SID, true);
        assertEq(IERC20(address(sys.stablecoin)).balanceOf(payee), AMT);
        assertEq(sys.oracle.scoreOf(agentId), 540); // +40 receipted, on-time, volume bonus
    }

    function test_RevertWithoutReceipt() public {
        _fundAndApprove(controller, address(sys.hook), AMT);
        vm.prank(controller);
        vm.expectRevert(bytes("no receipt"));
        sys.hook.settle(agentId, payee, AMT, SID, true);
    }

    function test_RevertNotController() public {
        _prep();
        vm.prank(payee);
        vm.expectRevert(bytes("not controller"));
        sys.hook.settle(agentId, payee, AMT, SID, true);
    }

    function test_RevertAmountZero() public {
        _prep();
        vm.prank(controller);
        vm.expectRevert(bytes("amount=0"));
        sys.hook.settle(agentId, payee, 0, SID, true);
    }

    function test_RevertPayeeZero() public {
        _prep();
        vm.prank(controller);
        vm.expectRevert(bytes("payee=0"));
        sys.hook.settle(agentId, address(0), AMT, SID, true);
    }

    function test_ReportFailureByOwner() public {
        sys.hook.reportFailure(agentId, AMT); // owner == this test contract
        assertEq(sys.oracle.scoreOf(agentId), 460);
    }

    function test_RevertReportFailureNotOwner() public {
        vm.prank(payee);
        vm.expectRevert();
        sys.hook.reportFailure(agentId, AMT);
    }

    function test_ReportDisputeByOwner() public {
        sys.hook.reportDispute(agentId, true);
        assertEq(sys.oracle.scoreOf(agentId), 420);
    }
}

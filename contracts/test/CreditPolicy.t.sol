// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CreditPolicy} from "../src/CreditPolicy.sol";

contract CreditPolicyTest is Test {
    CreditPolicy internal policy;
    address internal owner = makeAddr("owner");
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        policy = new CreditPolicy(owner);
    }

    function _assertTerms(uint256 score, uint256 expectedLimit, uint16 expectedFee) internal view {
        (uint256 limit, uint16 fee) = policy.terms(score);
        assertEq(limit, expectedLimit, "limit");
        assertEq(fee, expectedFee, "fee");
    }

    function test_DefaultTierBoundaries() public view {
        _assertTerms(0, 0, 100);
        _assertTerms(199, 0, 100);
        _assertTerms(200, 1_000e6, 70);
        _assertTerms(499, 1_000e6, 70);
        _assertTerms(500, 10_000e6, 45);
        _assertTerms(799, 10_000e6, 45);
        _assertTerms(800, 50_000e6, 20);
        _assertTerms(1000, 50_000e6, 20);
    }

    function test_HigherScoreNeverWorseTerms() public view {
        // Monotonicity: limit non-decreasing and fee non-increasing as score rises.
        (uint256 prevLimit, uint16 prevFee) = policy.terms(0);
        for (uint256 s = 1; s <= 1000; s += 50) {
            (uint256 limit, uint16 fee) = policy.terms(s);
            assertGe(limit, prevLimit);
            assertLe(fee, prevFee);
            prevLimit = limit;
            prevFee = fee;
        }
    }

    function test_SetTiersByOwner() public {
        CreditPolicy.Tier[] memory t = new CreditPolicy.Tier[](2);
        t[0] = CreditPolicy.Tier({minScore: 0, creditLimit: 0, feeBps: 90});
        t[1] = CreditPolicy.Tier({minScore: 600, creditLimit: 5_000e6, feeBps: 30});
        vm.prank(owner);
        policy.setTiers(t);
        assertEq(policy.tierCount(), 2);
        _assertTerms(599, 0, 90);
        _assertTerms(600, 5_000e6, 30);
    }

    function test_RevertSetTiersByStranger() public {
        CreditPolicy.Tier[] memory t = new CreditPolicy.Tier[](1);
        t[0] = CreditPolicy.Tier({minScore: 0, creditLimit: 0, feeBps: 100});
        vm.prank(stranger);
        vm.expectRevert();
        policy.setTiers(t);
    }

    function test_RevertSetTiersBadInput() public {
        vm.startPrank(owner);

        CreditPolicy.Tier[] memory empty = new CreditPolicy.Tier[](0);
        vm.expectRevert(bytes("empty"));
        policy.setTiers(empty);

        CreditPolicy.Tier[] memory badFirst = new CreditPolicy.Tier[](1);
        badFirst[0] = CreditPolicy.Tier({minScore: 100, creditLimit: 0, feeBps: 100});
        vm.expectRevert(bytes("first minScore!=0"));
        policy.setTiers(badFirst);

        CreditPolicy.Tier[] memory unsorted = new CreditPolicy.Tier[](2);
        unsorted[0] = CreditPolicy.Tier({minScore: 0, creditLimit: 0, feeBps: 100});
        unsorted[1] = CreditPolicy.Tier({minScore: 0, creditLimit: 1, feeBps: 50});
        vm.expectRevert(bytes("unsorted"));
        policy.setTiers(unsorted);

        CreditPolicy.Tier[] memory badFee = new CreditPolicy.Tier[](1);
        badFee[0] = CreditPolicy.Tier({minScore: 0, creditLimit: 0, feeBps: 10_001});
        vm.expectRevert(bytes("fee>100%"));
        policy.setTiers(badFee);

        vm.stopPrank();
    }
}

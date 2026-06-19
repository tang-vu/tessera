// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry internal registry;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        registry = new AgentRegistry();
    }

    function test_RegisterAssignsIncrementalIds() public {
        uint256 id1 = registry.register(alice, "ipfs://a");
        uint256 id2 = registry.register(bob, "ipfs://b");
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(registry.agentCount(), 2);
        assertEq(registry.controllerOf(id1), alice);
        assertEq(registry.agentIdOf(bob), 2);
        assertEq(registry.metadataURI(id1), "ipfs://a");
        assertTrue(registry.exists(1));
        assertFalse(registry.exists(0));
        assertFalse(registry.exists(3));
    }

    function test_RevertOnZeroController() public {
        vm.expectRevert(bytes("controller=0"));
        registry.register(address(0), "x");
    }

    function test_RevertOnDuplicateController() public {
        registry.register(alice, "x");
        vm.expectRevert(bytes("controller registered"));
        registry.register(alice, "y");
    }

    function test_UpdateControllerByController() public {
        uint256 id = registry.register(alice, "x");
        vm.prank(alice);
        registry.updateController(id, bob);
        assertEq(registry.controllerOf(id), bob);
        assertEq(registry.agentIdOf(alice), 0);
        assertEq(registry.agentIdOf(bob), id);
    }

    function test_RevertUpdateControllerByStranger() public {
        uint256 id = registry.register(alice, "x");
        vm.prank(bob);
        vm.expectRevert(bytes("not controller"));
        registry.updateController(id, bob);
    }

    function test_UpdateMetadata() public {
        uint256 id = registry.register(alice, "x");
        vm.prank(alice);
        registry.updateMetadata(id, "ipfs://new");
        assertEq(registry.metadataURI(id), "ipfs://new");
    }
}

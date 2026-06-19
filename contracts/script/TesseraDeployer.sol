// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {ReceiptVerifier} from "../src/ReceiptVerifier.sol";
import {ReputationOracle} from "../src/ReputationOracle.sol";
import {CreditPolicy} from "../src/CreditPolicy.sol";
import {SettlementHook} from "../src/SettlementHook.sol";
import {CreditLine} from "../src/CreditLine.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

/// @title TesseraDeployer
/// @notice Shared deployment + wiring logic for the full Tessera system. Inherited by both the
///         deploy script and the test suite so production deploys and tests exercise identical wiring.
/// @dev `_deploy` must be invoked by `owner` (directly in tests, or via broadcast as the deployer EOA),
///      because authorizing recorders on the ReputationOracle is owner-gated.
abstract contract TesseraDeployer {
    struct System {
        MockUSDC mockUsdc; // address(0) when an external stablecoin is used
        IERC20 stablecoin;
        bool stablecoinIsMock;
        AgentRegistry registry;
        ReceiptVerifier verifier;
        ReputationOracle oracle;
        CreditPolicy policy;
        SettlementHook hook;
        CreditLine creditLine;
    }

    /// @param owner Admin/owner of the ownable contracts; also the caller wiring recorders.
    /// @param stablecoin_ External stablecoin address, or address(0) to deploy a testnet MockUSDC.
    function _deploy(address owner, address stablecoin_) internal returns (System memory s) {
        s.registry = new AgentRegistry();

        if (stablecoin_ == address(0)) {
            s.mockUsdc = new MockUSDC();
            s.stablecoin = IERC20(address(s.mockUsdc));
            s.stablecoinIsMock = true;
        } else {
            s.stablecoin = IERC20(stablecoin_);
            s.stablecoinIsMock = false;
        }

        s.verifier = new ReceiptVerifier(address(s.registry));
        s.oracle = new ReputationOracle(address(s.registry), owner);
        s.policy = new CreditPolicy(owner);
        s.hook =
            new SettlementHook(address(s.registry), address(s.verifier), address(s.oracle), address(s.stablecoin), owner);
        s.creditLine =
            new CreditLine(address(s.stablecoin), address(s.registry), address(s.oracle), address(s.policy), owner);

        // Authorize the settlement + credit contracts to record reputation events.
        s.oracle.setRecorder(address(s.hook), true);
        s.oracle.setRecorder(address(s.creditLine), true);
    }
}

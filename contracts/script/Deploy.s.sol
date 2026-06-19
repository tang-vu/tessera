// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {TesseraDeployer} from "./TesseraDeployer.sol";

/// @title Deploy
/// @notice Deploys the full Tessera system and writes addresses to `deployments/<chainId>.json`.
/// @dev Stablecoin selection:
///        - env `STABLECOIN_ADDRESS` set        → use it (any network).
///        - unset on mainnet (chainId 177)      → official HashKey USDC.
///        - unset otherwise (testnet/local)     → deploy a MockUSDC faucet token.
contract Deploy is Script, TesseraDeployer {
    /// @dev Official HashKey Chain mainnet USDC (see docs/ARCHITECTURE.md).
    address internal constant HASHKEY_MAINNET_USDC = 0x054ed45810DbBAb8B27668922D110669c9D88D0a;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address stablecoin = vm.envOr("STABLECOIN_ADDRESS", address(0));
        if (stablecoin == address(0) && block.chainid == 177) {
            stablecoin = HASHKEY_MAINNET_USDC;
        }

        vm.startBroadcast(pk);
        System memory s = _deploy(deployer, stablecoin);
        vm.stopBroadcast();

        _logSystem(deployer, s);
        _writeDeployment(s);
    }

    function _logSystem(address deployer, System memory s) internal pure {
        console2.log("Tessera deployed by:", deployer);
        console2.log("  AgentRegistry   :", address(s.registry));
        console2.log("  ReceiptVerifier :", address(s.verifier));
        console2.log("  ReputationOracle:", address(s.oracle));
        console2.log("  CreditPolicy    :", address(s.policy));
        console2.log("  SettlementHook  :", address(s.hook));
        console2.log("  CreditLine      :", address(s.creditLine));
        console2.log("  Stablecoin      :", address(s.stablecoin));
        console2.log("  Stablecoin mock?:", s.stablecoinIsMock);
    }

    function _writeDeployment(System memory s) internal {
        string memory key = "tessera";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "AgentRegistry", address(s.registry));
        vm.serializeAddress(key, "ReceiptVerifier", address(s.verifier));
        vm.serializeAddress(key, "ReputationOracle", address(s.oracle));
        vm.serializeAddress(key, "CreditPolicy", address(s.policy));
        vm.serializeAddress(key, "SettlementHook", address(s.hook));
        vm.serializeAddress(key, "CreditLine", address(s.creditLine));
        vm.serializeBool(key, "stablecoinIsMock", s.stablecoinIsMock);
        string memory json = vm.serializeAddress(key, "Stablecoin", address(s.stablecoin));

        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(json, path);
        console2.log("Wrote", path);
    }
}

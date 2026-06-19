// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TesseraDeployer} from "../../script/TesseraDeployer.sol";

/// @title TesseraTestBase
/// @notice Common setup + signing/funding helpers shared by the Tessera test suite. Deploys the full
///         system with the test contract as owner and a MockUSDC stablecoin.
abstract contract TesseraTestBase is Test, TesseraDeployer {
    System internal sys;

    function setUp() public virtual {
        sys = _deploy(address(this), address(0));
    }

    /// @dev Register an agent controlled by `vm.addr(pk)`.
    function _registerAgent(uint256 pk, string memory uri) internal returns (uint256 agentId, address controller) {
        controller = vm.addr(pk);
        agentId = sys.registry.register(controller, uri);
    }

    /// @dev EIP-191 (`personal_sign`) signature over `receiptHash` by `pk`.
    function _signReceipt(uint256 pk, bytes32 receiptHash) internal pure returns (bytes memory) {
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(receiptHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    /// @dev Sign + anchor a receipt for (agentId, settlementId).
    function _anchorReceipt(uint256 agentId, bytes32 settlementId, bytes32 receiptHash, uint256 pk) internal {
        sys.verifier.anchorReceipt(agentId, settlementId, receiptHash, _signReceipt(pk, receiptHash));
    }

    /// @dev Mint MockUSDC to `who` and approve `spender` for `amount`.
    function _fundAndApprove(address who, address spender, uint256 amount) internal {
        sys.mockUsdc.mint(who, amount);
        vm.prank(who);
        IERC20(address(sys.stablecoin)).approve(spender, amount);
    }
}

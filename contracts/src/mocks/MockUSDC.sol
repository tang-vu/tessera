// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice Testnet-only 6-decimal stablecoin with an open faucet mint. On mainnet, Tessera uses
///         the official HashKey Chain USDC (0x054ed45810DbBAb8B27668922D110669c9D88D0a) instead.
/// @dev Unrestricted `mint` is intentional for testnet seeding; NEVER deploy this to mainnet.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "mUSDC") {}

    /// @inheritdoc ERC20
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint `amount` base units to `to`. Open faucet — testnet only.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

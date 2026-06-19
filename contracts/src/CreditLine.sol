// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";
import {IReputationOracle} from "./interfaces/IReputationOracle.sol";
import {ICreditPolicy} from "./interfaces/ICreditPolicy.sol";

/// @title CreditLine
/// @notice Reputation-backed, under-collateralized stablecoin credit pool — the DeFi×AI crossover.
///         LPs deposit stablecoin and earn borrow fees; registered agents borrow up to the limit their
///         credit score unlocks (no collateral, backed only by reputation) and repay with a fee priced
///         by their tier. Defaults are written off as LP loss and slash the agent's score.
///
/// @dev Share accounting: shares track a pro-rata claim on `totalAssets() = cash + outstanding principal`.
///      Repaid fees stay as cash and lift `totalAssets`, so shares appreciate (LP yield). A default
///      reduces outstanding principal without returning cash, so `totalAssets` drops (LP loss).
contract CreditLine is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stablecoin;
    IAgentRegistry public immutable registry;
    IReputationOracle public immutable oracle;
    ICreditPolicy public immutable policy;

    uint256 public loanDuration = 7 days;

    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;

    /// @notice Total outstanding borrowed principal across all agents.
    uint256 public totalPrincipalOut;

    struct Loan {
        uint256 principal;
        uint256 feeOwed;
        uint64 dueDate;
        bool defaulted;
    }

    /// @notice agentId => active loan position.
    mapping(uint256 => Loan) public loans;

    event Deposit(address indexed lp, uint256 amount, uint256 shares);
    event Withdraw(address indexed lp, uint256 amount, uint256 shares);
    event Borrow(uint256 indexed agentId, uint256 amount, uint256 fee, uint64 dueDate);
    event Repay(uint256 indexed agentId, uint256 amount, uint256 principalLeft, uint256 feeLeft);
    event Defaulted(uint256 indexed agentId, uint256 principalLost);
    event LoanDurationSet(uint256 loanDuration);

    constructor(address stablecoin_, address registry_, address oracle_, address policy_, address owner_)
        Ownable(owner_)
    {
        require(
            stablecoin_ != address(0) && registry_ != address(0) && oracle_ != address(0) && policy_ != address(0),
            "zero addr"
        );
        stablecoin = IERC20(stablecoin_);
        registry = IAgentRegistry(registry_);
        oracle = IReputationOracle(oracle_);
        policy = ICreditPolicy(policy_);
    }

    /// @notice Idle stablecoin held by the pool (available to borrow / withdraw).
    function cash() public view returns (uint256) {
        return stablecoin.balanceOf(address(this));
    }

    /// @notice Total pool assets backing LP shares: idle cash + outstanding principal.
    function totalAssets() public view returns (uint256) {
        return cash() + totalPrincipalOut;
    }

    // ── Liquidity providers ───────────────────────────────────────────────────

    /// @notice Deposit `amount` stablecoin for pro-rata pool shares.
    function deposit(uint256 amount) external nonReentrant returns (uint256 shares) {
        require(amount > 0, "amount=0");
        uint256 ta = totalAssets();
        shares = (totalShares == 0 || ta == 0) ? amount : (amount * totalShares) / ta;
        require(shares > 0, "zero shares");
        totalShares += shares;
        sharesOf[msg.sender] += shares;
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount, shares);
    }

    /// @notice Redeem `shares` for the underlying stablecoin (requires available cash).
    function withdraw(uint256 shares) external nonReentrant returns (uint256 amount) {
        require(shares > 0 && shares <= sharesOf[msg.sender], "bad shares");
        amount = (shares * totalAssets()) / totalShares;
        require(cash() >= amount, "insufficient cash");
        totalShares -= shares;
        sharesOf[msg.sender] -= shares;
        stablecoin.safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount, shares);
    }

    // ── Agents ──────────────────────────────────────────────────────────────

    /// @notice Borrow `amount` against the caller-agent's reputation, up to its score-derived limit.
    function borrow(uint256 amount) external nonReentrant {
        require(amount > 0, "amount=0");
        uint256 agentId = registry.agentIdOf(msg.sender);
        require(agentId != 0, "not an agent");
        Loan storage l = loans[agentId];
        require(!l.defaulted, "in default");

        (uint256 limit, uint16 feeBps) = policy.terms(oracle.scoreOf(agentId));
        require(l.principal + amount <= limit, "exceeds limit");
        require(cash() >= amount, "insufficient liquidity");

        uint256 fee = (amount * feeBps) / 10_000;
        l.principal += amount;
        l.feeOwed += fee;
        l.dueDate = uint64(block.timestamp + loanDuration);
        totalPrincipalOut += amount;

        stablecoin.safeTransfer(msg.sender, amount);
        emit Borrow(agentId, amount, fee, l.dueDate);
    }

    /// @notice Repay up to the outstanding fee + principal for the caller-agent's loan.
    /// @dev Payment is applied to the fee first, then principal. Full repayment rewards reputation.
    function repay(uint256 amount) external nonReentrant {
        require(amount > 0, "amount=0");
        uint256 agentId = registry.agentIdOf(msg.sender);
        require(agentId != 0, "not an agent");
        Loan storage l = loans[agentId];
        uint256 owed = l.principal + l.feeOwed;
        require(owed > 0, "no debt");

        uint256 pay = amount > owed ? owed : amount;
        stablecoin.safeTransferFrom(msg.sender, address(this), pay);

        uint256 toFee = pay > l.feeOwed ? l.feeOwed : pay;
        l.feeOwed -= toFee;
        uint256 toPrincipal = pay - toFee;
        l.principal -= toPrincipal;
        totalPrincipalOut -= toPrincipal;

        bool cleared = (l.principal == 0 && l.feeOwed == 0);
        emit Repay(agentId, pay, l.principal, l.feeOwed);

        if (cleared) {
            bool onTime = block.timestamp <= l.dueDate;
            oracle.recordRepayment(agentId, pay, onTime);
        }
    }

    /// @notice Permissionlessly mark an overdue loan as defaulted: writes off principal (LP loss) and
    ///         slashes the agent's reputation.
    function markDefault(uint256 agentId) external nonReentrant {
        Loan storage l = loans[agentId];
        require(!l.defaulted, "already defaulted");
        require(l.principal + l.feeOwed > 0, "no debt");
        require(block.timestamp > l.dueDate, "not overdue");

        uint256 lost = l.principal;
        l.defaulted = true;
        totalPrincipalOut -= lost;
        l.principal = 0;
        l.feeOwed = 0;

        oracle.recordDefault(agentId);
        emit Defaulted(agentId, lost);
    }

    // ── Views / admin ─────────────────────────────────────────────────────────

    /// @notice Remaining borrowable headroom for `agentId` given its current score and open loan.
    function availableCredit(uint256 agentId) external view returns (uint256) {
        (uint256 limit,) = policy.terms(oracle.scoreOf(agentId));
        uint256 used = loans[agentId].principal;
        if (loans[agentId].defaulted || used >= limit) return 0;
        return limit - used;
    }

    /// @notice Set the loan duration used for new/extended borrows.
    function setLoanDuration(uint256 newDuration) external onlyOwner {
        require(newDuration > 0, "duration=0");
        loanDuration = newDuration;
        emit LoanDurationSet(newDuration);
    }
}

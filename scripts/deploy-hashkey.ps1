# Deploy Tessera to HashKey Chain. Reads secrets from ./.env.
#
#   powershell -File scripts/deploy-hashkey.ps1                    # testnet: deploy + seed demo agents
#   powershell -File scripts/deploy-hashkey.ps1 -Network mainnet   # mainnet: deploy only (uses official USDC)
#
# Prereqs: Foundry installed, `pnpm install` done, .env filled with a FUNDED burner DEPLOYER_PRIVATE_KEY.
param([ValidateSet("testnet", "mainnet")][string]$Network = "testnet")
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# --- Load .env into the process environment ---
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) { throw ".env not found. Run: copy .env.example .env  (then fill it in)." }
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim().Trim('"'))
    }
}

# --- Network config ---
if ($Network -eq "mainnet") {
    $chainId = "177"
    $rpc = if ($env:HSK_MAINNET_RPC) { $env:HSK_MAINNET_RPC } else { "https://mainnet.hsk.xyz" }
    $verifierUrl = "https://hashkey.blockscout.com/api"
}
else {
    $chainId = "133"
    $rpc = if ($env:HSK_TESTNET_RPC) { $env:HSK_TESTNET_RPC } else { "https://testnet.hsk.xyz" }
    $verifierUrl = "https://testnet-explorer.hsk.xyz/api"
}
$env:CHAIN_ID = $chainId
$env:RPC_URL = $rpc

$pk = $env:DEPLOYER_PRIVATE_KEY
if (-not $pk -or $pk -match '^0x0+$') { throw "DEPLOYER_PRIVATE_KEY missing/zero in .env — use a funded burner key." }

$env:PATH = "$env:USERPROFILE\.foundry\bin;$env:PATH"

# --- Balance check ---
$addr = (cast wallet address --private-key $pk).Trim()
$bal = (cast balance $addr --rpc-url $rpc).Trim()
Write-Host "Network : HashKey $Network (chainId $chainId)"
Write-Host "RPC     : $rpc"
Write-Host "Deployer: $addr"
Write-Host "Balance : $bal wei HSK"
if ($bal -eq "0") {
    if ($Network -eq "testnet") { throw "Deployer has 0 HSK. Get testnet HSK: https://faucet.hsk.xyz/faucet" }
    else { throw "Deployer has 0 HSK. Fund the burner with mainnet HSK first." }
}

# --- Build + deploy (verification is best-effort) ---
Push-Location contracts
forge build
try {
    forge script script/Deploy.s.sol --rpc-url $rpc --broadcast `
        --verify --verifier blockscout --verifier-url $verifierUrl
}
catch {
    Write-Warning "Deploy ran but verification may have failed: $($_.Exception.Message)"
    Write-Warning "If deployments/$chainId.json exists the deploy itself succeeded; verify later on the explorer."
}
Pop-Location

$deployFile = Join-Path $root "contracts/deployments/$chainId.json"
if (-not (Test-Path $deployFile)) { throw "Deploy failed — $deployFile was not written." }
Write-Host "Deployed addresses written to contracts/deployments/$chainId.json"

# --- Seed demo agents (testnet only; mainnet uses real USDC and has no faucet mint) ---
if ($Network -eq "testnet") {
    Write-Host "Seeding demo agents across all credit tiers..."
    pnpm --filter @tessera/agent simulate
}

Write-Host ""
Write-Host "Done. Start the dashboard with:"
Write-Host "  `$env:NEXT_PUBLIC_CHAIN_ID='$chainId'; `$env:NEXT_PUBLIC_RPC_URL='$rpc'; pnpm web:dev"

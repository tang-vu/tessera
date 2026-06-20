/**
 * GET /api/demo/deployment — serves the deployed contract addresses + flags to the browser.
 * Only exposes what the client wallet flow needs; no private keys are returned.
 */
import { NextResponse } from "next/server";
import { loadDeployment } from "@tessera/agent";
import { CHAIN_ID } from "@/lib/chain-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const d = loadDeployment(CHAIN_ID);
    // Whitelist only the fields the browser needs — never expose deployer keys
    return NextResponse.json({
      chainId: d.chainId,
      AgentRegistry: d.AgentRegistry,
      ReceiptVerifier: d.ReceiptVerifier,
      ReputationOracle: d.ReputationOracle,
      CreditPolicy: d.CreditPolicy,
      SettlementHook: d.SettlementHook,
      Stablecoin: d.Stablecoin,
      stablecoinIsMock: d.stablecoinIsMock,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[demo/deployment] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

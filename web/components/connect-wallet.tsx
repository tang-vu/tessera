"use client";

/**
 * ConnectWallet — nav-bar wallet button.
 * Shows "Connect Wallet" when disconnected; shortened address + disconnect when connected.
 * Styled to match the existing dark fintech nav-bar.
 */
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { shortAddress } from "@/lib/format-helpers";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {/* Connected address pill */}
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {shortAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-3 py-1.5 text-xs font-medium rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2/60 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className={[
        "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
        "border border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50",
        isPending ? "opacity-50 cursor-not-allowed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}

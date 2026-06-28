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
        <span className="hidden items-center gap-1.5 rounded-full border border-teal-400/25 bg-teal-500/10 px-2.5 py-1 font-mono text-xs font-medium text-teal-300 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          {shortAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
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
        "rounded-full border border-iris/30 bg-iris/10 px-3.5 py-1.5 text-sm font-medium text-iris transition-all hover:border-iris/50 hover:bg-iris/20",
        isPending ? "cursor-not-allowed opacity-50" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}

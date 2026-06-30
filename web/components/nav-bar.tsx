"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "./connect-wallet";

const NAV_LINKS = [
  { href: "/", label: "Agents" },
  { href: "/credit", label: "Credit Pool" },
  { href: "/scoring", label: "Scoring" },
  { href: "/demo", label: "Live Demo" },
];

/** Tessellated 4-tile mark — the brand's mosaic motif, with a drifting sheen. */
function TesseraLogo() {
  return (
    <span className="relative grid h-8 w-8 place-items-center rounded-[9px] bg-bg-2 ring-1 ring-hairline-strong">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="navlogo" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7c83ff" />
            <stop offset="0.55" stopColor="#a855f7" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="9" height="9" rx="2.5" fill="url(#navlogo)" />
        <rect x="13" y="2" width="9" height="9" rx="2.5" fill="url(#navlogo)" opacity="0.55" />
        <rect x="2" y="13" width="9" height="9" rx="2.5" fill="url(#navlogo)" opacity="0.55" />
        <rect x="13" y="13" width="9" height="9" rx="2.5" fill="url(#navlogo)" opacity="0.25" />
      </svg>
      <span className="pointer-events-none absolute -inset-2 rounded-full bg-iris/20 blur-xl opacity-60" />
    </span>
  );
}

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo + wordmark */}
        <Link href="/" className="group flex items-center gap-2.5">
          <TesseraLogo />
          <span className="font-display text-lg font-semibold tracking-tight text-text-primary transition-colors group-hover:text-gradient">
            Tessera
          </span>
          <span className="hidden rounded-full border border-iris/25 bg-iris/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-iris sm:inline-block">
            Testnet
          </span>
        </Link>

        {/* Nav links + wallet */}
        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-0.5 rounded-full border border-hairline bg-surface/60 p-1 backdrop-blur-md">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                    isActive
                      ? "text-text-primary"
                      : "text-text-secondary hover:text-text-primary",
                  ].join(" ")}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-gradient-to-r from-iris/20 to-cyan/15 ring-1 ring-iris/30" />
                  )}
                  <span className="relative inline-flex items-center">
                    {label}
                    {href === "/demo" && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-teal-400 pulse-ring" />
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-2 pl-2">
            <ConnectWallet />
          </div>
        </div>
      </div>
    </header>
  );
}

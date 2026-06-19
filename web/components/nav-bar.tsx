"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Agents" },
  { href: "/credit", label: "Credit Pool" },
  { href: "/demo", label: "Live Demo" },
];

function TesseraLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" rx="2" fill="#3b82f6" opacity="0.9" />
      <rect x="13" y="2" width="9" height="9" rx="2" fill="#3b82f6" opacity="0.5" />
      <rect x="2" y="13" width="9" height="9" rx="2" fill="#3b82f6" opacity="0.5" />
      <rect x="13" y="13" width="9" height="9" rx="2" fill="#3b82f6" opacity="0.2" />
    </svg>
  );
}

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <TesseraLogo />
          <span className="text-lg font-semibold tracking-tight text-text-primary group-hover:text-accent transition-colors">
            Tessera
          </span>
          <span className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest bg-accent/10 text-accent border border-accent/20">
            Testnet
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "text-text-primary bg-surface-2"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2/60",
                ].join(" ")}
              >
                {label}
                {href === "/demo" && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

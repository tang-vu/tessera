import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { Providers } from "./providers";

const SITE_DESCRIPTION =
  "Honest agents get cheaper capital. Dishonest ones get cut off. Tessera scores AI agent on-chain behavior into a 0–1000 credit rating powering an under-collateralized lending pool on HashKey Chain.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tessera-kohl-two.vercel.app"),
  title: "Tessera — On-Chain Credit Bureau for AI Agents",
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Tessera — On-Chain Credit Bureau for AI Agents",
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "Tessera",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tessera — On-Chain Credit Bureau for AI Agents",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-text-primary antialiased">
        <Providers>
          <NavBar />
          <main className="relative pt-16">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="relative mt-20 border-t border-hairline">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-text-muted sm:flex-row sm:px-6">
        <span className="font-display tracking-tight">
          Tessera · <span className="text-gradient font-semibold">credit for autonomous agents</span>
        </span>
        <span className="font-mono">
          HashKey Chain · mainnet 177 / testnet 133
        </span>
      </div>
    </footer>
  );
}

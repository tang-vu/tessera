import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Tessera — On-Chain Credit Bureau for AI Agents",
  description:
    "Honest agents get cheaper capital. Dishonest ones get cut off. Tessera scores AI agent on-chain behavior into a 0–1000 credit rating powering an under-collateralized lending pool on HashKey Chain.",
  icons: { icon: "/favicon.svg" },
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
          <main className="pt-16">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

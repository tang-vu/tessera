"use client";

/**
 * Client-side providers: WagmiProvider + TanStack QueryClientProvider.
 * Wraps the app shell so wallet hooks are available throughout the tree.
 */
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { wagmiConfig } from "@/lib/wagmi-config";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Instantiate QueryClient per-render on the client to avoid shared state
  // across requests in SSR (wagmi ssr:true handles hydration).
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

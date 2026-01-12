'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }));

  return (
    <SessionProvider
      // Refetch session every 4 minutes to proactively refresh tokens
      // This ensures the JWT callback runs periodically to check/refresh tokens
      refetchInterval={4 * 60}
      // Also refetch when window regains focus (user returns to tab)
      refetchOnWindowFocus={true}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
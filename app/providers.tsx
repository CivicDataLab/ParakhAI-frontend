'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import React, { useState } from "react";
import { Toaster } from "opub-ui";

// Import Tooltip dynamically to avoid TypeScript issues
const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  const [Tooltip, setTooltip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  React.useEffect(() => {
    const loadTooltip = async () => {
      try {
        const module = await import("opub-ui");
        if (module.Tooltip && typeof module.Tooltip.Provider === 'function') {
          setTooltip(() => module.Tooltip);
        }
      } catch (error) {
        console.warn("Failed to load Tooltip provider:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTooltip();
  }, []);
  
  if (isLoading) {
    return null;
  }
  
  if (!Tooltip || !Tooltip.Provider) {
    return <>{children}</>;
  }
  
  return <Tooltip.Provider>{children}</Tooltip.Provider>;
};

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
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster richColors position="bottom-right" />
      </QueryClientProvider>
    </SessionProvider>
  );
}
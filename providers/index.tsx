'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'opub-ui';
import { SessionProvider } from 'next-auth/react';
import React, { useState } from 'react';

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  const [Tooltip, setTooltip] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const loadTooltip = async () => {
      try {
        const module = await import('opub-ui');
        if (module.Tooltip && typeof module.Tooltip.Provider === 'function') {
          setTooltip(() => module.Tooltip);
        }
      } catch (error) {
        console.warn('Failed to load Tooltip provider:', error);
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
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster
          richColors
          closeButton
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: 'flex items-start gap-3 p-4 rounded-lg shadow-md font-sans',
              icon: 'shrink-0 self-start mt-[5px]',
              content: 'flex-1 min-w-0',
              title: 'font-semibold text-sm leading-snug',
              description: 'text-sm leading-snug mt-0.5',
              closeButton: 'left-auto right-0 top-3',
            },
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}

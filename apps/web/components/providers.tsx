'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as NextThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Toaster } from 'sonner';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipPrimitive.Provider delayDuration={250}>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </TooltipPrimitive.Provider>
      </QueryClientProvider>
    </NextThemeProvider>
  );
}

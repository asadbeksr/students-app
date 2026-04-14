'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';
import { Toaster } from 'sonner';
import { ApiProvider } from '@/contexts/ApiContext';
import { useState } from 'react';

const ThemeProvider = NextThemesProvider as React.ComponentType<React.PropsWithChildren<ThemeProviderProps>>;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 1,
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ApiProvider>
            {children}
            <Toaster position="bottom-right" richColors />
            {process.env.NODE_ENV !== 'production' && (
              <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
            )}
          </ApiProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

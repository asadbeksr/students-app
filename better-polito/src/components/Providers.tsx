'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
          </ApiProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

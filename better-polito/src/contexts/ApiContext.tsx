// Modified from polito/students-app — 2026-04-13
'use client';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { getApiClient } from '@/lib/api/client';

interface ApiContextProps {
  isLogged: boolean;
  token: string | undefined;
  username: string | undefined;
}

const ApiContext = createContext<ApiContextProps>({
  isLogged: false,
  token: undefined,
  username: undefined,
});

export const ApiProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const username = session?.user?.name ?? undefined;

  useEffect(() => {
    if (token) getApiClient(token);
  }, [token]);

  const signingOut = useRef(false);
  useEffect(() => {
    const handle = () => {
      if (signingOut.current) return;
      signingOut.current = true;
      signOut({ callbackUrl: '/login' });
    };
    window.addEventListener('polito-auth-expired', handle);
    return () => window.removeEventListener('polito-auth-expired', handle);
  }, []);

  return (
    <ApiContext.Provider value={{ isLogged: status === 'authenticated', token, username }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApiContext = () => useContext(ApiContext);

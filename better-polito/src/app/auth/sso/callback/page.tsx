'use client';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { SessionProvider } from 'next-auth/react';

function SSOCallback() {
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    const key = params.get('key');

    if (!uid || !key) {
      setError('Missing SSO parameters. Please try signing in again.');
      return;
    }

    signIn('credentials', {
      ssoUid: uid,
      ssoKey: key,
      redirect: false,
    }).then(result => {
      if (result?.error) {
        setError('SSO sign-in failed. Please try again.');
      } else {
        window.location.href = '/dashboard';
      }
    }).catch(() => {
      setError('Something went wrong. Please try again.');
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <a href="/login" className="text-sm text-muted-foreground underline">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}

export default function SSOCallbackPage() {
  return (
    <SessionProvider>
      <SSOCallback />
    </SessionProvider>
  );
}

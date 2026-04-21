'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { Suspense } from 'react';

function SSOCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const uid = searchParams.get('uid');
    const key = searchParams.get('key');

    if (!uid || !key) {
      setErrorMsg('Missing SSO parameters. Please try signing in again.');
      setStatus('error');
      return;
    }

    signIn('credentials', {
      ssoUid: uid,
      ssoKey: key,
      redirect: false,
    }).then(result => {
      if (result?.error) {
        setErrorMsg('SSO sign-in failed. Your session may have expired — please try again.');
        setStatus('error');
      } else {
        router.replace('/dashboard');
      }
    }).catch(() => {
      setErrorMsg('An unexpected error occurred.');
      setStatus('error');
    });
  }, [searchParams, router]);

  return (
    <div className="w-full max-w-sm bg-surface rounded-3xl p-8 shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(0,0,0,0.04)_0px_8px_24px] text-center">
      <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center mx-auto mb-6">
        <span className="text-surface text-sm font-bold">PCP</span>
      </div>

      {status === 'loading' ? (
        <>
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Completing sign in…</p>
        </>
      ) : (
        <>
          <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
          <a href="/login" className="text-sm underline text-[#555]">Back to sign in</a>
        </>
      )}
    </div>
  );
}

export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense fallback={<div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />}>
        <SSOCallbackContent />
      </Suspense>
    </div>
  );
}

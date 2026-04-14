'use client';
import { useState, useEffect } from 'react';
import { signIn, useSession, SessionProvider } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const { status } = useSession();
  const [showCredentials, setShowCredentials] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleSSO = () => {
    // Open PoliTO SSO — the callback URL is our /auth/sso/callback page
    const callbackUrl = `${window.location.origin}/auth/sso/callback`;
    const ssoUrl = `https://app.didattica.polito.it/auth/students/start?platform=web&redirect_uri=${encodeURIComponent(callbackUrl)}`;
    window.location.href = ssoUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError('Invalid credentials. Please check your username and password.');
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Disclaimer banner */}
        <div className="mb-6 rounded-2xl bg-surface-warm border border-border px-4 py-3 shadow-el-warm">
          <p className="text-xs text-muted-foreground leading-relaxed text-center">
            ⚠️ <strong className="text-text-muted">Unofficial tool.</strong>{' '}
            Not affiliated with Politecnico di Torino.{' '}
            For official access, visit{' '}
            <a href="https://polito.it" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-muted">
              polito.it
            </a>
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-3xl p-8 shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(0,0,0,0.04)_0px_8px_24px]">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0">
              <span className="text-surface text-sm font-bold">BP</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-none">Better Polito</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Community portal</p>
            </div>
          </div>

          <h2 className="text-3xl font-light text-foreground mb-1 leading-tight">Sign In</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Sign in with your PoliTO university account.
          </p>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Primary: SSO */}
          <Button
            type="button"
            className="w-full h-11 text-base flex items-center justify-center gap-2"
            onClick={handleSSO}
          >
            <ExternalLink className="w-4 h-4" />
            Sign in with PoliTO SSO
          </Button>

          <p className="mt-3 text-xs text-muted-foreground text-center">
            Redirects to the official university login page.
          </p>

          {/* Divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e5e5e5]" />
            <span className="text-xs text-[#aaa]">or</span>
            <div className="flex-1 h-px bg-[#e5e5e5]" />
          </div>

          {/* Secondary: credentials toggle */}
          <button
            type="button"
            onClick={() => setShowCredentials(v => !v)}
            className="mt-4 w-full flex items-center justify-between text-sm text-[#555] hover:text-foreground transition-colors px-1"
          >
            <span>Use username &amp; password</span>
            {showCredentials ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCredentials && (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="s123456"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                variant="outline"
                className="w-full h-11 text-base"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>

              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Your credentials are sent directly to the official PoliTO API and are never stored by Better Polito.
              </p>
            </form>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          Better Polito is based on{' '}
          <a href="https://github.com/polito/students-app" target="_blank" rel="noopener noreferrer" className="underline">
            polito/students-app
          </a>{' '}
          (EUPL v1.2)
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <SessionProvider>
      <LoginContent />
    </SessionProvider>
  );
}

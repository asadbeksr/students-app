'use client';
import { useState, useEffect } from 'react';
import { signIn, useSession, SessionProvider } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ExternalLink, BookOpen, Brain, Calendar, GraduationCap } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const { status } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/courses');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleSSO = () => {
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
        rememberMe: rememberMe ? 'true' : 'false',
        redirect: false,
      });
      if (result?.error) {
        setError('Incorrect username or password.');
      } else {
        window.location.href = '/courses';
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 flex-col p-12 relative overflow-hidden">
        {/* Subtle bg circles */}
        <div className="absolute top-0 right-0 w-[28rem] h-[28rem] rounded-full bg-white/5 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 -translate-x-1/2 translate-y-1/2 pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">PCP</span>
          </div>
          <span className="text-white text-base font-semibold">Polito Community Portal</span>
        </div>

        {/* Hero — centered in remaining space */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-[2.5rem] font-light text-white leading-tight mb-3">
            University life,<br />
            <span className="font-semibold">simplified.</span>
          </h1>
          <p className="text-white/50 text-sm mb-8 max-w-[260px]">
            Courses, grades, AI tools, and deadlines — one place.
          </p>
          <div className="space-y-3">
            {[
              { icon: BookOpen, label: 'Courses & materials' },
              { icon: Brain, label: 'AI study assistant' },
              { icon: Calendar, label: 'Deadlines & exams' },
              { icon: GraduationCap, label: 'Grades & transcript' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-white/60 text-sm">
                <Icon className="w-4 h-4 shrink-0 text-white/35" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-white/25">
          Unofficial. Not affiliated with Politecnico di Torino.{' '}
          <a href="https://polito.it" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/45 transition-colors">
            polito.it
          </a>
        </p>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center shrink-0">
              <span className="text-background text-sm font-bold">PCP</span>
            </div>
            <span className="text-foreground text-base font-semibold">Polito Community Portal</span>
          </div>

          <h2 className="text-2xl font-semibold text-foreground mb-1">Sign in</h2>
          <p className="text-sm text-muted-foreground mb-6">Use your PoliTO student account.</p>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-100 px-3.5 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="s123456"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer select-none">
                Remember me
              </Label>
            </div>

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button type="button" variant="outline" className="w-full h-10 gap-2" onClick={handleSSO}>
            <ExternalLink className="w-4 h-4" />
            Continue with PoliTO SSO
          </Button>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Credentials go directly to PoliTO — never stored here.
          </p>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Based on{' '}
            <a href="https://github.com/polito/students-app" target="_blank" rel="noopener noreferrer" className="underline">
              polito/students-app
            </a>{' '}
            (EUPL v1.2)
          </p>
        </div>
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

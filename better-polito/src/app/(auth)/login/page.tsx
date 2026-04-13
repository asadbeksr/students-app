'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Disclaimer banner */}
        <div className="mb-6 rounded-2xl bg-[#f5f2ef] border border-[#e5e5e5] px-4 py-3 shadow-[rgba(78,50,23,0.04)_0px_6px_16px]">
          <p className="text-xs text-[#777169] leading-relaxed text-center">
            ⚠️ <strong className="text-[#4e4e4e]">Unofficial tool.</strong>{' '}
            Not affiliated with Politecnico di Torino.{' '}
            For official access, visit{' '}
            <a href="https://polito.it" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#4e4e4e]">
              polito.it
            </a>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(0,0,0,0.04)_0px_8px_24px]">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">BP</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-black leading-none">Better Polito</h1>
              <p className="text-xs text-[#777169] mt-0.5">Community portal</p>
            </div>
          </div>

          <h2 className="text-3xl font-light text-black mb-1 leading-tight">Sign In</h2>
          <p className="text-sm text-[#777169] mb-8">
            Use your PoliTO student credentials.
          </p>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full h-11 text-base"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-xs text-[#777169] text-center leading-relaxed">
            Your credentials are sent directly to the official PoliTO API.
            They are never stored by Better Polito.
          </p>
        </div>

        <p className="mt-4 text-xs text-[#777169] text-center">
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

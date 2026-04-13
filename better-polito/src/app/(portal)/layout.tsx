'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { PomodoroPanel } from '@/components/toolkit/PomodoroTimer';
import { Scratchpad } from '@/components/toolkit/Scratchpad';
import { useToolkitStore } from '@/lib/stores/toolkitStore';
import { Focus } from 'lucide-react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { focusMode, toggleFocusMode } = useToolkitStore();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <CommandPalette />
      <PomodoroPanel />
      <Scratchpad />
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMobileMenuOpen={() => setMobileNavOpen(true)} />

        <main className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
        {/* <Footer /> */}
      </div>
    </div>
  );
}

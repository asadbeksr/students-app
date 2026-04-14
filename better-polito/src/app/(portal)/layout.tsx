'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { PomodoroPanel } from '@/components/toolkit/PomodoroTimer';
import { Scratchpad } from '@/components/toolkit/Scratchpad';
import { ToolkitDock } from '@/components/toolkit/ToolkitDock';
import { useToolkitStore } from '@/lib/stores/toolkitStore';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { focusMode } = useToolkitStore();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 left-0 right-0 h-[2px] overflow-hidden bg-border/30">
          <div
            className="h-full w-1/3 bg-primary/70 rounded-full"
            style={{ animation: 'loading-bar 1.2s ease-in-out infinite' }}
          />
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
      <ToolkitDock />
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {!focusMode.isActive && (
          <Topbar onMobileMenuOpen={() => setMobileNavOpen(true)} />
        )}

        <main className="relative flex-1 min-h-0 overflow-hidden px-4 pt-4 lg:px-6 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}

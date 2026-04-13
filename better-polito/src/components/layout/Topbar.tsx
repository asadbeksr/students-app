'use client';
import { useSession, signOut } from 'next-auth/react';
import { Moon, Sun, Menu, LogOut, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface TopbarProps {
  onMobileMenuOpen?: () => void;
}

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const username = session?.user?.name ?? '';
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#e5e5e5] shadow-[rgba(0,0,0,0.04)_0px_1px_0px]">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Mobile menu */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMobileMenuOpen}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Brand (mobile) */}
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <div className="w-6 h-6 rounded-md bg-black flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">BP</span>
          </div>
          <span className="text-sm font-semibold">Better Polito</span>
          <Badge variant="warm" className="text-[9px] px-1.5 py-0">unofficial</Badge>
        </Link>

        <div className="flex-1" />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-black/20 transition-all">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="text-xs">{initials || 'BP'}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[180px] rounded-xl bg-white border border-[#e5e5e5] shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(0,0,0,0.04)_0px_4px_16px] p-1 z-50"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-black">{username || 'Student'}</p>
              <p className="text-xs text-[#777169]">PoliTO Student</p>
            </div>
            <DropdownMenuSeparator className="h-px bg-[#e5e5e5] my-1" />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[#f5f5f5] cursor-pointer transition-colors">
                <User className="w-4 h-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="h-px bg-[#e5e5e5] my-1" />
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 text-red-600 cursor-pointer transition-colors"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

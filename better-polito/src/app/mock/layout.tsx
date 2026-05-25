import Link from 'next/link';
import Image from 'next/image';
import { MoodleThemeToggle } from '@/components/exam/MoodleThemeToggle';

export default function MockLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="moodle-app">
      <link rel="stylesheet" href="/moodle/runner.css" />
      <header className="moodle-navbar">
        <div className="moodle-navbar-inner">
          <Link href="/" className="moodle-brand" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Image
              src="/moodle/moodle-logo.svg"
              alt="Moodle Logo"
              width={120}
              height={35}
              priority
            />
            <span style={{
              position: 'absolute',
              top: '-6px',
              right: '-24px',
              backgroundColor: 'hsl(var(--primary))',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '2px 6px',
              borderRadius: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              pointerEvents: 'none'
            }}>
              Mock
            </span>
          </Link>
          <div className="moodle-nav-right">
            <MoodleThemeToggle />
            <div className="moodle-user-menu">
              <div className="user-avatar-container">
                <svg className="user-avatar-svg" viewBox="0 0 24 24" fill="#6c757d">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <span className="user-dropdown-arrow"></span>
            </div>
          </div>
        </div>
        <div className="moodle-navbar-orange" />
      </header>
      <main className="moodle-app-main">{children}</main>
    </div>
  );
}

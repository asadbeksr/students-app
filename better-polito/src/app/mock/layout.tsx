import Link from 'next/link';
import Image from 'next/image';

export default function MockLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="moodle-app">
      <link rel="stylesheet" href="/moodle/runner.css" />
      <header className="moodle-navbar">
        <div className="moodle-navbar-inner">
          <button className="moodle-sidebar-toggle" aria-label="Toggle sidebar">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
          <Link href="/" className="moodle-brand">
            <Image
              src="/moodle/polito_moodle.png"
              alt="Polito Moodle"
              width={140}
              height={35}
              priority
            />
          </Link>
          <nav className="moodle-nav-links">
            <Link href="/mock">Dashboard</Link>
            <Link href="/mock">My courses</Link>
          </nav>
          <div className="moodle-nav-right">
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

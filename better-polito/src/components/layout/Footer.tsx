export function Footer() {
  return (
    <footer className="border-t border-border bg-surface px-6 py-4 mt-auto">
      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Polito Community is an <strong>unofficial</strong> community portal — not affiliated with, endorsed by, or connected to Politecnico di Torino.{' '}
        Based on{' '}
        <a
          href="https://github.com/polito/students-app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-text-muted transition-colors"
        >
          polito/students-app
        </a>{' '}
        (EUPL v1.2).
      </p>
    </footer>
  );
}

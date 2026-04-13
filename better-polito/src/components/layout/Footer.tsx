export function Footer() {
  return (
    <footer className="border-t border-[#e5e5e5] bg-white px-6 py-4 mt-auto">
      <p className="text-xs text-[#777169] text-center leading-relaxed">
        Better Polito is an <strong>unofficial</strong> community portal — not affiliated with, endorsed by, or connected to Politecnico di Torino.{' '}
        Based on{' '}
        <a
          href="https://github.com/polito/students-app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[#4e4e4e] transition-colors"
        >
          polito/students-app
        </a>{' '}
        (EUPL v1.2).
      </p>
    </footer>
  );
}

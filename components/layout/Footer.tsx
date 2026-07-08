import Link from 'next/link';
import { Logo } from './Navbar';

const columns = [
  {
    title: 'Platform',
    links: [
      { label: 'Find a Consultant', href: '/explore' },
      { label: 'Discover Your Path', href: '/discover' },
      { label: 'Opportunities', href: '/dashboard#opportunities' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/#about' },
      { label: 'How it Works', href: '/#how-it-works' },
      { label: 'Join as a Consultant', href: '/explore#join' },
      { label: 'Contact', href: '#' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Career clarity for African students — vetted consultants, AI-guided discovery, and
              real opportunities.
            </p>
          </div>
          <div className="flex gap-16">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.8px] text-text-light">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-text-muted transition-colors hover:text-amber-dark"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 border-t pt-6">
          <p className="text-xs text-text-light">© 2026 Pathora. Built for Africa.</p>
        </div>
      </div>
    </footer>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const links = [
  { label: 'Explore', href: '/explore' },
  { label: 'Career Discovery', href: '/discover' },
  { label: 'Opportunities', href: '/dashboard#opportunities' },
];

export function Wordmark({
  size = 19,
  light = false,
  href = '/',
}: {
  size?: number;
  light?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      style={{ fontSize: size }}
      className={`font-bold tracking-[-0.02em] ${light ? 'text-white' : 'text-ink'}`}
    >
      Pathora
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 md:px-10">
        <div className="flex items-center gap-11">
          <Wordmark />
          <nav className="hidden items-center gap-7 text-sm font-medium lg:flex" aria-label="Main">
            {links.map((l) => {
              const active = pathname === l.href.split('#')[0];
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={`transition-colors ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-2.5 lg:flex">
          <Link
            href="/dashboard"
            className="px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/discover"
            className="rounded bg-ink-soft px-[18px] py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
          >
            Get started
          </Link>
        </div>

        <button
          className="text-ink lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="animate-fade-in border-t border-line bg-white px-5 pb-6 pt-4 lg:hidden">
          <nav className="flex flex-col gap-4" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-[15px] font-medium text-muted"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex gap-2.5">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex-1 rounded border border-line py-2.5 text-center text-sm font-medium text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/discover"
              onClick={() => setOpen(false)}
              className="flex-1 rounded bg-ink-soft py-2.5 text-center text-sm font-medium text-white"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

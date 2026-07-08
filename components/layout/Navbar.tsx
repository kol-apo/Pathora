'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const links = [
  { label: 'How it Works', href: '/#how-it-works' },
  { label: 'Find a Consultant', href: '/explore' },
  { label: 'Opportunities', href: '/dashboard#opportunities' },
  { label: 'About', href: '/#about' },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`font-fraunces text-2xl font-bold tracking-tight ${light ? 'text-white' : 'text-navy'}`}
    >
      Pathora<span className="text-amber">.</span>
    </Link>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-cream/85 backdrop-blur-md transition-shadow ${
        scrolled ? 'border-b' : ''
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 md:px-12">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-text-muted transition-colors hover:text-navy"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/dashboard"
            className="rounded-[10px] px-5 py-2.5 text-sm font-semibold text-text-main transition-colors hover:text-amber-dark"
          >
            Sign In
          </Link>
          <Link
            href="/discover"
            className="rounded-[10px] bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-navy-mid active:scale-[0.98]"
          >
            Get Started
          </Link>
        </div>

        <button
          className="text-navy lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="animate-fade-in border-t bg-cream px-5 pb-6 pt-4 lg:hidden">
          <nav className="flex flex-col gap-4" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-[15px] font-medium text-text-muted"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex gap-3">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-[10px] border py-2.5 text-center text-sm font-semibold text-text-main"
            >
              Sign In
            </Link>
            <Link
              href="/discover"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-[10px] bg-navy py-2.5 text-center text-sm font-semibold text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

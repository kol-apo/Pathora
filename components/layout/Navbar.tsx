'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ChevronDown, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';

/**
 * The public site's sections. Everything else (mentors, Pathy, opportunities,
 * sessions) lives in the signed-in app, reached from the sidebar.
 */
const links = [
  { label: 'How it works', href: '/#how-it-works', match: [] as string[] },
  { label: 'Sectors', href: '/#sectors', match: [] as string[] },
  { label: 'For mentors', href: '/#for-mentors', match: ['/become-a-mentor'] },
  { label: 'About', href: '/#about', match: [] as string[] },
];

/** True when the current page belongs to this link's section. */
function isActive(pathname: string, match: string[]) {
  return match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** The Pathora logo (mark + name). `size` is the rendered height in pixels. */
export function Wordmark({ size = 30, href = '/' }: { size?: number; href?: string }) {
  return (
    <Link href={href} aria-label="Pathora home" className="inline-flex shrink-0 items-center">
      <Image
        src="/logo.png"
        alt="Pathora"
        width={528}
        height={128}
        priority
        style={{ height: size, width: 'auto' }}
      />
    </Link>
  );
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i, all) => (i === 0 || i === all.length - 1 ? w[0] : ''))
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

/** The signed-in account: initials button that opens name, email and sign out. */
function AccountMenu({ name, email, home }: { name: string; email: string; home: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-sky-soft"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-soft text-[12px] font-semibold text-navy">
          {initialsOf(name)}
        </span>
        <ChevronDown size={15} className="text-muted" />
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-64 animate-fade-in rounded-xl border border-line bg-white p-2 shadow-raised"
        >
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="truncate text-[12.5px] text-muted">{email}</p>
          </div>
          <Link
            href={home}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-sky-soft"
          >
            <LayoutDashboard size={16} strokeWidth={1.5} className="text-muted" />
            Dashboard
          </Link>
          <button
            role="menuitem"
            onClick={() => signOut({ redirectTo: '/' })}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-ink hover:bg-sky-soft"
          >
            <LogOut size={16} strokeWidth={1.5} className="text-muted" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const user = session?.user;
  const home = user?.role === 'admin' ? '/admin' : user?.role === 'mentor' ? '/mentor' : '/dashboard';

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 md:px-10">
        <div className="flex h-full items-center gap-11">
          <Wordmark />
          <nav className="hidden h-full items-stretch gap-7 text-sm font-medium lg:flex" aria-label="Main">
            {links.map((l) => {
              const active = isActive(pathname, l.match);
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center border-b-2 pt-0.5 transition-colors ${
                    active
                      ? 'border-navy text-navy'
                      : 'border-transparent text-muted hover:border-sky hover:text-ink'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden min-w-[200px] items-center justify-end gap-2.5 lg:flex">
          {status === 'loading' ? null : user ? (
            <>
              <Link
                href={home}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-navy"
              >
                <LayoutDashboard size={16} strokeWidth={1.5} />
                Dashboard
              </Link>
              <AccountMenu name={user.name ?? 'Your account'} email={user.email ?? ''} home={home} />
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-navy"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded bg-navy px-[18px] py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
              >
                Get started
              </Link>
            </>
          )}
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
        <div className="animate-fade-in border-t border-line bg-white px-5 pb-6 pt-3 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {links.map((l) => {
              const active = isActive(pathname, l.match);
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`border-l-2 py-2.5 pl-3 text-[15px] font-medium ${
                    active ? 'border-navy bg-sky-soft text-navy' : 'border-transparent text-muted'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          {user ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-[12.5px] text-muted">{user.email}</p>
              <div className="mt-4 flex gap-2.5">
                <Link
                  href={home}
                  onClick={() => setOpen(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded bg-navy py-2.5 text-sm font-medium text-white"
                >
                  <LayoutDashboard size={16} strokeWidth={1.5} />
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut({ redirectTo: '/' })}
                  className="flex flex-1 items-center justify-center gap-2 rounded border border-line py-2.5 text-sm font-medium text-ink"
                >
                  <LogOut size={16} strokeWidth={1.5} />
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex gap-2.5">
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="flex flex-1 items-center justify-center rounded border border-line py-2.5 text-sm font-medium text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex-1 rounded bg-navy py-2.5 text-center text-sm font-medium text-white"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

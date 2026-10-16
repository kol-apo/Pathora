'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Clock,
  Link2,
  Compass,
  LayoutDashboard,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { Wordmark } from './Navbar';

export type SidebarVariant = 'student' | 'mentor' | 'admin';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Highlight only on this exact path (section home pages). */
  exact?: boolean;
}

const NAV: Record<SidebarVariant, NavItem[]> = {
  student: [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'Consultants', href: '/explore', icon: Users },
    { label: 'Career path', href: '/discover', icon: Compass },
    { label: 'Opportunities', href: '/dashboard#opportunities', icon: Briefcase },
    { label: 'Sessions', href: '/session/1', icon: CalendarDays },
  ],
  mentor: [
    { label: 'Sessions', href: '/mentor', icon: CalendarDays, exact: true },
    { label: 'Availability', href: '/mentor/availability', icon: Clock },
    { label: 'Profile links', href: '/mentor/profile', icon: Link2 },
  ],
  admin: [
    { label: 'Overview', href: '/admin', icon: BarChart3, exact: true },
    { label: 'Mentors', href: '/admin/mentors', icon: UserCheck },
  ],
};

const CONSOLE_LABEL: Record<SidebarVariant, string | null> = {
  student: null,
  mentor: 'Mentor',
  admin: 'Admin',
};

/** In-page anchors (Opportunities) are never "the page". */
function isActive(pathname: string, item: NavItem) {
  if (item.href.includes('#')) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function Sidebar({ variant = 'student' }: { variant?: SidebarVariant }) {
  const items = NAV[variant];
  const consoleLabel = CONSOLE_LABEL[variant];
  const { data: session } = useSession();
  const pathname = usePathname();
  // Nothing until the session loads: never show anyone else's details.
  const name = session?.user?.name ?? '';
  const detail = session?.user?.email ?? '';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i, all) => (i === 0 || i === all.length - 1 ? w[0] : ''))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-surface px-[18px] py-[26px] lg:flex">
        <div className="flex flex-col items-start gap-3 px-2.5">
          <Wordmark size={28} href="/" />
          {consoleLabel && (
            <span className="inline-block rounded-full bg-navy px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
              {consoleLabel}
            </span>
          )}
        </div>

        <nav className="mt-[26px] flex flex-col gap-0.5" aria-label="Dashboard">
          {items.map(({ label, href, icon: Icon, exact }) => {
            const active = isActive(pathname, { label, href, icon: Icon, exact });
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-[11px] rounded p-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-sky-soft font-medium text-navy'
                    : 'text-muted hover:bg-sky-soft/60 hover:text-navy'
                }`}
              >
                <Icon size={17} strokeWidth={1.5} className={active ? 'text-navy' : 'text-faint'} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div
          className={`mt-auto flex items-center gap-[11px] border-t border-line px-2.5 pb-2.5 pt-[18px] transition-opacity ${
            session ? 'opacity-100' : 'invisible opacity-0'
          }`}
        >
          <Avatar initials={initials} size="xs" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-medium text-ink">{name}</span>
            <span className="truncate text-[11.5px] text-faint">{detail}</span>
          </div>
          {session && (
            <button
              onClick={() => signOut({ redirectTo: '/' })}
              aria-label="Sign out"
              title="Sign out"
              className="shrink-0 rounded p-1.5 text-faint transition-colors hover:bg-sky-soft hover:text-navy"
            >
              <LogOut size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-white py-2 lg:hidden"
        aria-label="Dashboard mobile"
      >
        {items.map(({ label, href, icon: Icon, exact }) => {
          const active = isActive(pathname, { label, href, icon: Icon, exact });
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium ${
                active ? 'text-navy' : 'text-faint'
              }`}
            >
              <Icon size={19} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

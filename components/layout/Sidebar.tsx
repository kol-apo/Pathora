'use client';

import Link from 'next/link';
import {
  Briefcase,
  CalendarDays,
  Compass,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { currentStudent } from '@/lib/data';
import { Wordmark } from './Navbar';

const items = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, active: true },
  { label: 'Consultants', href: '/explore', icon: Users },
  { label: 'Career path', href: '/discover', icon: Compass },
  { label: 'Opportunities', href: '/dashboard#opportunities', icon: Briefcase },
  { label: 'Sessions', href: '/session/1', icon: CalendarDays },
];

export default function Sidebar() {
  const student = currentStudent;

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-surface px-[18px] py-[26px] lg:flex">
        <div className="px-2.5">
          <Wordmark size={18} />
        </div>

        <nav className="mt-[26px] flex flex-col gap-0.5" aria-label="Dashboard">
          {items.map(({ label, href, icon: Icon, active }) => (
            <Link
              key={label}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-[11px] rounded p-2.5 text-sm transition-colors ${
                active
                  ? 'bg-fill font-medium text-ink'
                  : 'text-muted hover:bg-fill/60 hover:text-ink'
              }`}
            >
              <Icon size={17} strokeWidth={1.5} className={active ? 'text-ink' : 'text-faint'} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-[11px] border-t border-line px-2.5 pb-2.5 pt-[18px]">
          <Avatar initials={student.initials} size="xs" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium text-ink">{student.name}</span>
            <span className="truncate text-[11.5px] text-faint">{student.university}</span>
          </div>
        </div>
      </aside>

      {/* Mobile tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-white py-2 lg:hidden"
        aria-label="Dashboard mobile"
      >
        {items.map(({ label, href, icon: Icon, active }) => (
          <Link
            key={label}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium ${
              active ? 'text-ink' : 'text-faint'
            }`}
          >
            <Icon size={19} strokeWidth={1.5} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}

'use client';

import Link from 'next/link';
import {
  Briefcase,
  CalendarDays,
  Compass,
  Home,
  LogOut,
  Search,
  User,
} from 'lucide-react';
import { Logo } from './Navbar';

const items = [
  { label: 'Home', href: '/dashboard', icon: Home, active: true },
  { label: 'Find a Consultant', href: '/explore', icon: Search },
  { label: 'Discover My Path', href: '/discover', icon: Compass },
  { label: 'Opportunities', href: '/dashboard#opportunities', icon: Briefcase },
  { label: 'My Sessions', href: '/session/1', icon: CalendarDays },
  { label: 'Profile', href: '#', icon: User },
];

export default function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-white lg:flex">
        <div className="px-6 py-6">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Dashboard">
          {items.map(({ label, href, icon: Icon, active }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-l-[3px] border-amber bg-amber-light/60 text-amber-dark'
                  : 'text-text-muted hover:bg-warm-gray hover:text-text-main'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t px-3 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-white py-2 lg:hidden"
        aria-label="Dashboard mobile"
      >
        {items.slice(0, 5).map(({ label, href, icon: Icon, active }) => (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium ${
              active ? 'text-amber-dark' : 'text-text-muted'
            }`}
          >
            <Icon size={20} />
            {label.split(' ')[0]}
          </Link>
        ))}
      </nav>
    </>
  );
}

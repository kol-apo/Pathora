import Link from 'next/link';
import { Wordmark } from './Navbar';

const links = [
  { label: 'About', href: '/#about' },
  { label: 'For consultants', href: '/explore#join' },
  { label: 'Opportunities', href: '/dashboard#opportunities' },
  { label: 'Contact', href: '#' },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-9 md:flex-row md:items-center md:justify-between md:px-10">
        <Wordmark size={15} />
        <div className="flex flex-wrap gap-x-[26px] gap-y-3 text-[13.5px] text-muted">
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="transition-colors hover:text-ink">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

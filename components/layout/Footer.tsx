import Image from 'next/image';
import Link from 'next/link';
import { PARTNERS } from '@/lib/partners';
import { Wordmark } from './Navbar';

const links = [
  { label: 'About', href: '/#about' },
  { label: 'For mentors', href: '/become-a-mentor' },
  { label: 'Opportunities', href: '/dashboard#opportunities' },
  { label: 'Contact', href: '#' },
];

const partners = Object.values(PARTNERS);

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-9 md:flex-row md:items-end md:justify-between md:px-10">
        <div className="flex flex-col gap-4">
          <Wordmark size={24} />
          {partners.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-muted">
              <span>In partnership with</span>
              {partners.map((p) => (
                <span key={p.name} className="inline-flex items-center gap-1.5 font-medium text-ink">
                  <Image src={p.logo} alt="" width={22} height={22} unoptimized className="h-[22px] w-[22px]" />
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>
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

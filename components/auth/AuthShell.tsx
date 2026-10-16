import Link from 'next/link';
import { Check } from 'lucide-react';
import { Wordmark } from '@/components/layout/Navbar';
import Guide from '@/components/brand/Guide';

/**
 * The frame for sign-in, sign-up and consent: the brand on the left (hidden
 * on phones), the form on the right.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-sky-soft px-12 py-10 lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(29,63,90,0.09)_1px,transparent_1px)] [background-size:22px_22px]"
          aria-hidden="true"
        />
        <svg
          viewBox="0 0 600 700"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path
            d="M40 700 C 160 620, 220 520, 300 430 S 470 220, 580 60"
            fill="none"
            stroke="#96CAD3"
            strokeOpacity={0.6}
            strokeWidth={40}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="relative">
          <Wordmark size={30} />
        </div>

        <div className="relative mt-auto max-w-md">
          <Guide size={96} />
          <h2 className="mt-8 text-[34px] font-bold leading-[1.1] tracking-[-0.03em] text-ink">
            Your career path starts here, not after.
          </h2>
          <ul className="mt-6 space-y-3">
            {[
              'Free video sessions with vetted professionals',
              'A career direction built for the African job market',
              'Your answers stay private',
            ].map((point) => (
              <li key={point} className="flex items-center gap-3 text-[15px] text-ink">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                  <Check size={13} strokeWidth={2.5} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col px-5 py-8 md:px-12">
        <div className="lg:hidden">
          <Wordmark size={28} />
        </div>
        <div className="mx-auto my-auto w-full max-w-[400px] py-10">
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
        </div>
        <p className="text-center text-[12.5px] text-faint">
          <Link href="/" className="hover:text-navy">
            Back to Pathora
          </Link>
        </p>
      </main>
    </div>
  );
}

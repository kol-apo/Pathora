import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { PRIVACY_IS_DRAFT, PRIVACY_SECTIONS, PRIVACY_UPDATED, privacyContact } from '@/lib/research/privacy';

export const metadata = {
  title: 'Privacy · Pathora',
  description: 'What Pathora collects, why, who processes it, how long it is kept, and how to withdraw.',
};
export const dynamic = 'force-dynamic';

/** The privacy policy. Public: anyone can read it before signing up. */
export default function PrivacyPage() {
  const contact = privacyContact();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[760px] px-5 py-12 md:px-10 md:py-16">
        <p className="flex items-center gap-2.5 text-micro font-semibold uppercase text-navy">
          <span className="h-[3px] w-6 rounded-full bg-sky" aria-hidden="true" />
          Privacy
        </p>
        <h1 className="mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-ink md:text-[40px]">
          How Pathora uses your information
        </h1>
        <p className="mt-3 text-[14px] text-muted">Last updated {PRIVACY_UPDATED}</p>
        {PRIVACY_IS_DRAFT && (
          <p className="mt-5 rounded-md bg-sky-soft px-4 py-3 text-[13px] leading-relaxed text-navy">
            Draft: this page will be replaced by the wording approved in the study’s ethics application. It already
            describes what Pathora does today.
          </p>
        )}

        <nav aria-label="On this page" className="mt-8 rounded-xl border border-line p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">On this page</p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-2">
            {PRIVACY_SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-ink underline-offset-2 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
            <li>
              <a href="#contact" className="text-ink underline-offset-2 hover:underline">
                Contact
              </a>
            </li>
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {PRIVACY_SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">{s.title}</h2>
              {s.intro && <p className="mt-3 text-[15px] leading-relaxed text-ink">{s.intro}</p>}
              {s.points && (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink marker:text-navy">
                  {s.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              {s.table && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[560px] text-left text-[14px]">
                    <thead className="border-b border-line bg-surface">
                      <tr>
                        {s.table.head.map((h) => (
                          <th key={h} className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {s.table.rows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell, i) => (
                            <td key={i} className={`px-4 py-3 align-top leading-relaxed ${i === 0 ? 'font-medium text-ink' : 'text-ink'}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}

          <section id="contact" className="scroll-mt-24">
            <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">Contact</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink">
              To withdraw or delete your account, use your{' '}
              <Link href="/account" className="font-medium text-navy underline underline-offset-2">
                Account page
              </Link>
              .{' '}
              {contact ? (
                <>
                  For any other question about your information, email the study team at{' '}
                  <a href={`mailto:${contact}`} className="font-medium text-navy underline underline-offset-2">
                    {contact}
                  </a>
                  .
                </>
              ) : (
                <>For any other question about your information, contact the Pathora study team.</>
              )}
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

/**
 * Organisations whose mentors are listed on Pathora. A mentor's `source` says
 * where they came from; 'pathora' is someone who applied here directly.
 *
 * Shared by the database model, the import script and the UI, so the label a
 * student sees always matches what is stored.
 */

export const MENTOR_SOURCES = ['pathora', 'jointhub'] as const;
export type MentorSource = (typeof MENTOR_SOURCES)[number];

export interface Partner {
  /** Shown on cards and profiles. */
  name: string;
  /** One line explaining the mark, for the profile page and tooltips. */
  description: string;
  /** Square logo in /public/partners, shown in the footer. */
  logo: string;
}

export const PARTNERS: Record<Exclude<MentorSource, 'pathora'>, Partner> = {
  jointhub: {
    name: 'JointHub',
    description: 'Vetted by our partner JointHub, then approved by the Pathora team.',
    logo: '/partners/jointhub.png',
  },
};

/** The partner behind a mentor, or null for one who applied to Pathora directly. */
export function partnerFor(source: MentorSource | undefined | null): Partner | null {
  return source && source !== 'pathora' ? PARTNERS[source] : null;
}

/**
 * Partner mentors are listed before they have signed in to Pathora, so their
 * account holds a placeholder address on a reserved domain that can never
 * receive mail (.invalid, RFC 2606). It is replaced with their real address
 * when they claim the account.
 */
export const PLACEHOLDER_EMAIL_DOMAIN = 'partners.pathora.invalid';

export const isPlaceholderEmail = (email: string | null | undefined): boolean =>
  !!email && email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);

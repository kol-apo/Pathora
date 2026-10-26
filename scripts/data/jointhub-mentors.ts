import type { Sector } from '../../lib/types';

/**
 * Mentors listed from JointHub's mentor directory, as JointHub publishes them:
 * name, role, country and focus. Nothing here is invented. Employer and years
 * of experience are left out because the directory does not give them, and
 * the bio says only what the directory says.
 *
 * Two fields are Pathora's judgement and should be checked:
 *   - `sector`: Pathora has four sectors and several of these roles sit
 *     between them (see the notes).
 *   - `vector`: a provisional interest profile, read from the role and focus.
 *     Adjust it in the admin console (Mentors → Approved).
 *
 * Imported with `npm run import-jointhub`. Nobody here can be booked until
 * their weekly hours are added, so no session is ever offered at a time the
 * mentor has not chosen.
 */
export interface PartnerMentor {
  name: string;
  role: string;
  country: string;
  timezone: string;
  sector: Sector;
  /** The directory's focus line, split into its parts. */
  focus: [string, string, string];
  /** File in /public/mentors. */
  photo: string;
  /** Provisional: technical, analytical, commercial, creative, people. */
  vector: [number, number, number, number, number];
  /** Why the sector was chosen, where it was not obvious. */
  note?: string;
}

const ZONE = {
  Rwanda: 'Africa/Kigali',
  Nigeria: 'Africa/Lagos',
  'South Africa': 'Africa/Johannesburg',
  Zimbabwe: 'Africa/Harare',
} as const;

export const JOINTHUB_MENTORS: PartnerMentor[] = [
  {
    name: 'Jane Obel',
    role: 'Product leader',
    country: 'Rwanda',
    timezone: ZONE.Rwanda,
    sector: 'Technology',
    focus: ['Design strategy', 'Research craft', 'Confident portfolios'],
    photo: '/mentors/jane-obed.webp',
    vector: [0.6, 0.5, 0.45, 0.65, 0.55],
    note: 'Product leadership with a design focus; Creative would also fit.',
  },
  {
    name: 'Edafe Akpovwa',
    role: 'Engineering mentor',
    country: 'Rwanda',
    timezone: ZONE.Rwanda,
    sector: 'Technology',
    focus: ['Technical career choices', 'Prototypes', 'Practical problem-solving'],
    photo: '/mentors/edafe-akpovwa.webp',
    vector: [0.92, 0.55, 0.2, 0.25, 0.4],
  },
  {
    name: 'Botlhale Mdhluli',
    role: 'Career strategist',
    country: 'South Africa',
    timezone: ZONE['South Africa'],
    sector: 'Entrepreneurship',
    focus: ['Career narratives', 'Pivots', 'Networking with purpose'],
    photo: '/mentors/bothlale-mdluli.webp',
    vector: [0.2, 0.3, 0.55, 0.45, 0.9],
    note: 'Career strategy does not belong to one sector; placed with the people-and-business mentors.',
  },
  {
    name: 'Ololade Oloniyo',
    role: 'Creative director',
    country: 'Nigeria',
    timezone: ZONE.Nigeria,
    sector: 'Creative',
    focus: ['Emerging creators', 'Visual strategy', 'Distinctive brand identity'],
    photo: '/mentors/ololade-oloniyo.webp',
    vector: [0.2, 0.2, 0.55, 0.95, 0.4],
  },
  {
    name: 'Isaiah Kporon',
    role: 'Executive coach',
    country: 'Rwanda',
    timezone: ZONE.Rwanda,
    sector: 'Entrepreneurship',
    focus: ['Leadership acceleration', 'Strategic thinking', 'Executive presence'],
    photo: '/mentors/isaiah-kporon.webp',
    vector: [0.2, 0.45, 0.75, 0.15, 0.85],
    note: 'Leadership coaching; placed with Entrepreneurship.',
  },
  {
    name: 'Chengetai Chikadaya',
    role: 'Academic coach',
    country: 'Zimbabwe',
    timezone: ZONE.Zimbabwe,
    sector: 'Technology',
    focus: ['Scholarly research', 'Academic publishing', 'Confident pathways'],
    photo: '/mentors/chengetai-chikadaya.webp',
    vector: [0.55, 0.8, 0.1, 0.4, 0.7],
    note: 'Academic research fits none of the four sectors well; placed with Technology, where research-minded students land.',
  },
  {
    name: 'Michael Adeniyi',
    role: 'Entrepreneurship mentor',
    country: 'Nigeria',
    timezone: ZONE.Nigeria,
    sector: 'Entrepreneurship',
    focus: ['Idea validation', 'Fundraising', 'Building resilient startups'],
    photo: '/mentors/michael-adeniyi.webp',
    vector: [0.35, 0.4, 0.95, 0.25, 0.4],
  },
  {
    name: 'Blessing Matiro',
    role: 'Data science mentor',
    country: 'South Africa',
    timezone: ZONE['South Africa'],
    sector: 'Technology',
    focus: ['Analytical skills', 'Research publishing', 'Meaningful technical roles'],
    photo: '/mentors/blessing-matiro.webp',
    vector: [0.85, 0.88, 0.2, 0.15, 0.4],
  },
  {
    name: 'Stephen David',
    role: 'Community builder',
    country: 'Rwanda',
    timezone: ZONE.Rwanda,
    sector: 'Entrepreneurship',
    focus: ['Social impact initiatives', 'Network building', 'Community engagement'],
    photo: '/mentors/stephen-david.webp',
    vector: [0.15, 0.3, 0.6, 0.3, 0.92],
    note: 'Social impact and community building; placed with Entrepreneurship.',
  },
];

/** "Design strategy, research craft, and confident portfolios." from the three parts. */
export function focusSentence(focus: readonly string[]): string {
  const [first, ...rest] = focus.map((f, i) => (i === 0 ? f : f.charAt(0).toLowerCase() + f.slice(1)));
  return `${[first, ...rest.slice(0, -1)].join(', ')}, and ${rest[rest.length - 1]}`;
}

/** A bio built only from the directory entry. No pronouns: none are given. */
export function bioFor(m: PartnerMentor): string {
  const article = /^[aeiou]/i.test(m.role) ? 'An' : 'A';
  return `${article} ${m.role.toLowerCase()} based in ${m.country}, mentoring students through JointHub. Focus: ${focusSentence(m.focus).charAt(0).toLowerCase()}${focusSentence(m.focus).slice(1)}.`;
}

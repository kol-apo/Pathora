/**
 * The privacy policy shown at /privacy.
 *
 * DRAFT, like the consent text (lib/research/consent.ts): replace it with the
 * wording approved in the ethics application, then set PRIVACY_IS_DRAFT to
 * false. Every statement here describes what the system actually does today;
 * if the code changes what is collected or who processes it, change this too.
 *
 * The contact address comes from PRIVACY_CONTACT_EMAIL, so no personal address
 * is written into the code. Without it, people are pointed to the Account page.
 */

export const PRIVACY_IS_DRAFT = true;
export const PRIVACY_UPDATED = '20 November 2026';

export const privacyContact = () => process.env.PRIVACY_CONTACT_EMAIL?.trim() || null;

export interface PrivacySection {
  id: string;
  title: string;
  intro?: string;
  points?: string[];
  table?: { head: string[]; rows: string[][] };
}

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'who',
    title: 'Who runs Pathora',
    intro:
      'Pathora is a career-readiness platform for African university students, and the research instrument for a capstone study at African Leadership University (ALU). It is run by the researcher leading that study. "We" on this page means the Pathora study team.',
  },
  {
    id: 'collect',
    title: 'What we collect',
    points: [
      'Your account: your name, email address and a password, which is stored only as a secure hash, never as the password itself. If you choose "Continue with Google", we receive your name and email from Google.',
      'Students: your agreement to the research consent (the version and the time), a participant code, your answers to Pathy’s six questions and the career result made from them, the mentors matched to you, the sessions you book (time, topic and status), and any ratings and comments you leave after a session.',
      'Mentors: your application and public profile (role, employer, sector, country, bio, links), your profile photo if you add one, your available hours and timezone, the sessions booked with you, and whether each one took place.',
      'Video sessions: when each person joined and how long the call lasted. Calls are never recorded, and nothing said in a call is stored.',
      'Research events: actions such as "finished career discovery" or "booked a session", recorded under your participant code only, never your name, email or any account id.',
      'When you book, your browser’s timezone, so emails can show session times in your own time.',
    ],
  },
  {
    id: 'not',
    title: 'What we do not collect or do',
    points: [
      'Your conversations with Pathy are not stored by Pathora. Your browser keeps them for 24 hours after your last message so you can pick up where you left off, then removes them.',
      'Video sessions are never recorded.',
      'We use no advertising, no tracking or analytics services, and we never sell or rent your information.',
    ],
  },
  {
    id: 'why',
    title: 'Why we use it',
    points: [
      'To run Pathora: your account, matching you to mentors, booking and holding sessions, and sending the emails those need.',
      'For the research study, which you agreed to when you consented. The research is analysed by participant code, so it cannot identify you.',
      'To keep Pathora secure: for example, limiting password-reset requests and checking who may see each record.',
    ],
  },
  {
    id: 'who-sees',
    title: 'Who can see what',
    points: [
      'Your questionnaire answers: only you. Mentors never see them.',
      'Mentors see a student’s first name, the session time and the topic the student wrote, for sessions booked with them.',
      'Students see mentors’ public profiles and photos.',
      'Comments left after a session are read only by the Pathora team, never by the mentor. Star ratings count towards the mentor’s public average.',
      'The study views in the admin console show students by participant code, not name or email. As the system’s administrator, the researcher can access the database to run and support Pathora.',
    ],
  },
  {
    id: 'processors',
    title: 'Services that process data for us',
    intro: 'Pathora uses these services to run. Each receives only what it needs:',
    table: {
      head: ['Service', 'What for', 'What it receives'],
      rows: [
        ['MongoDB Atlas', 'The database', 'Everything Pathora stores, described above'],
        ['Vercel', 'Hosting the website', 'Each request to the site, and short technical logs'],
        [
          'Google Gemini',
          'Career results and Pathy’s replies',
          'Your questionnaire answers and your messages to Pathy, never your name or email. On the free service Google uses, Google may use this content to improve its products, and its reviewers may read it, so please do not share personal details with Pathy',
        ],
        ['Daily.co', 'Video sessions', 'Each person’s first name in the call, and call timings'],
        ['Brevo', 'Sending emails', 'The recipient’s name and email, and the email’s contents (for example a session time and join link)'],
        ['Cloudinary', 'Storing mentor photos', 'The photo a mentor uploads'],
        ['Google sign-in', 'Only if you choose "Continue with Google"', 'Confirms your name and email to us'],
      ],
    },
  },
  {
    id: 'how-long',
    title: 'How long we keep it',
    points: [
      'Your account and everything linked to it are kept until you delete your account or withdraw from the study, or until the study ends.',
      'Password-reset links stop working after one hour and are deleted automatically.',
      'Video rooms close 15 minutes after a session ends.',
      'Pathy conversations stay in your browser for 24 hours after your last message.',
    ],
  },
  {
    id: 'rights',
    title: 'Your choices and rights',
    points: [
      'You can see your details and change your password on your Account page. Mentors can edit their profile, hours and photo at any time.',
      'You can withdraw at any time, without giving a reason. Withdrawing from your Account page deletes your account and everything recorded about you, including your research data and, for mentors, your photo. This cannot be undone.',
      'You can ask what we hold about you, or ask us to correct or delete something, using the contact below.',
    ],
  },
  {
    id: 'security',
    title: 'How we protect it',
    points: [
      'Passwords are stored only as secure hashes. Password-reset links are single-use, expire after an hour, and are stored only in a form that cannot be turned back into the link.',
      'Every connection to Pathora is encrypted (HTTPS). Each record can be read only by the people allowed to see it, and those rules are checked on the server.',
      'Video rooms are private: only the session’s student and mentor can enter, and only around the session time.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies and storage in your browser',
    points: [
      'One cookie keeps you signed in, and two small security cookies protect the sign-in forms. There are no advertising or tracking cookies.',
      'Your browser stores your Pathy conversation for 24 hours, as described above.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this page',
    intro:
      'If what we collect or who processes it changes, we will update this page and the date at the top. Each student’s consent is stored with its version, so we always know which wording you agreed to.',
  },
];

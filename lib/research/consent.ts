/**
 * The research consent shown to every student before they use Pathora.
 *
 * DRAFT: replace CONSENT_VERSION and CONSENT_POINTS with the wording and
 * version label of the consent form approved in the ethics application, then
 * set CONSENT_IS_DRAFT to false. The version is stored on each student's
 * profile (StudentProfile.consentVersion), so changing it later shows exactly
 * which students agreed to which wording.
 *
 * Every point below describes what the system actually does today.
 */

export const CONSENT_IS_DRAFT = true;

export const CONSENT_VERSION = 'draft-2026-10-2';

export const CONSENT_TITLE = 'Taking part in the Pathora study';

export const CONSENT_POINTS: string[] = [
  'Pathora is part of a research study at African Leadership University into how students choose a career direction and connect with professionals.',
  'Taking part is voluntary. You can withdraw at any time, without giving a reason, from your Account page. Withdrawing deletes your account and everything recorded about you, including your research data.',
  'Your questionnaire answers are private. Only you can read them; mentors never see them.',
  'Your answers and your messages to Pathy, the AI guide, are processed by Google’s Gemini AI service to produce your results and replies. Your name and email are not sent. Google may use this content to improve its products, and its reviewers may read it, so do not share personal information with Pathy.',
  'For the research, your activity is recorded under a participant code, not your name or email, so the research data cannot identify you. Your conversations with Pathy are not stored by Pathora.',
  'Video sessions with mentors are not recorded.',
  'Your data is stored securely and used only for this study and to run Pathora.',
];

/** Short label for the agreement checkbox. */
export const CONSENT_AGREEMENT = 'I have read this and agree to take part.';

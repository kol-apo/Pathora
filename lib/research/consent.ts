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

export const CONSENT_VERSION = 'draft-2026-10';

export const CONSENT_TITLE = 'Taking part in the Pathora study';

export const CONSENT_POINTS: string[] = [
  'Pathora is part of a research study at African Leadership University into how students choose a career direction and connect with professionals.',
  'Taking part is voluntary. You can stop using Pathora and withdraw at any time, without giving a reason.',
  'Your questionnaire answers are private. Only you can read them; consultants never see them.',
  'For the research, your activity is recorded under a participant code, not your name or email, so the research data cannot identify you.',
  'Video sessions with consultants are not recorded.',
  'Your data is stored securely and used only for this study.',
];

/** Short label for the agreement checkbox. */
export const CONSENT_AGREEMENT = 'I have read this and agree to take part.';

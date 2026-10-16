import { currentStudent } from '@/lib/data';

/**
 * The seeded demo student's email, and the slug used for seeded account emails.
 * Used by `scripts/seed.ts`. Real students sign up through /signup.
 */

export const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.|\.$/g, '');

export const DEMO_STUDENT_EMAIL = `${slug(currentStudent.name)}@pathora.test`;

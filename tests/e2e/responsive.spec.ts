import bcrypt from 'bcryptjs';
import { createMentor, createStudent, db, expect, PASSWORD, scrollsSideways, signIn, tag, test } from './helpers';

/**
 * Layout: no page is wider than the screen, in every browser and phone this
 * suite runs on. Sideways scrolling is the most common way a layout breaks on
 * small screens.
 */

const PAGES = {
  public: ['/', '/signin', '/signup', '/become-a-mentor'],
  student: ['/dashboard', '/explore', '/discover', '/opportunities', '/sessions', '/account'],
  mentor: ['/mentor', '/mentor/availability', '/mentor/profile'],
  admin: ['/admin', '/admin/mentors', '/admin/sessions', '/admin/feedback', '/admin/students', '/admin/opportunities'],
};

test('public pages fit the screen', async ({ page }) => {
  for (const path of PAGES.public) {
    await page.goto(path);
    expect(await scrollsSideways(page), path).toBe(false);
  }
});

test('student pages fit the screen', async ({ page }, info) => {
  const s = await createStudent('Halima Sule', `halima.${tag(info)}@example.com`);
  await signIn(page, s.email, /\/dashboard/);
  for (const path of PAGES.student) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await scrollsSideways(page), path).toBe(false);
  }
});

test('mentor pages fit the screen', async ({ page }, info) => {
  const m = await createMentor('Dayo Kunle', `dayo.${tag(info)}@example.com`, { hours: [{ startMinute: 540, endMinute: 1020 }] });
  await signIn(page, m.email, /\/mentor/);
  for (const path of PAGES.mentor) {
    await page.goto(path);
    expect(await scrollsSideways(page), path).toBe(false);
  }
});

test('admin pages fit the screen', async ({ page }) => {
  const d = await db();
  const admin = await d.collection('users').findOne({ role: 'admin' });
  await d.collection('users').updateOne({ _id: admin!._id }, { $set: { passwordHash: await bcrypt.hash(PASSWORD, 4) } });
  await signIn(page, admin!.email, /\/admin/);
  for (const path of PAGES.admin) {
    await page.goto(path);
    // Wide tables scroll inside their own box, never the whole page.
    expect(await scrollsSideways(page), path).toBe(false);
  }
});

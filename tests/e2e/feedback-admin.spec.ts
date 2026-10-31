import { createBooking, createMentor, createStudent, db, expect, PASSWORD, signIn, tag, test } from './helpers';
import bcrypt from 'bcryptjs';

/** A student rates a session; the admin sees it by participant code only. */

test('rating a session, then the admin Sessions, Feedback and Students pages', async ({ page }, info) => {
  const t = tag(info);
  const mentor = await createMentor(`Lola Ayo ${t.slice(-5)}`, `lola.${t}@example.com`);
  const student = await createStudent(`Bisi Student${t.slice(-5)}`, `bisi.${t}@example.com`);
  await createBooking(student.id, mentor.id, -26, 'completed');
  await createBooking(student.id, mentor.id, -80, 'no_show');
  const comment = `Good advice on SQL practice ${t}`;

  await signIn(page, student.email, /\/dashboard/);
  await page.goto('/sessions');
  await expect(page.getByRole('heading', { name: 'Past' })).toBeVisible();
  // Only the session that took place can be rated.
  await expect(page.getByRole('button', { name: 'Rate session' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Rate session' }).click();
  await expect(page.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
  await page.getByRole('radio', { name: /^4 stars/ }).click();
  await page.getByRole('textbox').fill(comment);
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await expect(page.getByLabel('You rated this 4 out of 5')).toBeVisible();

  const prof = await (await db()).collection('mentorprofiles').findOne({ _id: mentor.id });
  expect(prof?.ratingAvg).toBe(4);
  const event = await (await db()).collection('analyticsevents').findOne({ participantCode: student.participantCode, eventType: 'session_rated' });
  expect(event?.payload).toMatchObject({ score: 4, withComment: true });
  expect(JSON.stringify(event)).not.toContain('SQL');

  // The admin's side.
  const d = await db();
  const admin = await d.collection('users').findOne({ role: 'admin' });
  await d.collection('users').updateOne({ _id: admin!._id }, { $set: { passwordHash: await bcrypt.hash(PASSWORD, 4) } });
  // Leave the page first: a session refresh still in flight would put the cookie back.
  await page.goto('about:blank');
  await page.context().clearCookies();
  const a = page;
  await signIn(a, admin!.email, /\/admin/);

  await a.goto(`/admin/sessions?view=all&mentor=${mentor.id}`);
  await expect(a.getByText(student.participantCode).first()).toBeVisible();
  await expect(a.getByText(comment)).toBeVisible();
  await expect(a.getByText(/Bisi Student/)).toHaveCount(0);

  await a.goto('/admin/feedback');
  await expect(a.getByText(comment)).toBeVisible();
  await expect(a.getByRole('link', { name: `Lola Ayo ${t.slice(-5)}` }).first()).toBeVisible();

  await a.goto('/admin/students');
  await expect(a.getByText(student.participantCode)).toBeVisible();
  await expect(a.getByText(/Bisi Student/)).toHaveCount(0);
});

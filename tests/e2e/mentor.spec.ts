import { createBooking, createMentor, createStudent, db, expect, signIn, tag, test } from './helpers';

/** The mentor side: setting hours, a day off, minimum notice, and confirming a request. */

test('a new mentor sets hours and notice, and students can then book them', async ({ page, browser }, info) => {
  const t = tag(info);
  const mentor = await createMentor(`Kemi Ade ${t.slice(-5)}`, `kemi.${t}@example.com`);
  await signIn(page, mentor.email, /\/mentor/);
  await page.goto('/mentor/availability');

  const status = page.getByRole('status', { name: 'Booking status' });
  await expect(status).toContainText('Students cannot book you yet');
  await expect(status).toContainText('Add the hours you are free');

  await page.getByRole('button', { name: 'Weekdays 9 to 5' }).click();
  await expect(page.getByText('40 free hours a week.')).toBeVisible();
  // One tap removes one hour.
  await page.getByRole('button', { name: 'Friday 16:00', exact: true }).click();
  await expect(page.getByText('39 free hours a week.')).toBeVisible();
  await page.getByLabel(/Minimum notice/).selectOption('0.5');

  // A day off on the first weekday at least a week away.
  const lagosDate = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date(ms));
  const weekday = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  let offset = 7;
  while ([0, 6].includes(weekday(lagosDate(Date.now() + offset * 86_400_000)))) offset++;
  const iso = lagosDate(Date.now() + offset * 86_400_000);
  const name = new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  let day = page.getByRole('button', { name: new RegExp(`^${name},`) });
  if ((await day.count()) === 0) {
    await page.getByRole('button', { name: 'Next month' }).click();
    day = page.getByRole('button', { name: new RegExp(`^${name},`) });
  }
  await day.click();
  await page.getByRole('button', { name: 'Take the day off' }).click();

  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Saved. Students now see these times.')).toBeVisible();
  await expect(status).toContainText('Students can book you');

  const rules = await (await db()).collection('availabilities').findOne({ mentor: mentor.id });
  expect(rules?.leadTimeHours).toBe(0.5);
  expect(rules?.exceptions).toEqual([expect.objectContaining({ date: iso, blocked: true })]);

  // The student's view.
  const student = await createStudent('Ife Ojo', `ife.${t}@example.com`);
  const ctx = await browser.newContext();
  const sp = await ctx.newPage();
  await signIn(sp, student.email, /\/dashboard/);
  const { slots } = await (await sp.request.get(`/api/mentors/${mentor.id}/slots`)).json();
  expect(slots.length).toBeGreaterThan(0);
  const onDayOff = slots.filter((s: { startsAt: string }) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date(s.startsAt)) === iso);
  expect(onDayOff).toHaveLength(0);
  await sp.goto(`/consultants/${mentor.id}`);
  await expect(sp.getByText(/hasn.t opened new slots/)).toHaveCount(0);
  await ctx.close();
});

test('a mentor confirms a request', async ({ page }, info) => {
  const t = tag(info);
  const mentor = await createMentor(`Uche Okoro ${t.slice(-5)}`, `uche.${t}@example.com`, {
    hours: [{ startMinute: 480, endMinute: 1320 }],
  });
  const student = await createStudent('Sade Lawal', `sade.${t}@example.com`);
  const booking = await createBooking(student.id, mentor.id, 72, 'pending');

  await signIn(page, mentor.email, /\/mentor/);
  await page.goto('/mentor');
  await page.getByRole('button', { name: 'Confirm' }).first().click();
  await expect.poll(async () => (await (await db()).collection('bookings').findOne({ _id: booking }))?.status).toBe('confirmed');
});

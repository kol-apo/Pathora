import { createMentor, createStudent, expect, signIn, tag, test } from './helpers';

/** Booking a session, losing a slot to someone faster, cancelling, and privacy. */

test('booking, a slot taken at the same moment, and cancelling', async ({ page, browser }, info) => {
  const t = tag(info);
  // Open every hour from 08:00 to 22:00, with 30 minutes' notice.
  const mentor = await createMentor(`Femi Ade ${t.slice(-5)}`, `femi.${t}@example.com`, {
    hours: [{ startMinute: 480, endMinute: 1320 }],
    noticeHours: 0.5,
  });
  const ada = await createStudent('Ada Obi', `ada.${t}@example.com`);
  const rival = await createStudent('Kofi Mensah', `kofi.${t}@example.com`);

  await signIn(page, ada.email, /\/dashboard/);
  await page.goto(`/consultants/${mentor.id}`);
  await page.getByRole('button', { name: 'Book a Session' }).click();
  const times = page.getByRole('listbox', { name: 'Available times' });
  await times.getByRole('option').first().click();

  // Another student takes the same slot first.
  const { slots } = await (await page.request.get(`/api/mentors/${mentor.id}/slots`)).json();
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage, rival.email, /\/dashboard/);
  const res = await otherPage.request.post('/api/bookings', {
    data: { mentorId: String(mentor.id), startsAt: slots[0].startsAt, topic: 'Same slot' },
  });
  expect(res.status()).toBe(201);
  await other.close();

  await page.getByRole('button', { name: /^Book / }).click();
  await expect(page.getByText(/Someone just booked/)).toBeVisible();

  // The list has refreshed; the next slot works.
  await times.getByRole('option').first().click();
  await page.getByPlaceholder(/What do you want/).fill('Moving into data analysis');
  await page.getByRole('button', { name: /^Book / }).click();
  await expect(page.getByText('Session requested').first()).toBeVisible();

  await page.goto('/sessions');
  await expect(page.getByText(/Waiting for Femi to confirm/)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel session' }).click();
  await page.getByRole('button', { name: 'Yes, cancel' }).click();
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
});

test("a student cannot open someone else's session room", async ({ page }, info) => {
  const t = tag(info);
  const mentor = await createMentor(`Bola Ige ${t.slice(-5)}`, `bola.${t}@example.com`, {
    hours: [{ startMinute: 480, endMinute: 1320 }],
    noticeHours: 0.5,
  });
  const owner = await createStudent('Chika Nwosu', `chika.${t}@example.com`);
  const outsider = await createStudent('Musa Bala', `musa.${t}@example.com`);

  await signIn(page, owner.email, /\/dashboard/);
  const { slots } = await (await page.request.get(`/api/mentors/${mentor.id}/slots`)).json();
  const made = await page.request.post('/api/bookings', {
    data: { mentorId: String(mentor.id), startsAt: slots[0].startsAt, topic: 'Private' },
  });
  const { booking } = await made.json();

  // Leave the page first: a session refresh still in flight would put the cookie back.
  await page.goto('about:blank');
  await page.context().clearCookies();
  await signIn(page, outsider.email, /\/dashboard/);
  const view = await page.goto(`/session/${booking.id}`);
  expect(view?.status()).toBe(404);
  const join = await page.request.post(`/api/sessions/${booking.id}/join`);
  expect(join.status()).toBe(404);
});

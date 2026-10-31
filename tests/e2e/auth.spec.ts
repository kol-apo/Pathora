import { createStudent, expect, PASSWORD, signIn, tag, test } from './helpers';

/** The public page, signing up and in, and who may see what. */

test('the landing page is public and shows its sections', async ({ page, isMobile }) => {
  await page.goto('/');
  const sections = ['How it works', 'Sectors', 'For mentors', 'About'];
  if (isMobile) {
    // On a phone the sections sit behind the menu button.
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile' }).getByRole('link')).toHaveText(sections);
  } else {
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveText(sections);
  }
  await expect(page.getByText('Speak with Pathy').first()).toBeVisible();
});

test('signed-out visitors are sent to sign in', async ({ page }) => {
  for (const path of ['/dashboard', '/explore', '/sessions', '/mentor', '/admin']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/signin/);
  }
});

test('sign-up refuses a short password, then signs up, asks for consent, and opens the dashboard', async ({ page }, info) => {
  const t = tag(info);
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Amaka Obi');
  await page.getByLabel('Email').fill(`amaka.${t}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Create account' }).click();
  // (The page also has Next.js's hidden route announcer, which is an alert too.)
  await expect(page.getByRole('alert').filter({ hasText: 'Use at least 8 characters.' })).toBeVisible();

  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/welcome/);
  await page.getByLabel(/I have read this and agree/).check();
  await page.getByRole('button', { name: 'Agree and continue' }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: /Welcome back, Amaka/ })).toBeVisible();
});

test('a wrong password gets the same message as an unknown email', async ({ page }, info) => {
  const t = tag(info);
  const s = await createStudent('Tunde Bello', `tunde.${t}@example.com`);
  await page.goto('/signin');
  await page.getByLabel('Email').fill(s.email);
  await page.getByLabel('Password', { exact: true }).fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  const message = page.getByRole('alert').filter({ hasText: /match an account/ });
  await expect(message).toBeVisible();
  const wrongPassword = await message.textContent();

  await page.getByLabel('Email').fill(`nobody.${t}@example.com`);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(message).toHaveText(wrongPassword ?? '');
});

test('a student cannot open the mentor or admin consoles', async ({ page }, info) => {
  const s = await createStudent('Zara Musa', `zara.${tag(info)}@example.com`);
  await signIn(page, s.email, /\/dashboard/);
  for (const path of ['/admin', '/mentor']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dashboard/);
  }
});

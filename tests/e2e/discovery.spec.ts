import { createStudent, expect, signIn, tag, test } from './helpers';

/**
 * Career discovery: Pathy's six questions, the reviewing screen, the result,
 * and the bridge to three mentors. Uses the offline matcher, not a live model.
 */
test('six answers lead to a result and three matched mentors', async ({ page }, info) => {
  const s = await createStudent('Ngozi Eze', `ngozi.${tag(info)}@example.com`);
  await signIn(page, s.email, /\/dashboard/);

  await page.getByRole('link', { name: 'Speak with Pathy' }).first().click();
  await page.waitForURL(/\/discover/);
  const reply = (text: string) => page.getByRole('button', { name: text, exact: true }).click();
  await reply('I know what I want but need guidance on how to get there');
  await page.getByRole('checkbox', { name: /Technology, systems/ }).click();
  await page.getByRole('checkbox', { name: /Building and creating/ }).click();
  await reply('Continue');
  await reply('I like building things people actually use');
  await reply("Figuring out why something isn't working");
  await reply('Creating things that exist in the world');
  await page.getByLabel('What you are studying').fill('Computer Science');
  await page.getByRole('button', { name: 'Send' }).click();

  // The reviewing screen always shows before the result.
  await expect(page.getByText('Pathy is reviewing your answers')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Speak with Pathy' })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('log', { name: 'Conversation with Pathy' })).toBeVisible();

  // The bridge: exactly three mentors, each bookable.
  await page.goto('/dashboard');
  await expect(page.locator('#matches').getByRole('link', { name: 'Book a session' })).toHaveCount(3);
});

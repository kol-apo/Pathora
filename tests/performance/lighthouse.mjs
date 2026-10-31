/**
 * Page speed and quality with Google Lighthouse, on three kinds of device.
 *
 *   node tests/performance/lighthouse.mjs <base-url> [--email you@x.com --password ...]
 *
 * Examples:
 *   node tests/performance/lighthouse.mjs https://your-site.vercel.app
 *   node tests/performance/lighthouse.mjs http://localhost:3077 --email student@x.com --password secret123
 *
 * Without an email and password, only the public pages are measured. With a
 * student account, the signed-in student pages are measured too. Nothing is
 * changed on the site: pages are only loaded.
 *
 * Profiles:
 *   desktop   a fast laptop on a fast connection (Lighthouse's desktop preset)
 *   mobile    a mid-range phone on slow 4G, CPU slowed 4x (Lighthouse's default)
 *   low-end   the same phone with the CPU slowed 8x, standing in for a budget Android phone
 *
 * Results are written to tests/performance/results/ as JSON and Markdown.
 * Needs Google Chrome installed. Lighthouse is fetched with npx (pinned version).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const LIGHTHOUSE = 'lighthouse@12.6.0';

const args = process.argv.slice(2);
const base = (args[0] ?? '').replace(/\/$/, '');
if (!/^https?:\/\//.test(base)) {
  console.error('Usage: node tests/performance/lighthouse.mjs <base-url> [--email ... --password ...]');
  process.exit(1);
}
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i > 0 ? args[i + 1] : undefined;
};
const email = flag('email');
const password = flag('password');

const PUBLIC_PAGES = ['/', '/signin'];
const STUDENT_PAGES = ['/dashboard', '/explore', '/opportunities', '/sessions'];

const PROFILES = {
  desktop: ['--preset=desktop'],
  mobile: [],
  'low-end': ['--throttling.cpuSlowdownMultiplier=8'],
};

/** Sign in once with a real browser and return the session cookie header. */
async function sessionCookie() {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/signin`);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    const cookies = await page.context().cookies();
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  } finally {
    await browser.close();
  }
}

function lighthouse(url, profileFlags, headers) {
  const out = join(tmpdir(), `lh-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const extra = headers ? [`--extra-headers=${JSON.stringify(headers)}`] : [];
  execFileSync(
    'npx',
    [
      '--yes',
      LIGHTHOUSE,
      url,
      '--quiet',
      '--output=json',
      `--output-path=${out}`,
      '--only-categories=performance,accessibility,best-practices,seo',
      '--chrome-flags=--headless=new --no-first-run',
      ...profileFlags,
      ...extra,
    ],
    { stdio: 'ignore', shell: true },
  );
  const report = JSON.parse(readFileSync(out, 'utf8'));
  rmSync(out, { force: true });
  const a = report.audits;
  const score = (k) => Math.round((report.categories[k]?.score ?? 0) * 100);
  return {
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    fcpMs: Math.round(a['first-contentful-paint']?.numericValue ?? 0),
    lcpMs: Math.round(a['largest-contentful-paint']?.numericValue ?? 0),
    tbtMs: Math.round(a['total-blocking-time']?.numericValue ?? 0),
    cls: Number((a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
    totalKb: Math.round((a['total-byte-weight']?.numericValue ?? 0) / 1024),
    requests: a['network-requests']?.details?.items?.length ?? null,
    domNodes: a['dom-size']?.numericValue ?? null,
    lighthouseVersion: report.lighthouseVersion,
    userAgent: report.environment?.hostUserAgent,
  };
}

const cookie = email && password ? await sessionCookie() : null;
const pages = [...PUBLIC_PAGES.map((p) => ({ path: p, signedIn: false })), ...(cookie ? STUDENT_PAGES.map((p) => ({ path: p, signedIn: true })) : [])];

const results = [];
for (const { path, signedIn } of pages) {
  for (const [profile, flags] of Object.entries(PROFILES)) {
    process.stdout.write(`${profile.padEnd(8)} ${path} ... `);
    const r = lighthouse(`${base}${path}`, flags, signedIn ? { Cookie: cookie } : null);
    results.push({ path, profile, ...r });
    console.log(`performance ${r.performance}, LCP ${r.lcpMs} ms`);
  }
}

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const host = new URL(base).host.replace(/[^a-z0-9.-]/gi, '_');
const dir = new URL('./results/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL(`${stamp}-${host}.json`, dir), JSON.stringify({ base, measuredAt: new Date().toISOString(), results }, null, 2));

const rows = results.map(
  (r) =>
    `| ${r.path} | ${r.profile} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} | ${r.fcpMs} | ${r.lcpMs} | ${r.tbtMs} | ${r.cls} | ${r.totalKb} |`,
);
const md = [
  `# Lighthouse results: ${base}`,
  '',
  `Measured ${new Date().toISOString()} with Lighthouse ${results[0]?.lighthouseVersion ?? ''}.`,
  '',
  '| Page | Device | Performance | Accessibility | Best practices | SEO | First paint (ms) | Largest paint (ms) | Blocking time (ms) | Layout shift | Page weight (KB) |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows,
  '',
].join('\n');
writeFileSync(new URL(`${stamp}-${host}.md`, dir), md);
console.log(`\nSaved to tests/performance/results/${stamp}-${host}.md`);

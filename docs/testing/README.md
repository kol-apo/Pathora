# Testing, performance and compatibility

Results measured on 31 October 2026. How to rerun each one is in the main [README](../../README.md#checking-that-it-works).

## Test environment

| | |
| --- | --- |
| Machine | Laptop, Intel Core i5-8250U (4 cores, 8 threads, 1.6 GHz), 7.9 GB RAM: a mid-range machine several years old |
| Operating system | Windows 10 Pro 22H2 (build 19045) |
| Browsers | Google Chrome 156, Microsoft Edge 156, Firefox (Playwright 1.64 build), WebKit (Playwright 1.64 build for Windows) |
| Runtime | Node.js 22.20, Next.js 14.2 production build (`next build` then `next start`) |
| Database | A throwaway in-memory MongoDB 7.0, filled with the sample data from `npm run seed`. The real database is never used by any test |
| AI, video, email | Offline matcher; no AI service, Daily or Resend is called by the tests |

## Summary

| Strategy | Tool | Result |
| --- | --- | --- |
| Unit | `npm run verify` | 300 of 300 checks pass |
| Integration (real database) | `npm run verify:db` / `npm run verify:db:local` | 127 of 127 checks pass |
| Concurrency | within `verify:db` | 5 simultaneous bookings of one slot: exactly 1 succeeds. 4 simultaneous bookings at overlapping times 15 minutes apart: exactly 1 succeeds; the database refuses an overlap even when the app's own check is skipped |
| End-to-end and cross-browser | `npm run test:e2e` (Playwright) | 15 of 15 journeys pass in each of Chrome, Edge, Firefox and an Android phone: 60 of 60 |
| Responsive layout | within `test:e2e` | No page scrolls sideways on any public, student, mentor or admin page, at desktop and phone sizes |
| Performance | `tests/performance/lighthouse.mjs` (Lighthouse) | See [Performance](#performance) |

## End-to-end results by browser and device

Each journey runs against a production build in a real browser.

| Journey | Chrome (Windows) | Edge (Windows) | Firefox | Android phone (Pixel 7, Chrome) |
| --- | --- | --- | --- | --- |
| The landing page is public and shows its sections | Pass | Pass | Pass | Pass (via the phone menu) |
| Signed-out visitors are sent to sign in | Pass | Pass | Pass | Pass |
| Sign-up refuses a short password, then signs up, asks for consent, opens the dashboard | Pass | Pass | Pass | Pass |
| A wrong password gets the same message as an unknown email | Pass | Pass | Pass | Pass |
| A student cannot open the mentor or admin consoles | Pass | Pass | Pass | Pass |
| Booking; a slot taken at the same moment ("Someone just booked"); cancelling | Pass | Pass | Pass | Pass |
| A student cannot open someone else's session room (404, page and API) | Pass | Pass | Pass | Pass |
| Six answers lead to a result and exactly three matched mentors | Pass | Pass | Pass | Pass |
| Rating a session; the admin sees it by participant code, never by name | Pass | Pass | Pass | Pass |
| A new mentor sets hours, notice and a day off; students can then book | Pass | Pass | Pass | Pass |
| A mentor confirms a request | Pass | Pass | Pass | Pass |
| Public pages fit the screen | Pass | Pass | Pass | Pass |
| Student pages fit the screen | Pass | Pass | Pass | Pass |
| Mentor pages fit the screen | Pass | Pass | Pass | Pass |
| Admin pages fit the screen | Pass | Pass | Pass | Pass |

Every test also fails if any page throws an uncaught JavaScript error.

### Safari

Playwright's WebKit build for Windows (the engine behind Safari, but not Safari itself) passed 8 of 15 journeys at desktop and iPhone sizes. The failures were not reproducible in the other browsers, and investigation showed the WebKit build itself misbehaving on this machine: it could not resolve outside hostnames (the web font from fonts.gstatic.com failed with "Could not resolve hostname" while Chrome loaded it), and in about half of repeated sign-in attempts it never sent the sign-in request at all. Background page preloads were also reported as "access control checks" errors when the test moved on. The WebKit setups therefore run only on request (`E2E_WEBKIT=1`).

**Limitation:** Pathora has not yet been tested in real Safari, on an iPhone or a Mac; no Apple device was available. The 8 WebKit journeys that did pass at both desktop and iPhone sizes (the public page, sign-in redirects, sign-up with consent, the wrong-password message, console access rules, booking with a lost slot and cancelling, and session-room privacy) are partial evidence only; Pathy's questions, ratings and the mentor pages were not confirmed in WebKit. The next step is a real-device check through a cloud testing service with a free trial (for example BrowserStack Live or LambdaTest, which run real iPhones in the browser): sign up, answer Pathy's questions, book and cancel a session, and join a video call.

## Problems the tests found, and what changed

| Found | Cause | Fix |
| --- | --- | --- |
| On a slow device, pressing "Sign in" before the page finished loading reloaded the page and cleared the form (seen in WebKit) | The button worked before the page's JavaScript was ready, so the browser submitted the plain HTML form | Submit buttons on the sign-in, sign-up, password and admin listing forms stay disabled until the page is ready (`components/ui/useHydrated.ts`). No password was ever exposed: the fields have no names to send |
| Quarter-hour start times allowed two clashing bookings with different start times to slip past the database guard | The unique index only compared identical start times | Each booking claims the 15-minute blocks it covers, including the break; a unique index on those blocks refuses any overlap (`no_overlapping_active_bookings`) |
| The browser test runner froze before the first test | Waiting synchronously for the seeding step blocked the runner, so the in-memory database could not write its logs and stopped answering | The runner waits asynchronously |
| Sign-in failed in the production test build | Auth.js only trusts its own address automatically on Vercel | The test runner sets `AUTH_TRUST_HOST` |
| Two checks matched Next.js's hidden route announcer as an "alert" | The page has two alert regions | The checks look for the alert with the expected text |

## Performance

Measured with Google Lighthouse 12.6 against a production build on the test machine (`node tests/performance/lighthouse.mjs http://localhost:3077 --email … --password …`). Full table: [tests/performance/results/](../../tests/performance/results/2026-10-31-15-17-localhost_3077.md).

The three device profiles:

- **Desktop**: a fast computer on a fast connection.
- **Mid-range phone**: Lighthouse's default mobile test, a mid-range Android phone on slow 4G with the processor slowed 4 times.
- **Low-end phone**: the same, with the processor slowed 8 times, standing in for a budget Android phone.

Network delay is simulated, so these show how the pages themselves behave; the live site adds Vercel's real network on top.

| Page | Performance (desktop / mid-range / low-end) | Largest content visible (desktop / mid-range / low-end) | Accessibility | Best practices | SEO | Page weight |
| --- | --- | --- | --- | --- | --- | --- |
| Landing `/` | 87 / 77 / 73 | 1.5 s / 3.2 s / 3.3 s | 96 | 100 | 100 | 193–210 KB |
| Sign in | 92 / 86 / 84 | 1.3 s / 3.2 s / 2.7 s | 96 | 100 | 100 | 187 KB |
| Dashboard | 88 / 84 / 73 | 1.4 s / 3.3 s / 3.0 s | 96 | 100 | 100 | 190 KB |
| Mentors `/explore` | 91 / 92 / 84 | 1.3 s / 2.4 s / 3.3 s | 94 | 100 | 100 | 209–213 KB |
| Opportunities | 95 / 83 / 66 | 1.1 s / 3.2 s / 3.0 s | 96 | 100 | 100 | 191 KB |
| Sessions | 73 / 95 / 54 | 2.4 s / 2.4 s / 3.9 s | 96 | 100 | 100 | 194 KB |

What this shows:

- **Every page is light**: under 215 KB including scripts, styles and images, which matters on mobile data. Mentor photos were pre-shrunk to 3–13 KB each.
- **Desktop scores are 87–95 on five of six pages**, with the main content visible in about 1.1–1.5 seconds. The Sessions page is lower (73) because its list is grouped into Today, Coming up and Past in the browser, after the page loads; the server cannot know the viewer's timezone.
- **On phones, content appears in 2.4–3.3 seconds** on the mid-range profile, within Google's 4-second "needs improvement" band and close to its 2.5-second "good" mark.
- **The low-end phone is the weak spot.** "Blocking time", when a slow processor is busy running the page's JavaScript and cannot respond to taps, rises to 0.8 s on the dashboard, 1.4 s on Opportunities and 2.9 s on Sessions. These pages do work in the browser after loading (grouping sessions, filtering opportunities). Moving that work to the server, or splitting the scripts, would be the next improvement.
- **Accessibility 94–96, best practices 100, SEO 100** on every page and device.
- Lighthouse scores vary by a few points between runs on the same machine; each row is one run.

### The live site (Vercel)

Measured on https://usepathora.vercel.app with the same script (`node tests/performance/lighthouse.mjs https://usepathora.vercel.app`), public pages only, so nothing was written to the real database. Full table: [tests/performance/results/](../../tests/performance/results/2026-10-31-15-34-usepathora.vercel.app.md).

| Page | Performance (desktop / mid-range / low-end) | Largest content visible (desktop / mid-range / low-end) | Accessibility | Best practices | SEO | Page weight |
| --- | --- | --- | --- | --- | --- | --- |
| Landing `/` | 71 / 67 / 64 | 2.3 s / 3.8 s / 4.1 s | 96 | 100 | 100 | 238–259 KB |
| Sign in | 82 / 85 / 90 | 1.8 s / 3.0 s / 2.7 s | 96 | 100 | 100 | 186 KB |

- **The landing page is slower live than on the test machine** (2.3 s against 1.5 s on desktop), because real requests travel to Vercel's servers and the page loads live data from MongoDB Atlas (mentor counts and the real mentor photos, which also make it about 50 KB heavier).
- **The sign-in page stays quick** on every profile (1.8–3.0 s), since it needs no database data.
- **Finding to fix:** on phones the landing page shifts as it loads (layout shift 0.17, above Google's 0.1 "good" limit, both locally and live). Something near the top is drawn without its final size reserved. Giving that element a fixed height would fix it.

### AI and video

- **Career discovery with Gemini** (`gemini-3.5-flash-lite`, free tier) took 6–13 seconds per result in development. The reviewing screen covers at least 2.5 seconds, and a 45-second timeout falls back to the offline matcher, so a student always gets a result.
- **Live video**: one real two-person call through Daily was made from this machine (two browsers, fake camera and microphone). Both people were in the same room, and the call's length was read back from Daily's records.

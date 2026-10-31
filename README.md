# Pathora

Most AI career tools for students stop at advice. Pathora treats advice as incomplete until it reaches a person, and enforces that in its architecture rather than in its interface copy: every generated roadmap ends in a mandatory bridge to three vetted professionals in the recommended sector.

Pathora is a Next.js application on **MongoDB**. The same database holds the application's data and the research data the study collects. The schema is documented in [docs/data-model.md](docs/data-model.md), and the AI prompt is specified and validated in [prompts/](prompts/).

| | |
| --- | --- |
| Live site | https://usepathora.vercel.app |
| Walkthrough video | _add the link_ |
| Technical report (PDF) | _add the link_ |
| Testing, performance and compatibility results | [docs/testing/](docs/testing/README.md) |

## Three architectural questions

| Question | Mechanism | Verified by |
| --- | --- | --- |
| What stops two students booking one slot? | Two layers. `createBooking()` regenerates the mentor's open slots and accepts only a real, free one. Sessions can start every 15 minutes, so two clashing bookings may have different start times. Each booking therefore claims the 15-minute blocks it covers, including the 15-minute break after it, and the unique index `no_overlapping_active_bookings` lets MongoDB accept only one active booking per mentor and block, even if two requests pass the first check at the same instant. | `npm run verify:db`: five students book the same slot at once, and four book overlapping times 15 minutes apart at once; each time exactly one succeeds and the rest get a clean "slot taken". |
| How are consultants matched, and why that metric? | `surfaceBridgeConsultants()` ranks approved consultants in the result's sector only, by cosine similarity between the student's interest vector and each consultant's, and records the top three. Cosine compares only the direction of interests, so a student who writes long answers is not scored as closer to everyone than one who writes short answers. | `npm run verify` (the ranking maths) and `npm run verify:db` (ranking against the live database matches an independent recalculation, the sector guard, the conversion funnel). |
| What stops one participant reading another's data? | MongoDB has no row-level security, so access rules live in the data layer: participant data is read only through functions that take the caller's identity. A student reads only their own results; a mentor reads a result only with a booking linked to it, and never sees the student's answers. Research events carry a pseudonymous `participantCode` and have no user field at all. | `npm run verify:db` (owner, other student, unbooked and booked mentor) and `npm run verify` (analytics events refuse any identifier field). |

Run the checks with `npm run verify` and `npm run verify:db`, the research reports with `npm run report`, and the prompt contract with `python prompts/validate_prompt.py`. [SETUP.md](SETUP.md) covers installation.

## Three design decisions worth reading first

1. **The model proposes; the database matches.** The language model decides direction: a sector, a phased plan, and the questions to ask a human. It never chooses which human. The server ranks consultants deterministically from a five-axis interest vector, so the same answers always surface the same consultants, and any match can be reproduced and audited without re-running the model. In the running app the vector is calculated from the student's answers (`studentVectorFor()` in [lib/discovery/questions.ts](lib/discovery/questions.ts)); the research specification has the model supply it. See `layer_1_identity` in [prompts/discovery.json](prompts/discovery.json) and `surfaceBridgeConsultants()` in [lib/db/queries/bridge.ts](lib/db/queries/bridge.ts).
2. **Hallucinated opportunities are structurally impossible, not just discouraged.** Programmes may only be named from a curated allow-list, the `VerifiedResource` collection. A post-generation validator rejects any roadmap that names a programme outside it, whether or not the programme exists. The database and the validator both load the list from one file, [lib/research/verified-resources.json](lib/research/verified-resources.json), so they cannot drift apart.
3. **Double-booking is defended twice, and the database has the final say.** Validation in code catches made-up or already-taken times; the unique index catches the race that validation cannot, two requests checking at the same instant. The second write fails inside MongoDB and becomes the handled `SLOT_TAKEN` response, so the student sees "Someone just booked that slot" rather than an error.

## Current state

| Component | State |
| --- | --- |
| Next.js application | Built. A public landing page (how it works, sectors, a section for mentors, about); everything else is inside the signed-in student app: Overview, Mentors, Career Discovery (speaking with Pathy), Opportunities and Sessions. Sign-up goes through research consent straight to the dashboard. |
| Discovery and the bridge | Built. A consented student's result is saved with its interest vector, and its three mentors are surfaced and recorded. Opening one of their profiles records the view; booking from it records a bridge booking. Saved results have their own roadmap page (`/discover/results/:id`). Only mentors taking bookings are matched. |
| Pathy, the chatbot | After the six questions, students keep talking to Pathy about their direction, roadmap, applications, opportunities and mentors. Each reply is built from their saved answers and result, their three mentors, open opportunities and the verified programmes; Pathy may name only those, stays on careers, and recommends no courses. Conversations stay in the student's browser for 24 hours and are never stored on the server; the research log records only that a message was sent. 60 messages per student per day. |
| Opportunities | Read from four publishers' RSS feeds (Opportunities for Africans, Opportunity Desk, Opportunities for Youth, Youth Opportunities Hub) with `npm run fetch-opportunities`, or on a schedule once deployed. ALU SPD listings are added by an admin at `/admin/opportunities`. Each listing links to the publisher's page. |
| Sessions | A page with today's sessions, those coming up (cancellable) and past ones, in the student's own timezone. After a session, students rate it from 1 to 5 stars with an optional comment; the stars count towards the mentor's rating, the comment is read only by the Pathora team. |
| Data layer (MongoDB) | Built and tested: 12 collections, the bridge, access rules and research reports. `npm run verify` (300 checks) and `npm run verify:db` (127 checks) pass. |
| Sign-in and roles | Built with Auth.js: email and password, and Google once its keys are set. Sign-up creates a student, who agrees to the research consent and gets a participant code. Mentors join by applying; admins are promoted with `npm run make-admin`. "Forgot your password?" emails a link that works once, for an hour; resetting signs the account out everywhere. The Account page lets students withdraw from the study, which deletes the account and everything recorded about them, research events included. |
| Partner mentors | Nine mentors from JointHub's directory, listed with `npm run import-jointhub` and marked "JointHub" on their cards and profiles. They are not taking bookings yet: their weekly hours are needed first, and nobody can sign in as them until they claim their account. |
| Mentor console (`/mentor`) | Built: application status, booking requests to confirm or decline, marking past sessions as held or not (which feeds the session-completion measure), a weekly-hours editor, and profile links (LinkedIn, X, portfolio, publications, videos) shown on their public profile. Mentors apply at `/become-a-mentor`. |
| Admin console (`/admin`) | Built: platform counts and the research reports; mentor review (approve with an interest profile, reject, suspend, reinstate); every session with its outcome, video join and rating; student feedback with ratings, comments and a per-mentor table; and each participant's activity. Students appear by participant code only. |
| `prompts/discovery.json` | Specified, and validated offline by `prompts/validate_prompt.py`. **No live generation yet:** no code calls the Claude API with this specification. |
| Research events | Recorded on the server under the student's participant code: discovery completed, bridge surfaced, bridge profile viewed, booking requested, booking cancelled, session outcome (held or not, as the mentor reports it), Pathy message sent (never its text). Payloads carry no ids. Students who have not consented are not recorded. |
| Live AI | Gemini, on Google's free tier for now, through its OpenAI-compatible endpoint (set the `AI_*` variables; see `.env.example`). With no key, Career Discovery runs on the offline matcher, which is also the fallback if Gemini fails. It uses the app's own prompt (`lib/ai/prompt.ts`), not `prompts/discovery.json`, which was written for Claude. On the free tier Google may use prompts and responses to improve its products, and human reviewers may read them, so it is for testing until the consent form covers it or a paid tier is used. |
| Live video | Built with Daily (daily.co). Each confirmed booking gets its own private room, open from 10 minutes before to 15 minutes after the session, two people at most, never recorded. Only the booking's student and mentor can get a pass to enter, issued by Pathora. Daily's call screen is embedded in the session room; when each person joined and how long the call ran (from Daily's own meeting records) are stored in `VideoSession`. |
| Student Overview | Built on the student's own data, in reading order: the one next step, their direction and sessions, their three matched mentors, and opportunities in their field. |
| Consent wording | Placeholder, marked as a draft on screen, until the approved consent form is added to `lib/research/consent.ts`. |
| Deployment | Not deployed. See [Deployment plan](#deployment-plan). |

## Known discrepancies

- **Two discovery prompts.** The application's live prompt is `lib/ai/prompt.ts` (version `app-discovery-v1`); the research specification is `prompts/discovery.json` (`discovery-v1.1`). Their output shapes differ until the application moves to the specification.
- **ERD names.** The ERD's entity names differ from the collection names, for example "consultants" is `MentorProfile` and "roadmaps" is `DiscoveryResult`. The full mapping is in [docs/data-model.md](docs/data-model.md#erd-names-and-collections). `BridgeRecommendation` is not in the ERD; it was added so bridge conversion is measured per result rather than inferred from bookings.
- **Model identifier.** The specification asked for `claude-opus-4`, which is not a valid model ID. `prompts/discovery.json` uses `claude-opus-4-0`, the exact ID for Claude Opus 4, which is deprecated. Newer models do not accept `temperature`, so changing model means revisiting the determinism approach. See [prompts/README.md](prompts/README.md).
- **Resource URLs.** Where the exact programme page was not certain, [lib/research/verified-resources.json](lib/research/verified-resources.json) holds the organisation's homepage. Each needs checking before the study starts.

## Ethics

This repository contains no participant data. The seeded data is sample mentors, a demo student and a public catalogue of programmes. Test fixtures are synthetic records tagged with a run marker, and `npm run verify:db` deletes them when it finishes.

`AnalyticsEvent` carries a `participantCode` and no user or student field, and refuses any extra field, so an export of the research dataset holds no direct identifier by construction: it cannot be joined back to a name or email without the separately protected `StudentProfile` collection. Sessions are not recorded, and the data model has no field that could hold a recording.

Under the data management plan in the ethics application, participant data must never enter version control. `.gitignore` excludes `data/`, `responses/`, `participants/`, `consent/`, and all `.csv` and `.xlsx` files.

## Running the application

The sections below cover the Next.js application. For the database checks, research reports and prompt validator, see [SETUP.md](SETUP.md).

## GitHub repository

https://github.com/kol-apo/Pathora

## Setting up the environment and the project

### Technical requirements

| Requirement | Version or detail |
| --- | --- |
| Node.js and npm | Node.js 18.17 or newer (developed and tested on 22.20) |
| Next.js (App Router) | 14.2 |
| React | 18.3 |
| TypeScript | 5.6 |
| Tailwind CSS | 3.4 |
| MongoDB | Atlas (the free M0 cluster is enough), through Mongoose 9.9 |
| Auth.js (NextAuth) | 5.0.0-beta.32 |
| zod | 4 |
| Playwright (browser tests) | 1.64, with Chrome, Edge and Firefox (WebKit optional) |
| Python (prompt validator only) | 3.10 or newer |
| Optional services | A Gemini API key (or any OpenAI-compatible AI service), a Daily API key for video, a Resend API key for email |
| Hardware | Any machine that runs Node.js; developed on Windows 10. Students only need a modern browser on a phone or computer |

### Steps

1. Clone the repository and install the dependencies.

   ```bash
   git clone https://github.com/kol-apo/Pathora.git
   cd Pathora
   npm install
   ```

2. Create the environment file.

   ```bash
   cp .env.example .env.local
   ```

3. Open `.env.local` and set `MONGODB_URI` to your connection string. In Atlas this is under **Connect → Drivers**. Put the database name `pathora` before the `?`:

   ```
   MONGODB_URI="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/pathora?retryWrites=true&w=majority"
   ```

   In Atlas, also add your IP address under **Network Access**.

4. Fill the database with the consultants, their schedules, the demo student and the opportunities. This step also builds the database indexes, including the one that prevents double-booking, so it is required.

   ```bash
   npm run seed
   ```

5. Start the app and open http://localhost:3000.

   ```bash
   npm run dev
   ```

### Environment variables

| Variable | Needed | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `AUTH_SECRET` | Yes | Signs the sign-in cookie. Any long random string; see `.env.example` for a command that makes one |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Only for Google sign-in | From Google Cloud Console. Without them the site offers email and password only |
| `AI_PROVIDER` | No | `mock` (default, offline, no key) or `openai-compatible` |
| `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` | Only for a live AI model | Any service that uses the OpenAI chat format, such as Groq, OpenRouter, Gemini or Ollama. Without one, Pathy cannot chat and says so |
| `DAILY_API_KEY` | For live video | From the Daily dashboard (Developers). Server only, never sent to the browser. Daily needs a payment method on the account before calls work, even on the free tier (10,000 minutes a month) |
| `CRON_SECRET` | Only when deployed | Lets a scheduler call `/api/cron/opportunities` to read the opportunity feeds |
| `RESEND_API_KEY`, `EMAIL_FROM` | For email | Resend sends password-reset emails. Without a key, emails are printed in the terminal during development. Until a domain is verified in Resend, it only delivers to your own Resend address |
| `APP_URL` | When deployed | The site's address, used in emailed links (for example `https://pathora.vercel.app`). Never taken from the request, so a link cannot be pointed at another site |

The discovery questionnaire works without any AI key. With `AI_PROVIDER="mock"` it scores the answers offline, and the same offline scoring is the fallback if a live model fails.

### Checking that it works

```bash
npm run lint        # ESLint (Next.js and TypeScript rules) over app, components, lib, scripts and tests
npm run verify      # 300 offline checks: slots, timezones, matching, interest vectors, model rules, accounts, AI output, opportunity feeds, Pathy's prompt. No database needed
npm run verify:db:local   # the same live checks against a throwaway database; never touches the real one
npm run verify:db   # 127 live checks (uses MONGODB_URI; creates its own records and removes them): double booking, overlapping starts, date-specific hours, session feedback, admin views, the bridge, saving results, cancelling, session outcomes, video rooms, password resets, account deletion, access rules, research events, opportunities, reports
npm run test:e2e    # browser tests: real user journeys in Chrome, Edge, Firefox and an Android phone (add E2E_WEBKIT=1 for WebKit)
npm run report      # research reports: bridge conversion, output validity, session completion
npm run make-admin -- you@example.com   # promote an existing account to admin
npm run build       # production build
node tests/performance/lighthouse.mjs <site-url>   # page speed and quality on desktop, a mid-range phone and a low-end phone
```

The browser tests start their own throwaway database and a production build of the app on port 3077, so they never touch the database in `.env.local` and can run while `npm run dev` is running. The first time, install Firefox for the tests with `npx playwright install firefox` (Chrome and Edge are used as installed; `webkit` too if you set `E2E_WEBKIT=1`). Run one browser with `npm run test:e2e -- --project="Firefox"`. A report is written to `tests/e2e/report/`.

### Testing

| Strategy | Where | What it covers |
| --- | --- | --- |
| Static analysis | `npm run lint`, `npx tsc --noEmit` | ESLint with the Next.js and TypeScript rules (`.eslintrc.json`), and strict TypeScript |
| Unit | `scripts/verify.ts` (`npm run verify`) | Pure logic with fixed inputs and edge cases: slots across timezones and daylight saving, cosine ranking, interest vectors, the availability grid, AI output parsing and fallback, feed parsing, prompt rules, video room rules |
| Integration | `scripts/verify-db.ts` (`npm run verify:db`) | The data layer against a real MongoDB: indexes, access rules, the bridge, bookings, feedback, admin views, password resets, account deletion |
| Concurrency | within `verify:db` | Five students book the same slot at the same instant; exactly one succeeds |
| End-to-end, cross-browser and device | `tests/e2e/` (`npm run test:e2e`) | Sign-up and consent, discovery and the bridge, booking (including losing a slot to someone faster), cancelling, privacy of session rooms, mentor availability and confirmation, feedback and the admin pages, and that no page scrolls sideways, in Chrome, Edge, Firefox and an Android phone |
| Performance | `tests/performance/lighthouse.mjs` | Lighthouse scores and load times on a desktop, a mid-range phone and a low-end phone |

Results are in [docs/testing/](docs/testing/README.md).

## Designs

### Figma mockups

https://www.figma.com/design/xgHTY50iOunFJr3s896yQ0/Pathora?node-id=0-1&t=TDUUwpzVr3hUhNx9-1

### Screenshots of the app

Captured from the running app against a seeded test database. The student, mentor and admin accounts are test accounts; Pathy's reply is a real one from Gemini.

#### Public site

**Landing page.** The only public page: how it works, the four sectors, a section for mentors, and about.

![Landing page](docs/screenshots/01-landing.png)

The full landing page is in [docs/screenshots/02-landing-full.png](docs/screenshots/02-landing-full.png).

#### Students

**Sign up**, then **research consent**, which leads straight to the dashboard (the consent wording is still a draft)

![Sign up](docs/screenshots/03-sign-up.png)

![Research consent](docs/screenshots/04-consent.png)

**Overview for a new student:** one next step, speaking with Pathy

![Overview for a new student](docs/screenshots/05-overview-new.png)

**Career Discovery: Pathy's six questions**, then the reviewing screen

![Pathy's questions](docs/screenshots/06-pathy-questions.png)

![Pathy reviewing the answers](docs/screenshots/07-pathy-reviewing.png)

**Speaking with Pathy** about the saved result. Pathy knows the student's answers, roadmap, mentors and the open opportunities, and names only those.

![Speaking with Pathy](docs/screenshots/08-pathy-chat.png)

**The roadmap**, ending in the bridge: the three mentors in the field whose interests are closest to the student's. The full page is in [docs/screenshots/09-roadmap.png](docs/screenshots/09-roadmap.png).

**Mentors**, with JointHub's mentors first and marked

![Mentors](docs/screenshots/10-mentors.png)

**A JointHub mentor's profile** (not taking bookings until their hours are added)

![JointHub mentor profile](docs/screenshots/11-partner-profile.png)

**Booking:** choosing a time from the mentor's weekly hours, shown in the student's timezone

![Booking](docs/screenshots/12-booking.png)

**Overview with a booking:** the next session, the direction, the three matches, and opportunities in the student's field

![Overview](docs/screenshots/13-overview.png)

**Sessions:** today, coming up (cancellable) and past

![Sessions](docs/screenshots/14-sessions.png)

**Opportunities**, read from four publishers' feeds and ALU SPD, filterable by type and by the student's field

![Opportunities](docs/screenshots/15-opportunities.png)

#### Mentors

**Applying**, with LinkedIn, X and other links

![Mentor application](docs/screenshots/16-mentor-application.png)

**Availability:** tap the hours you are free in a usual week (each hour is one session), then tap any date on the calendar to take it off or change its hours.

![Mentor availability](docs/screenshots/17-mentor-availability.png)

**Mentor console:** requests to confirm, upcoming sessions, and sessions to mark as held or not. Students appear by first name only.

![Mentor console](docs/screenshots/18-mentor-console.png)

**Profile links**

![Mentor profile links](docs/screenshots/19-mentor-profile-links.png)

#### Admin

**Reviewing an application** and setting the mentor's interest profile, which the bridge uses for matching

![Admin mentor review](docs/screenshots/20-admin-mentor-review.png)

**Overview**, with the study's measures: the bridge funnel, AI output validity, and whether sessions take place

![Admin overview](docs/screenshots/21-admin-overview.png)

**Opportunities:** reading the feeds on demand, adding ALU SPD listings, and taking listings down

![Admin opportunities](docs/screenshots/22-admin-opportunities.png)

### Database (MongoDB)

Twelve collections, defined as Mongoose models in `lib/db/models/`. Fields, validation rules, indexes and access rules are documented in [docs/data-model.md](docs/data-model.md).

```mermaid
erDiagram
    User ||--o| StudentProfile : "has (student)"
    User ||--o| MentorProfile : "has (mentor)"
    User ||--o{ MentorProfile : "approves (admin)"
    MentorProfile ||--|| Availability : publishes
    MentorProfile ||--o{ Booking : receives
    User ||--o{ Booking : "makes (student)"
    User ||--o{ DiscoveryResult : completes
    DiscoveryResult ||--|{ BridgeRecommendation : "surfaces 3"
    MentorProfile ||--o{ BridgeRecommendation : "is surfaced in"
    DiscoveryResult ||--o{ Booking : "leads to (bridge)"
    Booking ||--o| VideoSession : "takes place in"
```

`Opportunity`, `VerifiedResource` and `AnalyticsEvent` link to nothing. For `AnalyticsEvent` that is deliberate, so research data cannot be joined back to a person.

### How booking works in the application

**Open slots are calculated, not stored.** A consultant's availability is saved as weekly rules in their own timezone, for example "Monday, Wednesday and Friday, 09:00 to 12:00 and 14:00 to 17:00, Africa/Lagos", plus any specific dates that differ: a day off, or different hours for that one date, which replace the weekly hours for that day. When a student opens the booking card, `lib/booking/slots.ts` walks the coming days, offers a 45-minute session at every quarter hour that fits inside each window (13:00, 13:15, 13:30, 13:45), drops any that would overlap a booking or the 15-minute break around it, converts each time to UTC and removes anything that is too soon, too far ahead or already booked. The browser then shows each time in the student's own timezone.

**Double-booking is blocked twice.**

1. Before saving, the server regenerates the slots and checks that the requested time is a real, free slot. This rejects a made-up time such as 3am.
2. MongoDB has a unique index on consultant and start time that counts only active bookings. If two students pass the first check at the same instant, the database rejects the second save. The student sees "Someone just booked that slot" and a refreshed list of times.

A cancelled booking is no longer active, so its slot can be booked again.

## Deployment

The app is deployed on Vercel, with the database on MongoDB Atlas. Every push to `main` redeploys it. A Vercel Cron job (`vercel.json`) reads the opportunity feeds every day at 06:00 UTC, through `/api/cron/opportunities`, which runs only with the `CRON_SECRET`. The AI and feed routes are allowed 60 seconds (`maxDuration`), because Vercel stops functions after 10 seconds by default.

The setup uses two free-tier services:

| Part | Service | Why |
| --- | --- | --- |
| Web app and API | [Vercel](https://vercel.com) | Built for Next.js. Pages and the `app/api` routes deploy together, with HTTPS and a preview URL for every push |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) (M0 free cluster) | Managed MongoDB, reachable from Vercel |

Steps:

1. Create the Atlas cluster and a database user, and allow connections from anywhere (`0.0.0.0/0`), because Vercel's servers do not have fixed IP addresses.
2. Run `npm run seed` once from a local machine against the Atlas connection string, to load the data and build the indexes.
3. Import the GitHub repository into Vercel. It detects Next.js and needs no build configuration.
4. In the Vercel project settings, add the environment variables: `MONGODB_URI`, `AUTH_SECRET`, `APP_URL`, `CRON_SECRET`, `DAILY_API_KEY`, the Google keys if used, and the `AI_*` variables if a live AI model is used.
5. Deploy. Every later push to `main` redeploys automatically.

Also add `AUTH_SECRET` (and the Google keys, if used) in Vercel. For Google sign-in, add the deployed address's callback, `https://<your-domain>/api/auth/callback/google`, to the Google client's authorised redirect URIs. Also add `DAILY_API_KEY` for live video.

## Video demo

https://youtu.be/562JOBwNsII

## Code files

```
app/                        Pages and API routes (Next.js App Router)
  page.tsx                  Landing page (the only public page)
  (student)/                The signed-in student app, one shared layout:
    dashboard/              Overview
    explore/                Browse mentors
    consultants/[id]/       Mentor profile and booking
    discover/               Career Discovery: Pathy's questions, the result, then the chat
    opportunities/          Scholarships, fellowships, internships and jobs
    sessions/               Today, coming up and past sessions; join, cancel, rate
  session/[id]/             The live video session room (Daily)
  account/                  Account details; withdraw and delete
  signin/, signup/          Sign-in and sign-up
  welcome/                  Research consent, shown once after sign-up
  become-a-mentor/          Mentor application
  mentor/                   Mentor console: sessions, weekly hours and specific dates
  admin/                    Admin console: overview, research reports, mentor review, sessions, feedback, students
  api/
    discovery/              POST   run the discovery agent on a set of answers
    mentors/                GET    list consultants (sector, sort, search)
    mentors/[id]/           GET    one consultant
    mentors/[id]/slots/     GET    a consultant's open slots
    bookings/               POST   book a slot; GET a student's sessions (signed-in students only)
    auth/[...nextauth]/     Auth.js sign-in, sign-out and session
    register/               POST   create a student account
    consent/                POST   record research consent
    mentor/                 POST   apply; PUT weekly hours and specific dates; POST confirm or decline a booking
    admin/mentors/[id]/     POST   approve, reject, suspend or reinstate a mentor
    admin/opportunities/    POST   add, hide or refresh opportunity listings
    bookings/[id]/cancel/   POST   a student cancels a session
    bookings/[id]/rate/     POST   a student rates a past session
    sessions/[id]/join/     POST   get a pass into the video room (the booking's two people only)
    sessions/[id]/leave/    POST   record the call's timings from Daily
    pathy/                  POST   one reply from Pathy, the chatbot
    cron/opportunities/     GET    daily feed refresh (needs CRON_SECRET)
    password/forgot, reset  POST   forgot-password and reset
    account/delete/         POST   withdraw and delete an account
components/                 Interface components
  auth/                     Sign-in, sign-up and consent forms
  console/                  Mentor and admin console pieces; availability/ holds the parts of the availability editor
  brand/                    Pathy, the guide character
  landing/                  Landing page hero and sections
  consultant/               Consultant cards, sector filter, booking panel
  discover/                 Discovery chat, progress bar, results, the bridge section
  pathy/                    Pathy's discovery experience and chat
  sessions/                 Sessions list, video room, rating form
  account/, dashboard/, layout/, opportunities/, ui/
lib/
  ai/                       Discovery agent: prompt, AI provider, output validation, offline fallback
  booking/                  Slot generation, timezone handling, the availability hour grid
  matching/                 Interest vectors, cosine similarity, bridge ranking
  research/                 The verified resource catalogue (allow-list), participant codes, consent text
  opportunities/            RSS feed reading, deadline, type and sector rules
  video/                    The Daily client: rooms, passes, call records
  email/                    Sending email through Resend
  auth/                     Role guards and the password rule
  db/
    models/                 The twelve Mongoose models and their indexes
    queries/                The data layer: mentors, bookings, the bridge, access rules, feedback, admin views, research reports
    connect.ts              Database connection
  discovery/                The six questions and answer validation
  data.ts                   Sample content: seed data and the offline matcher's career profiles
scripts/
  seed.ts                   Loads the database and builds the indexes
  verify.ts                 Offline test suite
  verify-db.ts              Live database test suite
  report.ts                 Research reports
  make-admin.ts             Promotes an existing account to admin
tests/
  e2e/                      Browser tests (Playwright): journeys, privacy and layout in four browsers and devices
  performance/              Lighthouse speed and quality measurements
playwright.config.ts        The browsers and devices the browser tests run on
prompts/
  discovery.json            The versioned prompt specification: prompt, output contract, validators
  validate_prompt.py        Offline validator for the specification (no API key needed)
  fixtures/                 A known-good roadmap and a known-good refusal
docs/
  data-model.md             The MongoDB schema: collections, rules, indexes, access
  screenshots/              Screenshots used in this README
SETUP.md                    Database setup, checks, reports and the prompt validator
```

Main files to read first:

| File | What it shows |
| --- | --- |
| `lib/booking/slots.ts` | How open slots are generated from availability rules |
| `lib/db/queries/bookings.ts` | How a booking is created and how double-booking is handled |
| `lib/db/models/Booking.ts` | The booking schema and the unique index |
| `lib/db/queries/bridge.ts` | How a discovery result is matched to three mentors |
| `lib/matching/similarity.ts` | Cosine similarity and the bridge ranking, with the reasoning for the metric |
| `docs/data-model.md` | The whole schema, with the rules each check proves |
| `lib/ai/discovery.ts` | How the discovery agent runs and falls back to offline scoring |
| `components/consultant/BookingPanel.tsx` | The booking interface |

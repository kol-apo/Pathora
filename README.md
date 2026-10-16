# Pathora

Most AI career tools for students stop at advice. Pathora treats advice as incomplete until it reaches a person, and enforces that in its architecture rather than in its interface copy: every generated roadmap ends in a mandatory bridge to three vetted professionals in the recommended sector.

Pathora is a Next.js application on **MongoDB**. The same database holds the application's data and the research data the study collects. The schema is documented in [docs/data-model.md](docs/data-model.md), and the AI prompt is specified and validated in [prompts/](prompts/).

## Three architectural questions

| Question | Mechanism | Verified by |
| --- | --- | --- |
| What stops two students booking one slot? | Two layers. `createBooking()` regenerates the mentor's open slots and accepts only a real, free one. The unique index `one_active_booking_per_slot` then lets MongoDB accept only one active booking per mentor and start time, even if two requests pass the first check at the same instant. | `npm run verify:db`: five students book the same slot at once; exactly one succeeds and the rest get a clean "slot taken". |
| How are consultants matched, and why that metric? | `surfaceBridgeConsultants()` ranks approved consultants in the result's sector only, by cosine similarity between the student's interest vector and each consultant's, and records the top three. Cosine compares only the direction of interests, so a student who writes long answers is not scored as closer to everyone than one who writes short answers. | `npm run verify` (the ranking maths) and `npm run verify:db` (ranking against the live database matches an independent recalculation, the sector guard, the conversion funnel). |
| What stops one participant reading another's data? | MongoDB has no row-level security, so access rules live in the data layer: participant data is read only through functions that take the caller's identity. A student reads only their own results; a mentor reads a result only with a booking linked to it, and never sees the student's answers. Research events carry a pseudonymous `participantCode` and have no user field at all. | `npm run verify:db` (owner, other student, unbooked and booked mentor) and `npm run verify` (analytics events refuse any identifier field). |

Run the checks with `npm run verify` and `npm run verify:db`, the research reports with `npm run report`, and the prompt contract with `python prompts/validate_prompt.py`. [SETUP.md](SETUP.md) covers installation.

## Three design decisions worth reading first

1. **The model proposes; the database matches.** The language model decides direction: a sector, a five-axis interest vector, a phased plan, and the questions to ask a human. It never chooses which human. The server ranks consultants deterministically from the vector, so the same roadmap always surfaces the same consultants, and any match can be reproduced and audited without re-running the model. See `layer_1_identity` in [prompts/discovery.json](prompts/discovery.json) and `surfaceBridgeConsultants()` in [lib/db/queries/bridge.ts](lib/db/queries/bridge.ts).
2. **Hallucinated opportunities are structurally impossible, not just discouraged.** Programmes may only be named from a curated allow-list, the `VerifiedResource` collection. A post-generation validator rejects any roadmap that names a programme outside it, whether or not the programme exists. The database and the validator both load the list from one file, [lib/research/verified-resources.json](lib/research/verified-resources.json), so they cannot drift apart.
3. **Double-booking is defended twice, and the database has the final say.** Validation in code catches made-up or already-taken times; the unique index catches the race that validation cannot, two requests checking at the same instant. The second write fails inside MongoDB and becomes the handled `SLOT_TAKEN` response, so the student sees "Someone just booked that slot" rather than an error.

## Current state

| Component | State |
| --- | --- |
| Next.js application | Built. Explore, consultant profiles, booking with slot selection, and Career Discovery (a chat with the Pathora Guide) work, reading and writing MongoDB. |
| Data layer (MongoDB) | Built and tested: 11 collections, the bridge, access rules and research reports. `npm run verify` (178 checks) and `npm run verify:db` (26 checks) pass. |
| Sign-in and roles | Built with Auth.js: email and password, and Google once its keys are set. Sign-up creates a student, who agrees to the research consent and gets a participant code. Mentors join by applying; admins are promoted with `npm run make-admin`. |
| Mentor console (`/mentor`) | Built: application status, booking requests to confirm or decline, a weekly-hours editor, and profile links (LinkedIn, X, portfolio, publications, videos) shown on their public profile. Mentors apply at `/become-a-mentor`. |
| Admin console (`/admin`) | Built: platform counts and the research reports, and mentor review (approve with an interest profile, reject, suspend, reinstate). |
| `prompts/discovery.json` | Specified, and validated offline by `prompts/validate_prompt.py`. **No live generation yet:** no code calls the Claude API with this specification. |
| Discovery wired to the research data | **Not yet.** Career Discovery still uses its own prompt (`lib/ai/prompt.ts`), does not save results (that needs sign-in), and produces no interest vector, so the bridge cannot run from the app yet. The results page still shows sample consultants. |
| Live video | Not built. The data model already records session timing (`VideoSession`); the session room is still a mock-up. |
| Student dashboard | Shows the signed-in student's name, but its figures are still sample data. |
| Consent wording | Placeholder, marked as a draft on screen, until the approved consent form is added to `lib/research/consent.ts`. |
| Deployment | Not deployed. See [Deployment plan](#deployment-plan). |

## Known discrepancies

- **Two discovery prompts.** The application's live prompt is `lib/ai/prompt.ts` (version `app-discovery-v1`); the research specification is `prompts/discovery.json` (`discovery-v1.1`). Their output shapes differ until the application moves to the specification.
- **Retry counts.** `DiscoveryResult.retryCount` is recorded as 0 because the AI provider retries internally without reporting it yet.
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

### Requirements

- Node.js 18.17 or newer, with npm
- A MongoDB database. The free tier of [MongoDB Atlas](https://www.mongodb.com/atlas) is enough

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
| `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` | Only for a live AI model | Any service that uses the OpenAI chat format, such as Groq, OpenRouter, Gemini or Ollama |

The discovery questionnaire works without any AI key. With `AI_PROVIDER="mock"` it scores the answers offline, and the same offline scoring is the fallback if a live model fails.

### Checking that it works

```bash
npm run verify      # 192 offline checks: slots, timezones, matching, model rules, accounts, AI output. No database needed
npm run verify:db   # 26 live checks: double booking, the bridge, access rules, reports
npm run report      # research reports: bridge conversion, output validity, session completion
npm run make-admin -- you@example.com   # promote an existing account to admin
npm run build       # production build
```

## Designs

### Figma mockups

https://www.figma.com/design/xgHTY50iOunFJr3s896yQ0/Pathora?node-id=0-1&t=TDUUwpzVr3hUhNx9-1

### Screenshots of the app

Captured from the running app against a seeded database. The student, mentor and admin accounts are test accounts.

#### Public pages

**Landing page**

![Landing page](docs/screenshots/01-landing.png)

The full landing page, with how it works, the four sectors and student stories, is in [docs/screenshots/02-landing-full.png](docs/screenshots/02-landing-full.png).

**Explore consultants**

![Explore consultants](docs/screenshots/03-explore.png)

**Explore, filtered by sector**

![Explore filtered to Technology](docs/screenshots/04-explore-sector-filter.png)

#### Student

**Sign up**

![Sign up](docs/screenshots/05-sign-up.png)

**Research consent**, shown once after sign-up (the wording is still a draft)

![Research consent](docs/screenshots/06-consent.png)

**Career discovery: chatting with the Pathora Guide**

![Discovery chat](docs/screenshots/07-discovery-chat.png)

**Career discovery: reviewing the answers**

![Reviewing screen](docs/screenshots/08-discovery-reviewing.png)

**Career discovery: results**

![Discovery results](docs/screenshots/09-discovery-results.png)

The full results page, with the three-year roadmap and three consultants in the matched sector, is in [docs/screenshots/10-discovery-results-full.png](docs/screenshots/10-discovery-results-full.png).

**Consultant profile**

![Consultant profile](docs/screenshots/11-consultant-profile.png)

**Booking: choosing a day and time**, generated from the mentor's weekly hours and shown in the student's timezone

![Booking slot picker](docs/screenshots/12-booking-slot-picker.png)

**Booking: confirmation**

![Booking confirmed](docs/screenshots/13-booking-confirmed.png)

**Student dashboard** (sample data)

![Student dashboard](docs/screenshots/14-student-dashboard.png)

**Session room** (interface mock-up; live video is not built yet)

![Session room](docs/screenshots/21-session-room.png)

#### Mentor

**Applying as a mentor**, with LinkedIn, X and other links

![Mentor application](docs/screenshots/15-mentor-application.png)

**Setting weekly hours**

![Mentor availability](docs/screenshots/16-mentor-availability.png)

**Mentor console**: a student's request waiting to be confirmed. Mentors see the student's first name only.

![Mentor console](docs/screenshots/20-mentor-console.png)

**The approved mentor's public profile**

![Mentor public profile](docs/screenshots/19-mentor-public-profile.png)

#### Admin

**Overview**, with the study's measures

![Admin overview](docs/screenshots/17-admin-overview.png)

**Reviewing a mentor application** and setting the mentor's interest profile, which the bridge uses for matching

![Admin mentor review](docs/screenshots/18-admin-mentor-review.png)

### Database (MongoDB)

Eleven collections, defined as Mongoose models in `lib/db/models/`. Fields, validation rules, indexes and access rules are documented in [docs/data-model.md](docs/data-model.md).

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

**Open slots are calculated, not stored.** A consultant's availability is saved as weekly rules in their own timezone, for example "Monday, Wednesday and Friday, 09:00 to 12:00 and 14:00 to 17:00, Africa/Lagos". When a student opens the booking card, `lib/booking/slots.ts` walks the coming days, cuts each window into 45-minute sessions with a 15-minute gap, converts each time to UTC and removes anything that is too soon, too far ahead or already booked. The browser then shows each time in the student's own timezone.

**Double-booking is blocked twice.**

1. Before saving, the server regenerates the slots and checks that the requested time is a real, free slot. This rejects a made-up time such as 3am.
2. MongoDB has a unique index on consultant and start time that counts only active bookings. If two students pass the first check at the same instant, the database rejects the second save. The student sees "Someone just booked that slot" and a refreshed list of times.

A cancelled booking is no longer active, so its slot can be booked again.

## Deployment plan

The app is not deployed yet. The plan uses two free-tier services:

| Part | Service | Why |
| --- | --- | --- |
| Web app and API | [Vercel](https://vercel.com) | Built for Next.js. Pages and the `app/api` routes deploy together, with HTTPS and a preview URL for every push |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) (M0 free cluster) | Managed MongoDB, reachable from Vercel |

Steps:

1. Create the Atlas cluster and a database user, and allow connections from anywhere (`0.0.0.0/0`), because Vercel's servers do not have fixed IP addresses.
2. Run `npm run seed` once from a local machine against the Atlas connection string, to load the data and build the indexes.
3. Import the GitHub repository into Vercel. It detects Next.js and needs no build configuration.
4. In the Vercel project settings, add the environment variables: `MONGODB_URI`, `AUTH_SECRET`, the Google keys if used, and the `AI_*` variables if a live AI model is used.
5. Deploy. Every later push to `main` redeploys automatically.

Also add `AUTH_SECRET` (and the Google keys, if used) in Vercel. For Google sign-in, add the deployed address's callback, `https://<your-domain>/api/auth/callback/google`, to the Google client's authorised redirect URIs. Live video is planned with Whereby, with one room per booking.

## Video demo

https://youtu.be/562JOBwNsII

## Code files

```
app/                        Pages and API routes (Next.js App Router)
  page.tsx                  Landing page
  explore/                  Browse consultants
  consultants/[id]/         Consultant profile and booking
  discover/                 Career Discovery: chat with the Pathora Guide, then results
  dashboard/                Student dashboard
  session/[id]/             Session room
  signin/, signup/          Sign-in and sign-up
  welcome/                  Research consent, shown once after sign-up
  become-a-mentor/          Mentor application
  mentor/                   Mentor console: sessions and weekly hours
  admin/                    Admin console: overview, research reports, mentor review
  api/
    discovery/              POST   run the discovery agent on a set of answers
    mentors/                GET    list consultants (sector, sort, search)
    mentors/[id]/           GET    one consultant
    mentors/[id]/slots/     GET    a consultant's open slots
    bookings/               POST   book a slot; GET a student's sessions (signed-in students only)
    auth/[...nextauth]/     Auth.js sign-in, sign-out and session
    register/               POST   create a student account
    consent/                POST   record research consent
    mentor/                 POST   apply; PUT weekly hours; POST confirm or decline a booking
    admin/mentors/[id]/     POST   approve, reject, suspend or reinstate a mentor
components/                 Interface components
  auth/                     Sign-in, sign-up and consent forms
  console/                  Mentor and admin console pieces
  brand/                    The Pathora Guide character
  landing/                  Landing page hero and sections
  consultant/               Consultant cards, sector filter, booking panel
  discover/                 Discovery chat, progress bar, results
  dashboard/, layout/, opportunities/, ui/
lib/
  ai/                       Discovery agent: prompt, AI provider, output validation, offline fallback
  booking/                  Slot generation and timezone handling
  matching/                 Interest vectors, cosine similarity, bridge ranking
  research/                 The verified resource catalogue (allow-list)
  db/
    models/                 The eleven Mongoose models and their indexes
    queries/                Mentors, slots, bookings, the bridge, access rules, research reports
    connect.ts              Database connection
  discovery/                The six questions and answer validation
  data.ts                   Sample data, used for seeding and for pages not yet on the database
scripts/
  seed.ts                   Loads the database and builds the indexes
  verify.ts                 Offline test suite
  verify-db.ts              Live database test suite
  report.ts                 Research reports
  make-admin.ts             Promotes an existing account to admin
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

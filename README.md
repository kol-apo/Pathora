# Pathora

Most AI career tools for students stop at advice. Pathora treats advice as incomplete until it reaches a person, and enforces that in its architecture rather than in its interface copy: every generated roadmap ends in a mandatory bridge to three vetted professionals in the recommended sector.

This repository holds two things: the Next.js application (consultant browsing and booking, and the career discovery questionnaire), and the research data layer for the study, `schema.sql` and `prompts/`, each with its own test harness.

## Three architectural questions

| Question | Mechanism | Verified by |
| --- | --- | --- |
| What stops two students booking one slot? | Three independent layers. `book_consultation()` locks the slot row (`SELECT ... FOR UPDATE`). The partial unique index `bookings_one_live_booking_per_slot` allows one live booking per slot. The exclusion constraint `no_overlapping_slots` makes overlapping slots for one consultant impossible. | `tests/db/test_concurrency.sh`: two sessions race for one slot; then each layer is tested on its own. |
| How are consultants matched, and why that metric? | `surface_bridge_consultants()` ranks approved consultants in the roadmap's sector only, by cosine similarity between the student's vector and each consultant's vector, and records the top three. Cosine is magnitude-invariant, so a student who writes long answers is not scored as closer to everyone than a student who writes short ones; only the direction of their interests counts. | `tests/db/test_bridge.sh`: ranking, the under-staffed sector error, the sector guard on bridge bookings, and the conversion funnel. |
| What stops one participant reading another's data? | Row-level security on all 13 tables (28 policies). Questionnaire answers are readable only by their author. A consultant can read a roadmap only if a booking links them to it. Functions that cross ownership check the caller's identity. Research analytics carry a pseudonymous `participant_code`, never a student id. | `tests/db/test_rls.sh`: every check runs as the `authenticated` role with a JWT subject, as a Supabase request would. |

Run all three suites with `./demo.sh`, and the prompt contract with `python prompts/validate_prompt.py`. [SETUP.md](SETUP.md) covers installation.

## Three design decisions worth reading first

1. **The model proposes; the database matches.** The language model decides direction: a sector, a five-axis interest vector, a phased plan, and the questions to ask a human. It never chooses which human. The database ranks consultants deterministically from the vector, so the same roadmap always surfaces the same consultants, and any match can be reproduced and audited without re-running the model. See `layer_1_identity` in [prompts/discovery.json](prompts/discovery.json) and `surface_bridge_consultants()` in [schema.sql](schema.sql).
2. **Hallucinated opportunities are structurally impossible, not just discouraged.** Programmes may only be named from `verified_resources`, a curated allow-list in the database. A post-generation validator rejects any roadmap that names a programme outside it, whether or not the programme exists. The validator reads the allow-list straight from the `schema.sql` seed, so the prompt and the database cannot drift apart.
3. **Double-booking is defended three times over.** A row lock, a unique index and an exclusion constraint each prevent it alone. All three are present because a double booking is unrecoverable in front of a participant. Removing the lock in testing showed the unique index still holding: one booking survived, but the second student received a raw database error instead of the handled `SLOT_UNAVAILABLE`.

## Current state

| Component | State |
| --- | --- |
| Next.js application | Built. Explore, consultant profiles, booking with slot selection, and the discovery questionnaire work. Runs on MongoDB (`lib/db/`). |
| `schema.sql` (PostgreSQL / Supabase) | Written and tested: `./demo.sh` passes on local PostgreSQL 16. **Not yet deployed to Supabase.** |
| `prompts/discovery.json` | Specified, and validated offline by `prompts/validate_prompt.py`. **No live API generation yet:** no code calls the Claude API with this specification. |
| Application wired to `schema.sql` and `prompts/` | **Not yet.** The application still uses MongoDB and its own prompt in `lib/ai/prompt.ts`. Planned from Sprint 1. |
| Sign-in, admin vetting screen, live video | Not built. The schema already supports vetting (`consultants.status`, `approved_by`) and session timing (`video_sessions`). |
| Deployment | Not deployed. See [Deployment plan](#deployment-plan). |

## Known discrepancies

- **Stack.** The running application uses MongoDB; `schema.sql` targets PostgreSQL on Supabase. Until one is chosen and the other retired, booking and matching logic exists in both forms.
- **Two discovery prompts.** The application's live prompt is `lib/ai/prompt.ts`; the research specification is `prompts/discovery.json`. Their output shapes differ, so roadmaps produced by the application today carry no `prompt_version`.
- **`current role` versus `job_title`.** The ERD labels a consultants field "current role", but the column is `job_title`, because `CURRENT_ROLE` is a reserved word in PostgreSQL and fails to parse.
- **`bridge_recommendations` is not in the ERD.** It was added so bridge conversion is measured per roadmap rather than inferred from bookings.
- **Model identifier.** The specification asked for `claude-opus-4`, which is not a valid model ID. `prompts/discovery.json` uses `claude-opus-4-0`, the exact ID for Claude Opus 4, which is deprecated. Newer models do not accept `temperature`, so changing model means revisiting the determinism approach. See [prompts/README.md](prompts/README.md).
- **Resource URLs.** Where the exact programme page was not certain, `verified_resources.url` holds the organisation's homepage. Each needs checking before the study starts.

## Ethics

This repository contains no participant data. The only seeded data is a public catalogue of programmes. Test fixtures use synthetic users on the reserved `.invalid` domain and are removed by each test before it runs.

`analytics_events` carries `participant_code` and not `student_id`, so an export of the research dataset holds no direct identifier by construction: it cannot be joined back to a name or email without the separately protected `students` table. Sessions are not recorded, and the schema has no column that could hold a recording.

Under the data management plan in the ethics application, participant data must never enter version control. `.gitignore` excludes `data/`, `responses/`, `participants/`, `consent/`, and all `.csv` and `.xlsx` files.

## Running the application

The sections below cover the Next.js application. For the research schema and prompt harness, see [SETUP.md](SETUP.md).

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
| `AI_PROVIDER` | No | `mock` (default, offline, no key) or `openai-compatible` |
| `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` | Only for a live AI model | Any service that uses the OpenAI chat format, such as Groq, OpenRouter, Gemini or Ollama |

The discovery questionnaire works without any AI key. With `AI_PROVIDER="mock"` it scores the answers offline, and the same offline scoring is the fallback if a live model fails.

### Checking that it works

```bash
npm run verify      # 132 offline checks: slot generation, timezones, AI output validation. No database needed
npm run verify:db   # 12 live checks against your database, including two simultaneous bookings for one slot
npm run build       # production build
```

## Designs

### Figma mockups

https://www.figma.com/design/xgHTY50iOunFJr3s896yQ0/Pathora?node-id=0-1&t=TDUUwpzVr3hUhNx9-1

### Screenshots of the app

**Landing page**

![Landing page](docs/screenshots/01-landing.png)

**Explore consultants**

![Explore consultants](docs/screenshots/02-explore.png)

**Explore, filtered by sector**

![Explore filtered to Technology](docs/screenshots/03-explore-sector-filter.png)

**Consultant profile**

![Consultant profile](docs/screenshots/04-consultant-profile.png)

**Booking: choosing a day and time**

![Booking slot picker](docs/screenshots/05-booking-slot-picker.png)

**Booking: confirmation**

![Booking confirmed](docs/screenshots/06-booking-confirmed.png)

**Career discovery: a question**

![Discovery question](docs/screenshots/07-discover-question.png)

**Career discovery: reviewing the answers**

![Reviewing screen](docs/screenshots/08-discover-reviewing.png)

**Career discovery: results**

![Discovery results](docs/screenshots/09-discover-results.png)

The full results page, with the roadmap and the matched consultants, is in [docs/screenshots/10-discover-results-full.png](docs/screenshots/10-discover-results-full.png).

**Student dashboard** (sample data)

![Student dashboard](docs/screenshots/11-dashboard.png)

**Session room** (interface mock-up)

![Session room](docs/screenshots/12-session-room.png)

### Application database (MongoDB)

The running application stores its data in seven MongoDB collections, defined as Mongoose models in `lib/db/models/`. The research schema for PostgreSQL is [schema.sql](schema.sql), described above.

```mermaid
erDiagram
    User ||--o| StudentProfile : "has (role: student)"
    User ||--o| MentorProfile : "has (role: mentor)"
    MentorProfile ||--|| Availability : "publishes"
    MentorProfile ||--o{ Booking : "receives"
    User ||--o{ Booking : "makes (as student)"
    User ||--o{ DiscoveryResult : "saves"

    User {
        string name
        string email
        string role
    }
    StudentProfile {
        string university
        string field
        number year
        string careerMatch
        string matchedSector
    }
    MentorProfile {
        string displayName
        string role
        string company
        string sector
        number experience
        string timezone
        boolean vetted
        number ratingAvg
        number sessionCount
    }
    Availability {
        array weekly
        array exceptions
        number sessionMinutes
        number bufferMinutes
        number leadTimeHours
        number horizonDays
    }
    Booking {
        string topic
        date startsAt
        date endsAt
        string status
        boolean active
    }
    DiscoveryResult {
        object answers
        object primary
        array secondary
        string provider
    }
    Opportunity {
        string title
        string organisation
        string type
        string sector
        date deadline
    }
```

`Opportunity` stands alone: it lists fellowships, internships and similar openings by sector.

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
4. In the Vercel project settings, add the environment variables: `MONGODB_URI`, and the `AI_*` variables if a live AI model is used.
5. Deploy. Every later push to `main` redeploys automatically.

Before the deployed site can take bookings, sign-in has to be built (planned with Auth.js). The demo student used in development is deliberately switched off in production, so a deployed copy will show consultants and open times but answer "Sign in to book a session". Live video is planned with Whereby, with one room per booking.

## Video demo

https://docs.google.com/document/d/1gMY85q9OEPCydZcQWp3O5KaEkkg3dY5oFVZUjwY3qaY/edit?usp=sharing

## Code files

```
app/                        Pages and API routes (Next.js App Router)
  page.tsx                  Landing page
  explore/                  Browse consultants
  consultants/[id]/         Consultant profile and booking
  discover/                 Career discovery questionnaire and results
  dashboard/                Student dashboard
  session/[id]/             Session room
  api/
    discovery/              POST   run the discovery agent on a set of answers
    mentors/                GET    list consultants (sector, sort, search)
    mentors/[id]/           GET    one consultant
    mentors/[id]/slots/     GET    a consultant's open slots
    bookings/               POST   book a slot; GET a student's sessions
components/                 Interface components
  consultant/               Consultant cards, sector filter, booking panel
  discover/                 Question cards, progress bar, results
  dashboard/, layout/, opportunities/, ui/
lib/
  ai/                       Discovery agent: prompt, AI provider, output validation, offline fallback
  booking/                  Slot generation and timezone handling
  db/
    models/                 The seven Mongoose models and their indexes
    queries/                Database queries for consultants, slots and bookings
    connect.ts              Database connection
  discovery/                The questionnaire's questions and answer validation
  data.ts                   Sample data, used for seeding and for pages not yet on the database
scripts/
  seed.ts                   Loads the database and builds the indexes
  verify.ts                 Offline test suite
  verify-db.ts              Live database test suite
docs/screenshots/           Screenshots used in this README

schema.sql                  Research schema for PostgreSQL / Supabase: tables, indexes, functions, RLS, views, seeds
demo.sh                     Builds schema.sql in a fresh database and runs the three database test suites
tests/db/
  test_concurrency.sh       Two students race for one slot; each double-booking layer tested alone
  test_bridge.sh            Roadmap-to-consultant matching and the conversion funnel
  test_rls.sh               Row-level security: what each participant can and cannot see
prompts/
  discovery.json            The versioned prompt specification: prompt, output contract, validators
  validate_prompt.py        Offline validator for the specification (no API key needed)
  fixtures/                 A known-good roadmap and a known-good refusal
SETUP.md                    How to run demo.sh and the prompt validator
```

Main files to read first:

| File | What it shows |
| --- | --- |
| `lib/booking/slots.ts` | How open slots are generated from availability rules |
| `lib/db/queries/bookings.ts` | How a booking is created and how double-booking is handled |
| `lib/db/models/Booking.ts` | The booking schema and the unique index |
| `lib/ai/discovery.ts` | How the discovery agent runs and falls back to offline scoring |
| `components/consultant/BookingPanel.tsx` | The booking interface |

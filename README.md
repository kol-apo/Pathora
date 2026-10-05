# Pathora

## Description

Pathora is a web platform that helps African university students find a career direction and then talk to someone already working in it. It does two things:

1. **Career discovery.** A six-question questionnaire about a student's interests, strengths and goals. An AI agent turns the answers into a matched career path, an explanation of why it fits, a year-by-year roadmap and three consultants from the matched sector.
2. **Consultant booking.** Students browse vetted professionals across four sectors (Entrepreneurship, Technology, Finance, Creative), view a consultant's open times and book a free 45-minute session. The system makes it impossible for two students to book the same slot.

**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, MongoDB with Mongoose, Zod.

### What works today

| Feature | State |
| --- | --- |
| Career discovery questionnaire and AI results | Working, served by `/api/discovery` |
| Explore consultants, with sector filter, search and sort | Working, reads from MongoDB |
| Consultant profile | Working, reads from MongoDB |
| Booking: open slots, slot picker, confirmation, double-booking protection | Working, writes to MongoDB |
| Landing page, student dashboard, session room | Interface built, still showing sample data |
| Sign-in | Not built yet. Bookings are made as a seeded demo student |
| Live video | Not built yet. The session room is an interface mock-up |

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

### Database schema

Seven MongoDB collections, defined as Mongoose models in `lib/db/models/`.

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

### How booking works

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
```

Main files to read first:

| File | What it shows |
| --- | --- |
| `lib/booking/slots.ts` | How open slots are generated from availability rules |
| `lib/db/queries/bookings.ts` | How a booking is created and how double-booking is handled |
| `lib/db/models/Booking.ts` | The booking schema and the unique index |
| `lib/ai/discovery.ts` | How the discovery agent runs and falls back to offline scoring |
| `components/consultant/BookingPanel.tsx` | The booking interface |

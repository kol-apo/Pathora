# Pathora

A web-based career consultancy and discovery platform for African students. Two core features: a consultant booking system and an AI-powered career discovery questionnaire.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Mongoose**, and **Lucide icons**.

Status: the UI reads from mock data in `lib/data.ts`. The data layer, booking
logic, and discovery agent are built and tested but not yet wired to auth or a
live database — see *Architecture* below.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional; everything runs without it
npm run dev        # http://localhost:3000
npm run build      # production build
npm run verify     # offline suite — no DB, no network, no API keys
```

With a `MONGODB_URI` set:

```bash
npm run seed             # populate from lib/data.ts (add -- --fresh to reset)
npm run verify:db        # live checks, incl. the concurrent-booking race
```

`npm run seed` also runs `syncIndexes()`. That step is required, not cosmetic:
the partial unique index on `{ mentor, startsAt }` *is* the double-booking
guarantee, and if it is not physically built in MongoDB, concurrent bookings
will both succeed silently.

## Architecture

| Area | Where | State |
| --- | --- | --- |
| Data model | `lib/db/models/` | Mongoose schemas + indexes. Needs `MONGODB_URI`. |
| Data access | `lib/db/queries/` | Mentors, slots, bookings. Identity is a parameter. |
| Booking logic | `lib/booking/` | Slot generation, conflict detection, timezones. Pure functions. |
| Discovery agent | `lib/ai/` | Provider-agnostic. Runs offline by default. |
| API | `app/api/` | discovery, mentors, slots, bookings. |
| Auth | — | Not built. Planned: Auth.js + MongoDB adapter. |
| Video | — | Not built. Planned: Whereby Embed, room per booking. |

### Booking safety

`createBooking` has two independent guards, and both are needed. `findSlot`
proves the requested time is inside the mentor's published availability — that
catches a client posting an arbitrary timestamp. The partial unique index
catches the race `findSlot` cannot: two requests validating microseconds apart
before either writes. The second write fails with error 11000 and surfaces as
`SLOT_TAKEN` (HTTP 409), not a 500.

> **Auth gap:** `app/api/bookings/route.ts` currently reads `studentId` from the
> request body. That is a placeholder — it lets anyone book as anyone. Replace
> `resolveStudentId()` with a session lookup when auth lands.

### Discovery agent

`AI_PROVIDER` selects the engine. `mock` is deterministic, needs no key, and
scores all six answers offline — it is also the fallback whenever a live
provider fails, so the questionnaire never dead-ends. `openai-compatible`
targets any service speaking the OpenAI `/chat/completions` shape (Groq,
OpenRouter, Gemini's compat endpoint, Ollama, OpenAI). Swapping models is a
change of environment variables, not code.

## Pages

| Route | Description |
| --- | --- |
| `/` | Landing page — hero, how it works, sectors, features, testimonials |
| `/explore` | Consultant explore page with search, sticky sector filters, and sorting |
| `/consultants/[id]` | Consultant profile with sticky booking card and related consultants |
| `/discover` | 6-step career discovery questionnaire → AI-style results with roadmap and consultant bridge |
| `/dashboard` | Student dashboard — stats, upcoming session, recommendations, opportunities |
| `/session/[id]` | Video session room with timer, call controls, and notes sidebar |

## Structure

```
app/              — routes (App Router) and API handlers
components/       — ui primitives, layout, consultant, discover, opportunities, dashboard
lib/
  ai/             — discovery agent: provider seam, prompt, output validation
  booking/        — slot generation and timezone handling (pure)
  db/             — Mongoose connection and models (server-only)
  discovery/      — questionnaire definition, scoring, input validation
  data.ts         — mock data still backing the UI
scripts/verify.ts — offline test suite
```

`lib/db/` is server-only — never import it from a client component.

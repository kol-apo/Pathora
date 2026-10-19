# Setting up the data layer and the checks

This guide covers the database, the test suites, the research reports, and the prompt validator. For the app itself, see the [README](README.md#running-the-application).

Pathora runs on **MongoDB**, through the Mongoose models in `lib/db/models/`. The readable schema is [docs/data-model.md](docs/data-model.md).

## 1. A MongoDB database

You need a MongoDB 7 or newer database. Either option works.

**MongoDB Atlas (recommended, free).**
1. Create a free **M0** cluster at mongodb.com/atlas.
2. Under **Database & Network Access**, add a database user, and add `0.0.0.0/0` to the IP access list. Without that entry, connections fail whenever your IP address changes.
3. Click **Connect**, then **Drivers**, and copy the connection string.

**Local, with Docker.**
```bash
docker run --name pathora-mongo -p 27017:27017 -d mongo:7
```
The connection string is then `mongodb://localhost:27017/pathora`.

## 2. Configure

```bash
cp .env.example .env.local
```

Set `MONGODB_URI` in `.env.local`. For Atlas, put the database name `pathora` before the `?`:

```
MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/pathora?retryWrites=true&w=majority&appName=Cluster0"
```

Also set `AUTH_SECRET` to a long random string; `.env.example` has a command that generates one. For "Continue with Google", add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` from Google Cloud Console (redirect URI `http://localhost:3000/api/auth/callback/google`).

`.env.local` is gitignored. The app and the scripts all read it.

## 3. Load the data

```bash
npm install
npm run seed            # add -- --fresh to wipe every collection first
```

This creates:
- an admin;
- 12 approved mentors, three per sector, each with weekly hours and an interest vector;
- the demo student;
- 6 opportunities;
- the 12 verified resources.

It also builds every index. That step is required: the unique index on bookings is what stops two students taking one slot, and it only works once it exists in the database.

## 4. Run the checks

```bash
npm run verify          # 279 offline checks; no database, network or API key needed
npm run verify:db       # 72 checks against the database in MONGODB_URI
python3 prompts/validate_prompt.py   # 36 checks on the prompt specification
```

For the prompt validator, run `pip install -r prompts/requirements.txt` once first.

`verify:db` creates its own test records, tagged with a run marker, and deletes them at the end, so it is safe to run against a seeded database. It never touches the seeded data.

## 5. Become an admin

Sign up on the site with your own email, then promote that account:

```bash
npm run make-admin -- you@example.com
```

Sign out and back in. **Dashboard** now opens the admin console at `/admin`, where mentor applications are reviewed.

### Opportunities

```bash
npm run fetch-opportunities
```

Reads the RSS feeds of Opportunities for Africans, Opportunity Desk, Opportunities for Youth and Youth Opportunities Hub, and stores open listings (matched by link, so running it again never duplicates anything; listings already closed are skipped). Run it whenever you like; once deployed, a scheduler calls `/api/cron/opportunities` with `Authorization: Bearer <CRON_SECRET>`. ALU SPD has no feed: add its listings under **Opportunities** in the admin console, where you can also take any listing down or read the feeds on demand.

### Partner mentors (JointHub)

```bash
npm run import-jointhub                                # approved by the first admin
npm run import-jointhub -- --approved-by you@example.com
```

Lists the nine mentors from JointHub's directory ([scripts/data/jointhub-mentors.ts](scripts/data/jointhub-mentors.ts)), with their photos from `public/mentors/`. They appear on Explore with a JointHub mark. None take bookings until their weekly hours are added, and the bridge never recommends a mentor who cannot be booked. Each sector and interest profile is Pathora's provisional reading of the directory entry; check them under **Mentors → Approved** in the admin console. Running it again refreshes the directory fields and keeps everything else.

## 6. Research reports

```bash
npm run report
```

Prints the bridge conversion funnel per sector, output validity per prompt version, and session completion. It is read-only. See [docs/data-model.md](docs/data-model.md#research-reports).

## What each check proves

### `npm run verify` (offline)

| Area | What it proves |
| --- | --- |
| Slots and timezones | Open times are generated correctly from weekly hours, across timezones and daylight-saving changes |
| Interest vectors | Every possible set of answers gives a valid vector; the same answers always give the same vector; technical, creative and leadership answers peak on the right axis |
| Cosine similarity | Identical interests score 1; a long-answer student and a short-answer student with the same interests score the same; a zero vector gives no score instead of dividing by zero |
| Bridge ranking | The top three are returned nearest first; ties break the same way every time; mentors without a vector are left out |
| Mentor approval | An approval must name the admin; `vetted` cannot be set by hand; vectors must be exactly 5 numbers from 0 to 1 |
| Provenance | A discovery result without a prompt version is rejected |
| Bridge records | A bridge booking must name its result; ranks stop at 3; a booking cannot come before the view |
| Research privacy | Analytics events have no user field and refuse any extra field; video sessions have no recording field |
| AI output | Discovery output is validated, and the offline fallback always produces a result |

### `npm run verify:db` (live database)

| Area | What it proves |
| --- | --- |
| Double booking | The unique index exists; five students booking one slot at once gives exactly one booking, and the other four get a clean "slot taken" |
| Slots | A cancelled booking frees its slot; a taken slot stops being offered; a 3am booking is refused |
| The bridge | A result surfaces exactly three approved mentors in its own sector, ranked exactly as an independent recalculation predicts; a repeat call returns the same three; another student cannot surface it |
| Bridge bookings | Booking a mentor from another sector, or one not among the three, through the bridge is refused; a valid bridge booking stamps `viewedAt` (if missing) and `bookedAt`; the funnel report counts it |
| Cancelling | Another student cannot cancel a session; a started session cannot be cancelled; cancelling frees the slot at once; the bridge still counts the booking it led to |
| Saving a discovery | The stored result carries the vector calculated from its answers, is surfaced with three mentors straight away, and becomes the student's latest result; a visitor with the same answers sees the same three in the same order |
| Access | The owner can read a result. Another student cannot. A mentor surfaced but not booked cannot. The booked mentor can, but never sees the student's answers |
| Research events | An event is stored under the participant code with no user field; a student's events are filed under their own code with no ids in the payload; a student who has not consented is not recorded |

If any sector has fewer than three approved mentors, `verify:db` also checks that the bridge refuses with `INSUFFICIENT_CONSULTANTS`. With the standard seed every sector has three, so this case is covered offline instead.

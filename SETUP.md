# Setting up the research schema and test harness

This guide covers `schema.sql`, `demo.sh` and `prompts/validate_prompt.py`. To run the Next.js application itself, see the [README](README.md#running-the-application).

You need:

- **PostgreSQL 16** (15 or newer works: the views use `security_invoker`) and its `psql` client.
- **bash**: built in on macOS and Linux; on Windows use Git Bash or WSL.
- **Python 3.9+** with `jsonschema`, for the prompt validator only.

Pick one of the five paths below, then run:

```bash
./demo.sh                            # builds the schema from scratch and runs all three suites
python3 prompts/validate_prompt.py   # validates the prompt specification; no database needed
```

`demo.sh` drops and recreates the target database (default name `pathora`). It refuses to drop an existing database that does not look like a previous Pathora demo database, unless you set `PATHORA_FORCE_DROP=1`. Point it at a dedicated database, never one holding real participant data.

## Path 1: Docker (any operating system)

```bash
docker run --name pathora-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
export PGPASSWORD=postgres
./demo.sh
```

`demo.sh` needs a `psql` client on your machine. Without one, run everything inside the container instead:

```bash
docker cp . pathora-pg:/pathora
docker exec -it -w /pathora pathora-pg bash ./demo.sh
```

## Path 2: macOS with Homebrew

```bash
brew install postgresql@16
brew services start postgresql@16
export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
export PGUSER="$(whoami)"     # Homebrew creates a superuser named after you, not "postgres"
./demo.sh
```

## Path 3: Ubuntu or WSL

```bash
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16
sudo service postgresql start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
export PGPASSWORD=postgres
./demo.sh
```

If `apt` cannot find `postgresql-16`, add the PostgreSQL project's apt repository first (see postgresql.org/download/linux/ubuntu), or use the version your distribution ships, provided it is 15 or newer.

## Path 4: Windows (Git Bash)

Install PostgreSQL 16 with the EDB installer from postgresql.org, which includes `psql` and the required extensions. Then, in Git Bash:

```bash
export PATH="/c/Program Files/PostgreSQL/16/bin:$PATH"
export PGPASSWORD='the password you chose in the installer'
bash demo.sh
```

On Windows, start the scripts with `bash demo.sh` rather than `./demo.sh`, because Windows does not keep the executable bit. If another PostgreSQL is already using port 5432, set `PGPORT` to the port the installer chose.

## Path 5: Supabase SQL Editor

1. Open your project's **SQL Editor**, paste the whole of `schema.sql`, and run it. It detects that Supabase already provides the `auth` schema and the `authenticated` and `anon` roles, and skips its local stand-ins.
2. Running it a second time is safe; every statement is idempotent.

The SQL Editor runs one session at a time, so **`test_concurrency.sh` cannot run there**: it needs two sessions open at once. To run the test suites against Supabase, connect from your machine with the database connection details from **Project Settings → Database**:

```bash
export PGHOST=db.<project-ref>.supabase.co PGPORT=5432 PGUSER=postgres PGPASSWORD='...' PGDATABASE=postgres
bash tests/db/test_bridge.sh
bash tests/db/test_rls.sh
bash tests/db/test_concurrency.sh
```

Do not run `demo.sh` against Supabase: it drops and recreates the database.

## Environment variables

Every script reads the standard PostgreSQL variables, so the same commands work with Docker, a local install or a remote server.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PGHOST` | `localhost` | Server host |
| `PGPORT` | `5432` | Server port |
| `PGUSER` | `postgres` | Role to connect as. Must be able to create databases and roles. |
| `PGDATABASE` | `pathora` | Database that `demo.sh` recreates and the tests run in |
| `PGPASSWORD` | none | Password, if the server requires one |
| `PGMAINTDB` | `postgres` | Database `demo.sh` connects to while dropping and recreating `PGDATABASE` |
| `PATHORA_FORCE_DROP` | unset | Set to `1` to let `demo.sh` drop a database that does not look like a Pathora demo database |

## The prompt validator

```bash
pip install -r prompts/requirements.txt
python3 prompts/validate_prompt.py
```

It needs no API key and makes no network call. It reads `prompts/discovery.json`, the fixtures in `prompts/fixtures/`, and the resource catalogue from the seed in `schema.sql`. What it proves is described in [prompts/README.md](prompts/README.md).

## What each test proves

### `test_concurrency.sh`: two students cannot book one slot

Amara opens a transaction, books a slot and holds it for two seconds before committing. Kwame requests the same slot 0.3 seconds later. Every line is prefixed `[Amara]` or `[Kwame]` and stamped with the database server's clock, and the two sessions' output is merged in time order, so the interleaving is shown as it happened:

```
22:48:52.312  [Amara] BEGIN
22:48:52.315  [Amara] booked the slot: booking 00a8ae40-...
22:48:52.347  [Amara] holding the row lock for 2 seconds...
22:48:52.671  [Kwame] requesting the same slot (waits on the row lock)
22:48:54.358  [Amara] still holding, about to commit
22:48:54.360  [Amara] COMMIT: lock released
22:48:54.362  [Kwame] SLOT_UNAVAILABLE: slot e0000000-... is no longer available
```

Kwame's request waits on Amara's row lock for about 1.7 seconds and is refused within milliseconds of her commit. Afterwards exactly one booking exists and the slot is `booked`.

The double-booking defence has three layers, and the suite then tests each one alone:

| Layer | Mechanism | What the test does |
| --- | --- | --- |
| Procedural | `book_consultation()` locks the slot row with `SELECT ... FOR UPDATE`, so a second caller waits, re-reads the row and sees it taken | The race above |
| Declarative | The partial unique index `bookings_one_live_booking_per_slot` allows one non-cancelled booking per slot, however the row is written | Inserts a second booking directly, bypassing the function; the index rejects it |
| Structural | The exclusion constraint `no_overlapping_slots` stops one consultant having two overlapping slots, so the same hour cannot exist twice | Inserts an overlapping slot; the constraint rejects it |

Any one layer is enough on its own. All three exist because a double booking cannot be fixed once two students arrive for one call. The last check cancels the booking and books the slot again, proving cancellation releases it.

### `test_bridge.sh`: every roadmap reaches three people in its sector

It seeds four Technology consultants with different vectors, and only two Finance consultants.

- The Technology roadmap surfaces exactly three Technology consultants, ranked by cosine similarity, with the two closest vectors first.
- The Finance roadmap raises `INSUFFICIENT_CONSULTANTS` instead of quietly returning two.
- A bridge booking of a Finance consultant against the Technology roadmap raises `BRIDGE_SECTOR_MISMATCH`.
- A valid bridge booking stamps `booked_at` on the recommendation.
- `v_bridge_funnel` reports the conversion rate per sector: 100% for Technology, 0% for Finance.

### `test_rls.sh`: one participant cannot see another's data

Every check runs as the `authenticated` role with a JWT subject set, which is exactly how Supabase runs a signed-in user's request.

- Student A sees 1 of the 2 roadmaps: their own.
- Student B sees none of student A's questionnaire answers.
- A consultant with no booking sees no roadmaps.
- Student A's attempt to insert a roadmap for student B is rejected by row-level security.
- The approved consultant is visible in the directory; a pending one is not.

Two further checks guard against false passes:

- **Positive control:** after a booking, the consultant sees exactly that one roadmap, so the "sees 0" result above is not vacuous.
- **Approval guard:** a pending consultant can edit their profile but cannot approve themselves.

#!/usr/bin/env bash
# =============================================================================
# test_concurrency.sh - two students race for one consultant slot.
#
# Amara opens a transaction, books the slot, and holds the row lock for two
# seconds before committing. Kwame asks for the same slot 0.3 seconds later.
# Kwame's call must block on the lock, then fail with SLOT_UNAVAILABLE.
# Exactly one booking may exist afterwards.
#
# It then tests each layer of the double-booking defence on its own:
# the unique index (declarative), the exclusion constraint (structural), and
# that cancelling releases the slot for rebooking.
# =============================================================================
set -uo pipefail

PGHOST="${PGHOST:-localhost}"; PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"; PGDATABASE="${PGDATABASE:-pathora}"
export PGHOST PGPORT PGUSER PGDATABASE
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
PSQL="psql -X -q -t -A"

FAILED=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAILED=1; }
# One value from one statement. tr strips the CR that psql.exe adds on Windows.
q() { $PSQL -v ON_ERROR_STOP=1 -c "$1" | tr -d '\r'; }
# Run SQL that is expected to fail; succeed if the error output matches $2.
expect_error() {
  local out
  out=$($PSQL -c "$1" 2>&1 | tr -d '\r')
  if grep -q "$2" <<<"$out"; then return 0; fi
  printf '        expected an error matching "%s", got: %s\n' "$2" "${out:-<no error>}"
  return 1
}

ADMIN=a0000000-0000-4000-8000-000000000001
CONSULTANT=c0000000-0000-4000-8000-000000000001
AMARA=50000000-0000-4000-8000-00000000000a
KWAME=50000000-0000-4000-8000-00000000000b
SLOT=e0000000-0000-4000-8000-000000000001

# --- Clear prior test state (FK-safe order, test users only) -----------------
$PSQL -v ON_ERROR_STOP=1 <<'SQL'
CREATE TEMP TABLE t AS SELECT id FROM auth.users WHERE email LIKE '%@test.pathora.invalid';
DELETE FROM analytics_events WHERE participant_code LIKE 'TEST-%';
DELETE FROM video_sessions WHERE booking_id IN (
  SELECT id FROM bookings WHERE student_id IN (SELECT id FROM t) OR consultant_id IN (SELECT id FROM t));
DELETE FROM bookings WHERE student_id IN (SELECT id FROM t) OR consultant_id IN (SELECT id FROM t);
DELETE FROM bridge_recommendations WHERE consultant_id IN (SELECT id FROM t)
  OR roadmap_id IN (SELECT id FROM roadmaps WHERE student_id IN (SELECT id FROM t));
DELETE FROM consultant_slots WHERE consultant_id IN (SELECT id FROM t);
DELETE FROM availability WHERE consultant_id IN (SELECT id FROM t);
DELETE FROM questionnaire_responses WHERE student_id IN (SELECT id FROM t);
DELETE FROM roadmaps WHERE student_id IN (SELECT id FROM t);
DELETE FROM opportunities WHERE posted_by IN (SELECT id FROM t);
DELETE FROM consultants WHERE id IN (SELECT id FROM t);
DELETE FROM students WHERE id IN (SELECT id FROM t);
DELETE FROM admins WHERE id IN (SELECT id FROM t);
DELETE FROM auth.users WHERE id IN (SELECT id FROM t);
SQL

# --- Fixtures ----------------------------------------------------------------
$PSQL -v ON_ERROR_STOP=1 <<SQL
INSERT INTO auth.users (id, email) VALUES
  ('$ADMIN',      'admin@test.pathora.invalid'),
  ('$CONSULTANT', 'consultant@test.pathora.invalid'),
  ('$AMARA',      'amara@test.pathora.invalid'),
  ('$KWAME',      'kwame@test.pathora.invalid');

INSERT INTO admins (id, full_name, email) VALUES
  ('$ADMIN', 'Test Admin', 'admin@test.pathora.invalid');

INSERT INTO students (id, full_name, email, country, year_of_study, participant_code) VALUES
  ('$AMARA', 'Amara Test', 'amara@test.pathora.invalid', 'Nigeria', 3, 'TEST-AMARA'),
  ('$KWAME', 'Kwame Test', 'kwame@test.pathora.invalid', 'Ghana',   2, 'TEST-KWAME');

INSERT INTO consultants (id, full_name, email, sector, bio, years_experience, job_title,
                         organisation, country, status, approved_by, approved_at, code_of_conduct_ok)
VALUES ('$CONSULTANT', 'Test Consultant', 'consultant@test.pathora.invalid', 'Technology',
        'Backend engineer who has shipped payment systems for African fintech teams.',
        8, 'Staff Engineer', 'Test Org', 'Rwanda', 'approved', '$ADMIN', now(), true);

INSERT INTO consultant_slots (id, consultant_id, starts_at, ends_at) VALUES
  ('$SLOT', '$CONSULTANT',
   date_trunc('hour', now()) + interval '2 days',
   date_trunc('hour', now()) + interval '2 days 45 minutes');
SQL

echo "  Two sessions race for slot $SLOT (server timestamps, merged in time order):"

# --- The race ----------------------------------------------------------------
# Each session's output only reaches the terminal when its process exits, so
# printing it live would show the sessions in finishing order, not the order
# things happened. Instead every line carries the server's clock_timestamp(),
# and the two logs are merged and sorted once both sessions finish.
LOG_A=$(mktemp); LOG_B=$(mktemp)
TS="to_char(clock_timestamp(), 'HH24:MI:SS.MS')"

(
$PSQL <<SQL 2>&1 | tr -d '\r' | sed -E 's/^NOTICE: +//; s/^([0-9:.]+) /\1  [Amara] /' > "$LOG_A"
SELECT $TS || ' BEGIN';
BEGIN;
SELECT $TS || ' booked the slot: booking ' || book_consultation('$AMARA', '$SLOT');
SELECT $TS || ' holding the row lock for 2 seconds...';
SELECT $TS || ' still holding, about to commit' FROM pg_sleep(2);
COMMIT;
SELECT $TS || ' COMMIT: lock released';
SQL
) &

sleep 0.3

(
$PSQL <<SQL 2>&1 | tr -d '\r' | sed -E 's/^NOTICE: +//; s/^([0-9:.]+) /\1  [Kwame] /' > "$LOG_B"
SET client_min_messages = notice;
SELECT $TS || ' requesting the same slot (waits on the row lock)';
DO \$race\$
BEGIN
  PERFORM book_consultation('$KWAME', '$SLOT');
  RAISE NOTICE '% booked the slot', $TS;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '% %', $TS, SQLERRM;
END
\$race\$;
SQL
) &

wait
sort "$LOG_A" "$LOG_B" | sed 's/^/    /'
echo

# --- Assertions --------------------------------------------------------------
n=$(q "SELECT count(*) FROM bookings WHERE slot_id = '$SLOT'")
[ "$n" = "1" ] && pass "exactly one booking exists for the slot" \
                || fail "exactly one booking exists for the slot (found $n)"

status=$(q "SELECT status FROM consultant_slots WHERE id = '$SLOT'")
[ "$status" = "booked" ] && pass "slot status is 'booked'" \
                          || fail "slot status is 'booked' (found $status)"

winner=$(q "SELECT student_id FROM bookings WHERE slot_id = '$SLOT'")
[ "$winner" = "$AMARA" ] && pass "the first caller (Amara) holds the booking" \
                          || fail "the first caller (Amara) holds the booking (found $winner)"

grep -q "SLOT_UNAVAILABLE" "$LOG_B" && pass "the second caller (Kwame) received SLOT_UNAVAILABLE" \
                                     || fail "the second caller (Kwame) received SLOT_UNAVAILABLE"

echo
echo "  Each defence layer on its own:"

# Declarative layer: bypass the function and insert a second live booking.
expect_error "INSERT INTO bookings (student_id, consultant_id, slot_id)
              VALUES ('$KWAME', '$CONSULTANT', '$SLOT')" "bookings_one_live_booking_per_slot" \
  && pass "declarative: a direct second booking is rejected by the unique index" \
  || fail "declarative: a direct second booking is rejected by the unique index"

# Structural layer: an overlapping slot for the same consultant cannot exist.
expect_error "INSERT INTO consultant_slots (consultant_id, starts_at, ends_at)
              SELECT consultant_id, starts_at + interval '15 minutes', ends_at + interval '15 minutes'
              FROM consultant_slots WHERE id = '$SLOT'" "no_overlapping_slots" \
  && pass "structural: an overlapping slot is rejected by the exclusion constraint" \
  || fail "structural: an overlapping slot is rejected by the exclusion constraint"

# Cancellation releases the slot, and the partial index then allows a rebooking.
BOOKING=$(q "SELECT id FROM bookings WHERE slot_id = '$SLOT'")
q "SELECT cancel_booking('$BOOKING', '$AMARA')" >/dev/null
released=$(q "SELECT status FROM consultant_slots WHERE id = '$SLOT'")
rebooked=$($PSQL -c "SELECT book_consultation('$KWAME', '$SLOT')" 2>&1 | tr -d '\r')
live=$(q "SELECT count(*) FROM bookings WHERE slot_id = '$SLOT' AND status <> 'cancelled'")
total=$(q "SELECT count(*) FROM bookings WHERE slot_id = '$SLOT'")
if [ "$released" = "available" ] && [ "$live" = "1" ] && [ "$total" = "2" ]; then
  pass "cancelling releases the slot and it can be rebooked (1 live, 1 cancelled)"
else
  fail "cancelling releases the slot and it can be rebooked (slot=$released live=$live total=$total: $rebooked)"
fi

rm -f "$LOG_A" "$LOG_B"
exit $FAILED

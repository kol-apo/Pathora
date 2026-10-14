#!/usr/bin/env bash
# =============================================================================
# test_bridge.sh - the mandatory bridge from a roadmap to three consultants.
#
# Seeds four approved Technology consultants with differing profile vectors and
# only two approved Finance consultants (Finance is deliberately under-staffed),
# plus one Technology and one Finance roadmap for the same student.
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
q() { $PSQL -v ON_ERROR_STOP=1 -c "$1" | tr -d '\r'; }
expect_error() {
  local out
  out=$($PSQL -c "$1" 2>&1 | tr -d '\r')
  if grep -q "$2" <<<"$out"; then return 0; fi
  printf '        expected an error matching "%s", got: %s\n' "$2" "${out:-<no error>}"
  return 1
}

ADMIN=a0000000-0000-4000-8000-000000000002
STUDENT=50000000-0000-4000-8000-000000000021
T1=c0000000-0000-4000-8000-000000000011
T2=c0000000-0000-4000-8000-000000000012
T3=c0000000-0000-4000-8000-000000000013
T4=c0000000-0000-4000-8000-000000000014
F1=c0000000-0000-4000-8000-000000000021
F2=c0000000-0000-4000-8000-000000000022
ROADMAP_TECH=b0000000-0000-4000-8000-000000000011
ROADMAP_FIN=b0000000-0000-4000-8000-000000000012
SLOT_T1=e0000000-0000-4000-8000-000000000011
SLOT_F1=e0000000-0000-4000-8000-000000000021

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
# Vector axes: investigative_technical, conventional_analytical,
# enterprising_commercial, artistic_expressive, social_facilitative.
$PSQL -v ON_ERROR_STOP=1 <<SQL
INSERT INTO auth.users (id, email) VALUES
  ('$ADMIN',   'admin2@test.pathora.invalid'),
  ('$STUDENT', 'student21@test.pathora.invalid'),
  ('$T1', 't1@test.pathora.invalid'), ('$T2', 't2@test.pathora.invalid'),
  ('$T3', 't3@test.pathora.invalid'), ('$T4', 't4@test.pathora.invalid'),
  ('$F1', 'f1@test.pathora.invalid'), ('$F2', 'f2@test.pathora.invalid');

INSERT INTO admins (id, full_name, email) VALUES ('$ADMIN', 'Test Admin', 'admin2@test.pathora.invalid');

INSERT INTO students (id, full_name, email, country, year_of_study, participant_code) VALUES
  ('$STUDENT', 'Bridge Student', 'student21@test.pathora.invalid', 'Nigeria', 3, 'TEST-BRIDGE');

INSERT INTO consultants (id, full_name, email, sector, bio, years_experience, job_title, country,
                         profile_vector, status, approved_by, approved_at, code_of_conduct_ok)
SELECT id::uuid, name, email, sector::sector_enum,
       'Practitioner with years of hands-on experience in this sector across the region.',
       6, 'Senior Practitioner', 'Kenya', vec::real[], 'approved', '$ADMIN', now(), true
FROM (VALUES
  ('$T1', 'Tech One (systems builder)',   't1@test.pathora.invalid', 'Technology', '{0.90,0.60,0.20,0.10,0.30}'),
  ('$T2', 'Tech Two (backend engineer)',  't2@test.pathora.invalid', 'Technology', '{0.85,0.70,0.15,0.10,0.25}'),
  ('$T3', 'Tech Three (product lead)',    't3@test.pathora.invalid', 'Technology', '{0.30,0.20,0.80,0.40,0.60}'),
  ('$T4', 'Tech Four (UX designer)',      't4@test.pathora.invalid', 'Technology', '{0.20,0.10,0.30,0.90,0.50}'),
  ('$F1', 'Finance One (analyst)',        'f1@test.pathora.invalid', 'Finance',    '{0.40,0.90,0.50,0.10,0.20}'),
  ('$F2', 'Finance Two (banker)',         'f2@test.pathora.invalid', 'Finance',    '{0.30,0.80,0.70,0.10,0.40}')
) AS v (id, name, email, sector, vec);

-- The Technology student vector sits close to Tech One and Tech Two.
INSERT INTO roadmaps (id, student_id, attempt_id, primary_match, consultant_sector, roadmap_json,
                      student_vector, model_version, prompt_version) VALUES
  ('$ROADMAP_TECH', '$STUDENT', gen_random_uuid(), 'Backend engineering in payments', 'Technology',
   '{"phases": []}', '{0.88,0.65,0.20,0.10,0.30}', 'test-model', 'discovery-v1.0'),
  ('$ROADMAP_FIN',  '$STUDENT', gen_random_uuid(), 'Credit risk analysis',            'Finance',
   '{"phases": []}', '{0.40,0.85,0.55,0.10,0.25}', 'test-model', 'discovery-v1.0');

INSERT INTO consultant_slots (id, consultant_id, starts_at, ends_at) VALUES
  ('$SLOT_T1', '$T1', date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '3 days 45 minutes'),
  ('$SLOT_F1', '$F1', date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '3 days 45 minutes');
SQL

# --- 1. Three Technology consultants, ranked by similarity -------------------
rows=$($PSQL -v ON_ERROR_STOP=1 -F '|' <<SQL | tr -d '\r'
SELECT s.match_rank, c.full_name, c.sector, s.match_similarity
FROM surface_bridge_consultants('$ROADMAP_TECH') s
JOIN consultants c ON c.id = s.matched_consultant_id
ORDER BY s.match_rank;
SQL
)
echo "  Bridge for the Technology roadmap:"
while IFS='|' read -r rank name sector sim; do
  [ -n "$rank" ] && printf '    #%s  %-30s %-12s similarity %s\n' "$rank" "$name" "$sector" "$sim"
done <<<"$rows"

count=$(grep -c . <<<"$rows")
non_tech=$(awk -F'|' 'NF && $3 != "Technology"' <<<"$rows" | grep -c .)
ordered=$(awk -F'|' 'NF { if (seen && $4 + 0 > prev + 0) bad = 1; prev = $4; seen = 1 } END { print bad ? "no" : "yes" }' <<<"$rows")
top_two=$(awk -F'|' '$1 <= 2 { print $2 }' <<<"$rows" | sort | tr '\n' ',')
if [ "$count" = "3" ] && [ "$non_tech" = "0" ] && [ "$ordered" = "yes" ] \
   && [ "$top_two" = "Tech One (systems builder),Tech Two (backend engineer)," ]; then
  pass "returns exactly 3, all Technology, in descending similarity, nearest two first"
else
  fail "returns exactly 3, all Technology, in descending similarity (count=$count non_tech=$non_tech ordered=$ordered top_two=$top_two)"
fi

# --- 2. Under-staffed sector raises rather than returning fewer --------------
expect_error "SELECT * FROM surface_bridge_consultants('$ROADMAP_FIN')" "INSUFFICIENT_CONSULTANTS" \
  && pass "Finance roadmap (2 consultants) raises INSUFFICIENT_CONSULTANTS" \
  || fail "Finance roadmap (2 consultants) raises INSUFFICIENT_CONSULTANTS"

# --- 3. A bridge booking cannot leave the roadmap's sector -------------------
expect_error "SELECT book_consultation('$STUDENT', '$SLOT_F1', '$ROADMAP_TECH', true)" "BRIDGE_SECTOR_MISMATCH" \
  && pass "bridge booking of a Finance consultant on a Technology roadmap raises BRIDGE_SECTOR_MISMATCH" \
  || fail "bridge booking of a Finance consultant on a Technology roadmap raises BRIDGE_SECTOR_MISMATCH"

# --- 4. A valid bridge booking closes the funnel ------------------------------
q "SELECT book_consultation('$STUDENT', '$SLOT_T1', '$ROADMAP_TECH', true)" >/dev/null
stamped=$(q "SELECT booked_at IS NOT NULL FROM bridge_recommendations
             WHERE roadmap_id = '$ROADMAP_TECH' AND consultant_id = '$T1'")
via_bridge=$(q "SELECT via_bridge FROM bookings WHERE slot_id = '$SLOT_T1'")
[ "$stamped" = "t" ] && [ "$via_bridge" = "t" ] \
  && pass "valid bridge booking stamps booked_at on the recommendation row" \
  || fail "valid bridge booking stamps booked_at on the recommendation row (booked_at set=$stamped via_bridge=$via_bridge)"

# --- 5. The funnel view computes conversion per sector ------------------------
funnel=$($PSQL -v ON_ERROR_STOP=1 -F '|' -c "SELECT consultant_sector, roadmaps_generated, roadmaps_viewed,
                                                 roadmaps_booked, bridge_conversion_pct
                                          FROM v_bridge_funnel ORDER BY consultant_sector" | tr -d '\r')
echo "  v_bridge_funnel:"
printf '    %-12s %9s %7s %7s %11s\n' sector generated viewed booked conversion
while IFS='|' read -r s g v b p; do
  [ -n "$s" ] && printf '    %-12s %9s %7s %7s %10s%%\n' "$s" "$g" "$v" "$b" "$p"
done <<<"$funnel"
tech=$(grep '^Technology|' <<<"$funnel")
fin=$(grep '^Finance|' <<<"$funnel")
[ "$tech" = "Technology|1|0|1|100.00" ] && [ "$fin" = "Finance|1|0|0|0.00" ] \
  && pass "v_bridge_funnel computes a conversion percentage per sector" \
  || fail "v_bridge_funnel computes a conversion percentage per sector (Technology='$tech' Finance='$fin')"

exit $FAILED

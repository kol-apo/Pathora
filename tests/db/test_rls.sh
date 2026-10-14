#!/usr/bin/env bash
# =============================================================================
# test_rls.sh - one participant cannot read or write another's data.
#
# Every check runs as the `authenticated` role with a JWT subject set, exactly
# as a Supabase client request would, so row-level security is in force.
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

# Run a query as a given user: the same role and JWT claim Supabase sets.
as_user() { psql -X -q -t -A <<SQL 2>&1 | tr -d '\r'
SET ROLE authenticated;
SET request.jwt.claim.sub = '$1';
$2
SQL
}

ADMIN=a0000000-0000-4000-8000-000000000003
STUDENT_A=50000000-0000-4000-8000-000000000031
STUDENT_B=50000000-0000-4000-8000-000000000032
CONSULTANT=c0000000-0000-4000-8000-000000000031
PENDING=c0000000-0000-4000-8000-000000000032
ROADMAP_A=b0000000-0000-4000-8000-000000000031
ROADMAP_B=b0000000-0000-4000-8000-000000000032
ATTEMPT_A=d0000000-0000-4000-8000-000000000031
SLOT=e0000000-0000-4000-8000-000000000031

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

# --- Grants (Supabase grants these by default; local PostgreSQL does not) ----
# RLS only narrows what a role may already touch, so the role needs table
# privileges first. INSERT is granted so the forged insert reaches RLS rather
# than failing earlier on a missing privilege.
$PSQL -v ON_ERROR_STOP=1 <<'SQL'
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON
  students, admins, consultants, questionnaire_responses, roadmaps, availability,
  consultant_slots, bookings, bridge_recommendations, video_sessions, opportunities,
  verified_resources, analytics_events
TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
SQL

# --- Fixtures ----------------------------------------------------------------
$PSQL -v ON_ERROR_STOP=1 <<SQL
INSERT INTO auth.users (id, email) VALUES
  ('$ADMIN',      'admin3@test.pathora.invalid'),
  ('$STUDENT_A',  'student-a@test.pathora.invalid'),
  ('$STUDENT_B',  'student-b@test.pathora.invalid'),
  ('$CONSULTANT', 'consultant3@test.pathora.invalid'),
  ('$PENDING',    'pending@test.pathora.invalid');

INSERT INTO admins (id, full_name, email) VALUES ('$ADMIN', 'Test Admin', 'admin3@test.pathora.invalid');

INSERT INTO students (id, full_name, email, country, year_of_study, participant_code) VALUES
  ('$STUDENT_A', 'Student A', 'student-a@test.pathora.invalid', 'Nigeria', 3, 'TEST-A'),
  ('$STUDENT_B', 'Student B', 'student-b@test.pathora.invalid', 'Kenya',   2, 'TEST-B');

INSERT INTO roadmaps (id, student_id, attempt_id, primary_match, consultant_sector, roadmap_json,
                      model_version, prompt_version) VALUES
  ('$ROADMAP_A', '$STUDENT_A', '$ATTEMPT_A',       'Backend engineering', 'Technology',
   '{"phases": []}', 'test-model', 'discovery-v1.0'),
  ('$ROADMAP_B', '$STUDENT_B', gen_random_uuid(),  'Brand strategy',      'Creative',
   '{"phases": []}', 'test-model', 'discovery-v1.0');

INSERT INTO questionnaire_responses (student_id, attempt_id, step_number, question_key, answer_text) VALUES
  ('$STUDENT_A', '$ATTEMPT_A', 1, 'status',    'Honestly I am not sure I am good enough for any of this.'),
  ('$STUDENT_A', '$ATTEMPT_A', 2, 'interests', 'Building things and figuring out why they break.'),
  ('$STUDENT_A', '$ATTEMPT_A', 3, 'context',   'My family expects me to support my siblings after graduation.');

INSERT INTO consultants (id, full_name, email, sector, bio, years_experience, job_title, country,
                         status, approved_by, approved_at, code_of_conduct_ok) VALUES
  ('$CONSULTANT', 'Approved Consultant', 'consultant3@test.pathora.invalid', 'Technology',
   'Engineering manager who mentors early-career developers across East Africa.',
   9, 'Engineering Manager', 'Rwanda', 'approved', '$ADMIN', now(), true),
  ('$PENDING',    'Pending Consultant',  'pending@test.pathora.invalid',     'Finance',
   'Analyst awaiting review by the Pathora team before appearing in the directory.',
   4, 'Analyst', 'Ghana', 'pending_review', NULL, NULL, true);

INSERT INTO consultant_slots (id, consultant_id, starts_at, ends_at) VALUES
  ('$SLOT', '$CONSULTANT', date_trunc('hour', now()) + interval '4 days',
                           date_trunc('hour', now()) + interval '4 days 45 minutes');
SQL

# --- 1. A student sees only their own roadmap --------------------------------
seen=$(as_user "$STUDENT_A" "SELECT count(*) FROM roadmaps;")
total=$(q "SELECT count(*) FROM roadmaps WHERE id IN ('$ROADMAP_A', '$ROADMAP_B')")
[ "$seen" = "1" ] && [ "$total" = "2" ] \
  && pass "student A sees 1 of 2 roadmaps" \
  || fail "student A sees 1 of 2 roadmaps (saw $seen of $total)"

# --- 2. Questionnaire answers are private to their author --------------------
seen=$(as_user "$STUDENT_B" "SELECT count(*) FROM questionnaire_responses WHERE student_id = '$STUDENT_A';")
exist=$(q "SELECT count(*) FROM questionnaire_responses WHERE student_id = '$STUDENT_A'")
[ "$seen" = "0" ] && [ "$exist" = "3" ] \
  && pass "student B sees 0 of student A's $exist questionnaire answers" \
  || fail "student B sees 0 of student A's questionnaire answers (saw $seen of $exist)"

# --- 3. A consultant with no booking sees no roadmaps ------------------------
seen=$(as_user "$CONSULTANT" "SELECT count(*) FROM roadmaps;")
[ "$seen" = "0" ] \
  && pass "consultant with no booking sees 0 roadmaps" \
  || fail "consultant with no booking sees 0 roadmaps (saw $seen)"

# --- 4. A forged insert on another student's behalf is rejected --------------
out=$(as_user "$STUDENT_A" "INSERT INTO roadmaps (student_id, attempt_id, primary_match, consultant_sector,
                                                   roadmap_json, model_version, prompt_version)
                            VALUES ('$STUDENT_B', gen_random_uuid(), 'Forged', 'Finance',
                                    '{\"phases\": []}', 'x', 'x');")
grep -q "row-level security" <<<"$out" \
  && pass "forged INSERT by A on B's behalf is rejected by row-level security" \
  || fail "forged INSERT by A on B's behalf is rejected by row-level security (got: ${out:-<no error>})"

# --- 5. The approved consultant directory is visible to students -------------
seen=$(as_user "$STUDENT_A" "SELECT count(*) FROM consultants WHERE id IN ('$CONSULTANT', '$PENDING');")
[ "$seen" = "1" ] \
  && pass "approved consultant is visible to a student (the pending one is not)" \
  || fail "approved consultant is visible to a student, pending one hidden (saw $seen of 2)"

echo
echo "  Positive control and approval guard:"

# --- 6. Once booked against a roadmap, the consultant can read that roadmap --
q "SELECT book_consultation('$STUDENT_A', '$SLOT', '$ROADMAP_A', false)" >/dev/null
seen=$(as_user "$CONSULTANT" "SELECT count(*) FROM roadmaps;")
[ "$seen" = "1" ] \
  && pass "after a booking, the consultant sees exactly that 1 roadmap (check 3 is not vacuous)" \
  || fail "after a booking, the consultant sees exactly that 1 roadmap (saw $seen)"

# --- 7. A consultant can edit their profile but cannot approve themselves ----
edit=$(as_user "$PENDING" "UPDATE consultants SET job_title = 'Senior Analyst' WHERE id = '$PENDING';")
out=$(as_user "$PENDING" "UPDATE consultants SET status = 'approved', approved_by = '$ADMIN',
                                                 approved_at = now() WHERE id = '$PENDING';")
status=$(q "SELECT status || '|' || job_title FROM consultants WHERE id = '$PENDING'")
grep -q "NOT_AUTHORISED" <<<"$out" && [ -z "$edit" ] && [ "$status" = "pending_review|Senior Analyst" ] \
  && pass "pending consultant can edit their profile but cannot approve themselves" \
  || fail "pending consultant can edit their profile but cannot approve themselves (edit='$edit' approve='$out' now=$status)"

exit $FAILED

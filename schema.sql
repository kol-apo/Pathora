-- =============================================================================
-- Pathora research schema
--
-- One idempotent file. Runs top to bottom, unmodified, on local PostgreSQL 16
-- and on Supabase. Running it twice is safe: every object is guarded with
-- IF NOT EXISTS, CREATE OR REPLACE, DROP ... IF EXISTS or ON CONFLICT.
--
-- Sections
--   0  Extensions and the local/Supabase compatibility shim
--   1  Enums
--   2  Tables
--   3  Indexes
--   4  Functions
--   5  Row-level security policies
--   6  Views
--   7  Seeds
-- =============================================================================


-- =============================================================================
-- 0. EXTENSIONS AND COMPATIBILITY SHIM
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- btree_gist lets a GiST exclusion constraint compare a plain uuid with "=",
-- which consultant_slots.no_overlapping_slots needs.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Supabase ships the `authenticated` and `anon` roles. Local PostgreSQL does not.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END
$$;

-- Supabase ships the `auth` schema, `auth.users` and `auth.uid()`. Locally we
-- create a minimal stand-in so foreign keys and policies resolve. On Supabase
-- the schema already exists and this whole block is skipped.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;

    CREATE TABLE auth.users (
      id    uuid PRIMARY KEY,
      email text
    );

    -- Mirrors Supabase: the caller's id comes from the JWT "sub" claim, which
    -- the tests set with SET request.jwt.claim.sub = '<uuid>'.
    CREATE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql STABLE
      AS $f$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;

    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
  END IF;
END
$$;


-- =============================================================================
-- 1. ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE sector_enum AS ENUM ('Technology', 'Finance', 'Entrepreneurship', 'Creative');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status_enum AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE slot_status_enum AS ENUM ('available', 'held', 'booked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consultant_status_enum AS ENUM ('pending_review', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE opportunity_type_enum AS ENUM (
    'internship', 'fellowship', 'scholarship', 'hackathon',
    'graduate_programme', 'ambassador_programme'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_status_enum AS ENUM ('provisioned', 'in_progress', 'ended', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- 2. TABLES
--
-- Vectors are declared real[5] for readability, but PostgreSQL does not enforce
-- a declared array size, so each vector column also carries a CHECK that it has
-- exactly 5 non-null elements in [0, 1]. Dimension 5 matches vector_space in
-- prompts/discovery.json.
-- =============================================================================

CREATE TABLE IF NOT EXISTS students (
  id                uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name         text NOT NULL CHECK (length(trim(full_name)) > 0),
  email             text NOT NULL UNIQUE,
  institution       text NOT NULL DEFAULT 'African Leadership University',
  country           text NOT NULL,
  year_of_study     smallint CHECK (year_of_study BETWEEN 1 AND 6),
  participant_code  text UNIQUE,
  consent_version   text,
  consented_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE students IS
  'Study participants. Holds the only direct identifiers in the schema (name, email). '
  'participant_code is the pseudonym that links a student to analytics_events without '
  'putting their identity in the research dataset. consent_version records which consent '
  'form the participant agreed to.';

CREATE TABLE IF NOT EXISTS admins (
  id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   text NOT NULL CHECK (length(trim(full_name)) > 0),
  email       text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE admins IS
  'Research team members who vet consultants and curate opportunities. Every consultant '
  'approval is attributable to a row here, so the vetting step can be audited.';

CREATE TABLE IF NOT EXISTS consultants (
  id                  uuid PRIMARY KEY REFERENCES auth.users (id),
  full_name           text NOT NULL CHECK (length(trim(full_name)) > 0),
  email               text NOT NULL UNIQUE,
  sector              sector_enum NOT NULL,
  bio                 text NOT NULL CHECK (length(bio) BETWEEN 40 AND 1200),
  years_experience    smallint NOT NULL CHECK (years_experience >= 3),
  -- Named job_title, NOT current_role: CURRENT_ROLE is a PostgreSQL reserved
  -- word and a column with that name fails to parse.
  job_title           text NOT NULL,
  organisation        text,
  country             text NOT NULL,
  timezone            text NOT NULL DEFAULT 'Africa/Kigali',
  profile_url         text,
  skill_tags          text[] NOT NULL DEFAULT '{}',
  profile_vector      real[5] CHECK (
                        profile_vector IS NULL OR (
                          array_ndims(profile_vector) = 1
                          AND cardinality(profile_vector) = 5
                          AND array_position(profile_vector, NULL) IS NULL
                          AND 0 <= ALL (profile_vector)
                          AND 1 >= ALL (profile_vector)
                        )
                      ),
  status              consultant_status_enum NOT NULL DEFAULT 'pending_review',
  approved_by         uuid REFERENCES admins (id) ON DELETE RESTRICT,
  approved_at         timestamptz,
  code_of_conduct_ok  boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT approval_is_attributable
    CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
COMMENT ON TABLE consultants IS
  'Vetted professionals students can book. profile_vector places each consultant on the same '
  'five RIASEC-derived axes as a student roadmap, which is what makes the bridge matching a '
  'measurable similarity rather than an editorial choice. Only approved consultants are '
  'visible to students.';

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  attempt_id    uuid NOT NULL,
  step_number   smallint NOT NULL CHECK (step_number BETWEEN 1 AND 6),
  question_key  text NOT NULL,
  answer_text   text NOT NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_answer_per_step UNIQUE (attempt_id, step_number)
);
COMMENT ON TABLE questionnaire_responses IS
  'Raw answers to the six-step discovery questionnaire, one row per step per attempt. These '
  'are personal reflections, so only the student who wrote them can read them. They are the '
  'model input from which each roadmap is generated.';

CREATE TABLE IF NOT EXISTS roadmaps (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  attempt_id         uuid NOT NULL UNIQUE,
  primary_match      text NOT NULL,
  secondary_matches  jsonb NOT NULL DEFAULT '[]',
  consultant_sector  sector_enum NOT NULL,
  roadmap_json       jsonb NOT NULL,
  student_vector     real[5] CHECK (
                       student_vector IS NULL OR (
                         array_ndims(student_vector) = 1
                         AND cardinality(student_vector) = 5
                         AND array_position(student_vector, NULL) IS NULL
                         AND 0 <= ALL (student_vector)
                         AND 1 >= ALL (student_vector)
                       )
                     ),
  -- Mandatory: every roadmap in the research dataset must be traceable to the
  -- exact model and prompt that produced it.
  model_version      text NOT NULL,
  prompt_version     text NOT NULL,
  schema_valid       boolean NOT NULL DEFAULT true,
  retry_count        smallint NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  generation_ms      integer CHECK (generation_ms >= 0),
  generated_at       timestamptz NOT NULL DEFAULT now(),
  -- The generated object's phased plan lives under "phases" (see output_schema
  -- in prompts/discovery.json), so that is the key this constraint requires.
  CONSTRAINT roadmap_json_has_phases CHECK (jsonb_typeof(roadmap_json -> 'phases') = 'array'),
  CONSTRAINT secondary_matches_is_array CHECK (jsonb_typeof(secondary_matches) = 'array')
);
COMMENT ON TABLE roadmaps IS
  'One generated career roadmap per questionnaire attempt. model_version and prompt_version '
  'make every output traceable to what produced it; schema_valid and retry_count measure how '
  'reliably the prompt contract is met. student_vector is the input to the bridge matching.';

CREATE TABLE IF NOT EXISTS availability (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id  uuid NOT NULL REFERENCES consultants (id) ON DELETE CASCADE,
  day_of_week    smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time     time NOT NULL,
  end_time       time NOT NULL,
  timezone       text NOT NULL DEFAULT 'Africa/Kigali',
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT window_is_forward CHECK (end_time > start_time)
);
COMMENT ON TABLE availability IS
  'A consultant''s recurring weekly windows, in their own timezone. Concrete bookable slots '
  'are materialised from these into consultant_slots, so supply of consultant time can be '
  'compared with demand.';

CREATE TABLE IF NOT EXISTS consultant_slots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id    uuid NOT NULL REFERENCES consultants (id) ON DELETE CASCADE,
  availability_id  uuid REFERENCES availability (id) ON DELETE SET NULL,
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz NOT NULL,
  status           slot_status_enum NOT NULL DEFAULT 'available',
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slot_is_forward CHECK (ends_at > starts_at),
  -- Structural layer of the double-booking defence: one consultant can never
  -- hold two slots whose time ranges overlap. This is why btree_gist is needed.
  CONSTRAINT no_overlapping_slots
    EXCLUDE USING gist (consultant_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
);
COMMENT ON TABLE consultant_slots IS
  'Concrete, bookable units of consultant time. Each slot is booked at most once while live, '
  'which is enforced three ways (see book_consultation). Slot status over time measures how '
  'much offered consultant capacity students actually use.';

CREATE TABLE IF NOT EXISTS bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  consultant_id  uuid NOT NULL REFERENCES consultants (id) ON DELETE CASCADE,
  -- Declarative layer of the double-booking defence. The uniqueness is a
  -- partial unique index (bookings_one_live_booking_per_slot, section 3)
  -- rather than a column UNIQUE, so that a cancelled booking releases its slot
  -- for rebooking instead of locking it forever.
  slot_id        uuid NOT NULL REFERENCES consultant_slots (id) ON DELETE RESTRICT,
  roadmap_id     uuid REFERENCES roadmaps (id) ON DELETE SET NULL,
  via_bridge     boolean NOT NULL DEFAULT false,
  status         booking_status_enum NOT NULL DEFAULT 'confirmed',
  cancelled_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cancellation_is_timestamped CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL),
  CONSTRAINT bridge_booking_has_roadmap CHECK (via_bridge = false OR roadmap_id IS NOT NULL)
);
COMMENT ON TABLE bookings IS
  'A student''s reservation of one consultant slot. via_bridge marks bookings made from the '
  'consultants surfaced on a roadmap, which is the conversion the study measures. Students '
  'cannot insert here directly; every booking goes through book_consultation().';

CREATE TABLE IF NOT EXISTS bridge_recommendations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id        uuid NOT NULL REFERENCES roadmaps (id) ON DELETE CASCADE,
  consultant_id     uuid NOT NULL REFERENCES consultants (id) ON DELETE CASCADE,
  rank              smallint NOT NULL CHECK (rank BETWEEN 1 AND 3),
  similarity_score  numeric(6, 5) NOT NULL CHECK (similarity_score BETWEEN -1 AND 1),
  surfaced_at       timestamptz NOT NULL DEFAULT now(),
  viewed_at         timestamptz,
  booked_at         timestamptz,
  CONSTRAINT one_consultant_per_roadmap UNIQUE (roadmap_id, consultant_id),
  CONSTRAINT one_consultant_per_rank UNIQUE (roadmap_id, rank),
  CONSTRAINT funnel_order CHECK (booked_at IS NULL OR viewed_at IS NULL OR booked_at >= viewed_at)
);
COMMENT ON TABLE bridge_recommendations IS
  'The three consultants surfaced on each roadmap, with rank and similarity score, and when '
  'each was viewed and booked. This junction table exists so bridge conversion is measured per '
  'roadmap rather than inferred from bookings. It holds the primary dependent variable of the '
  'study.';

CREATE TABLE IF NOT EXISTS video_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            uuid NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE CASCADE,
  room_url              text NOT NULL,
  room_expires_at       timestamptz NOT NULL,
  status                session_status_enum NOT NULL DEFAULT 'provisioned',
  student_joined_at     timestamptz,
  consultant_joined_at  timestamptz,
  started_at            timestamptz,
  ended_at              timestamptz,
  duration_seconds      integer GENERATED ALWAYS AS (
                          CASE
                            WHEN ended_at IS NOT NULL AND started_at IS NOT NULL
                              THEN EXTRACT(EPOCH FROM (ended_at - started_at))::integer
                            ELSE NULL
                          END
                        ) STORED,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_is_forward
    CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);
COMMENT ON TABLE video_sessions IS
  'Timing metadata for the video call behind a booking: when each party joined, when it '
  'started and ended, how long it ran. There is deliberately NO recording column anywhere in '
  'this schema. The participant consent form states that sessions are not recorded, so the '
  'absence is a compliance requirement, not an omission.';

CREATE TABLE IF NOT EXISTS opportunities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  organisation  text NOT NULL,
  sector        sector_enum NOT NULL,
  type          opportunity_type_enum NOT NULL,
  description   text NOT NULL,
  link          text NOT NULL,
  country       text,
  deadline      date,
  posted_by     uuid NOT NULL REFERENCES admins (id) ON DELETE RESTRICT,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE opportunities IS
  'Time-bound openings (internships, fellowships and so on) curated by an admin. posted_by '
  'makes every listing attributable to a person on the research team.';

CREATE TABLE IF NOT EXISTS verified_resources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  organisation text,
  sector       sector_enum,
  type         opportunity_type_enum,
  countries    text[] NOT NULL DEFAULT '{}',
  url          text NOT NULL,
  verified_at  date NOT NULL DEFAULT current_date,
  is_active    boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE verified_resources IS
  'Allow-list backing the prompt guardrails. A programme absent here is treated as hallucinated.';
COMMENT ON COLUMN verified_resources.sector IS
  'NULL means the programme is open to every sector.';
COMMENT ON COLUMN verified_resources.countries IS
  'Countries the programme accepts applicants from. An empty array means no country restriction.';

CREATE TABLE IF NOT EXISTS analytics_events (
  id              bigserial PRIMARY KEY,
  participant_code text NOT NULL,
  event_type      text NOT NULL,
  event_payload   jsonb NOT NULL DEFAULT '{}',
  occurred_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE analytics_events IS
  'Interaction events for the research dataset. Deliberately carries participant_code and NOT '
  'student_id, so the dataset holds no direct identifier by construction: an export of this '
  'table cannot be joined back to a name or email without the separately protected students '
  'table.';


-- =============================================================================
-- 3. INDEXES
--
-- Every foreign key is covered, either here or by the leading column of a
-- primary key, UNIQUE or EXCLUDE constraint (noted where that is the case).
-- =============================================================================

-- students
CREATE INDEX IF NOT EXISTS students_country_idx      ON students (country);
CREATE INDEX IF NOT EXISTS students_institution_idx  ON students (institution);

-- consultants
CREATE INDEX IF NOT EXISTS consultants_status_idx           ON consultants (status);
CREATE INDEX IF NOT EXISTS consultants_sector_approved_idx  ON consultants (sector) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS consultants_approved_by_idx      ON consultants (approved_by);
CREATE INDEX IF NOT EXISTS consultants_skill_tags_gin       ON consultants USING gin (skill_tags);
CREATE INDEX IF NOT EXISTS consultants_country_idx          ON consultants (country);

-- questionnaire_responses (attempt_id is covered by one_answer_per_step)
CREATE INDEX IF NOT EXISTS questionnaire_responses_student_idx
  ON questionnaire_responses (student_id, submitted_at);

-- roadmaps (attempt_id is covered by its UNIQUE)
CREATE INDEX IF NOT EXISTS roadmaps_student_idx         ON roadmaps (student_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS roadmaps_sector_idx          ON roadmaps (consultant_sector);
CREATE INDEX IF NOT EXISTS roadmaps_prompt_version_idx  ON roadmaps (prompt_version);
CREATE INDEX IF NOT EXISTS roadmaps_model_version_idx   ON roadmaps (model_version);
CREATE INDEX IF NOT EXISTS roadmaps_roadmap_json_gin    ON roadmaps USING gin (roadmap_json);
CREATE INDEX IF NOT EXISTS roadmaps_generated_at_idx    ON roadmaps (generated_at);

-- availability
CREATE INDEX IF NOT EXISTS availability_consultant_idx  ON availability (consultant_id, day_of_week);
CREATE INDEX IF NOT EXISTS availability_active_idx      ON availability (consultant_id) WHERE active;

-- consultant_slots
CREATE INDEX IF NOT EXISTS consultant_slots_consultant_idx    ON consultant_slots (consultant_id);
CREATE INDEX IF NOT EXISTS consultant_slots_availability_idx  ON consultant_slots (availability_id);
CREATE INDEX IF NOT EXISTS consultant_slots_available_idx
  ON consultant_slots (consultant_id, starts_at) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS consultant_slots_starts_at_idx     ON consultant_slots (starts_at);

-- bookings
-- Declarative layer of the double-booking defence: at most one live booking per
-- slot. Partial, so a cancelled booking does not block the slot forever.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_live_booking_per_slot
  ON bookings (slot_id) WHERE status <> 'cancelled';
-- Covers the slot_id foreign key for every row, including cancelled ones.
CREATE INDEX IF NOT EXISTS bookings_slot_idx        ON bookings (slot_id);
CREATE INDEX IF NOT EXISTS bookings_student_idx     ON bookings (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_consultant_idx  ON bookings (consultant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_roadmap_idx     ON bookings (roadmap_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx      ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_via_bridge_idx  ON bookings (roadmap_id) WHERE via_bridge;

-- bridge_recommendations
-- (roadmap_id, rank) is already indexed by the one_consultant_per_rank UNIQUE
-- constraint, which also covers the roadmap_id foreign key. A second identical
-- index would only slow writes.
CREATE INDEX IF NOT EXISTS bridge_recommendations_consultant_idx  ON bridge_recommendations (consultant_id);
CREATE INDEX IF NOT EXISTS bridge_recommendations_booked_idx
  ON bridge_recommendations (roadmap_id) WHERE booked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS bridge_recommendations_surfaced_idx    ON bridge_recommendations (surfaced_at);

-- video_sessions (booking_id is covered by its UNIQUE)
CREATE INDEX IF NOT EXISTS video_sessions_status_idx  ON video_sessions (status);
CREATE INDEX IF NOT EXISTS video_sessions_expiry_idx
  ON video_sessions (room_expires_at) WHERE status = 'provisioned';

-- opportunities
CREATE INDEX IF NOT EXISTS opportunities_posted_by_idx    ON opportunities (posted_by);
CREATE INDEX IF NOT EXISTS opportunities_sector_type_idx  ON opportunities (sector, type) WHERE is_published;
CREATE INDEX IF NOT EXISTS opportunities_deadline_idx     ON opportunities (deadline);

-- verified_resources (name is covered by its UNIQUE)
CREATE INDEX IF NOT EXISTS verified_resources_sector_idx  ON verified_resources (sector) WHERE is_active;
CREATE INDEX IF NOT EXISTS verified_resources_type_idx    ON verified_resources (type);

-- analytics_events
CREATE INDEX IF NOT EXISTS analytics_events_participant_idx
  ON analytics_events (participant_code, occurred_at);
CREATE INDEX IF NOT EXISTS analytics_events_type_idx  ON analytics_events (event_type, occurred_at);


-- =============================================================================
-- 4. FUNCTIONS
--
-- Custom SQLSTATEs raised here (class P0B, "Pathora business rule"):
--   55006  SLOT_UNAVAILABLE         (standard: object_in_use)
--   P0B01  BRIDGE_SECTOR_MISMATCH
--   P0B02  INSUFFICIENT_CONSULTANTS
--   P0B03  BRIDGE_REQUIRES_ROADMAP / ROADMAP_MISMATCH
--   P0B04  BOOKING_NOT_CANCELLABLE
--   P0B05  CONSULTANT_UNAVAILABLE
--   42501  NOT_AUTHORISED           (standard: insufficient_privilege)
--   P0002  *_NOT_FOUND              (standard: no_data_found)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS students_touch_updated_at ON students;
CREATE TRIGGER students_touch_updated_at
  BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS consultants_touch_updated_at ON consultants;
CREATE TRIGGER consultants_touch_updated_at
  BEFORE UPDATE ON consultants FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- SECURITY DEFINER so policies on other tables can call it without tripping
-- RLS on admins (and without the admins policy recursing into itself).
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
$$;

-- RLS can restrict which rows a consultant may update, but not which columns.
-- This trigger closes that gap: a consultant may edit their profile but never
-- their own approval. Server-side calls with no JWT (auth.uid() IS NULL, e.g.
-- the service role or a migration) and admins are allowed through.
CREATE OR REPLACE FUNCTION guard_consultant_approval() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.status, NEW.approved_by, NEW.approved_at)
       IS DISTINCT FROM (OLD.status, OLD.approved_by, OLD.approved_at)
     AND auth.uid() IS NOT NULL
     AND NOT is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORISED: only an admin can change a consultant''s approval status'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS consultants_guard_approval ON consultants;
CREATE TRIGGER consultants_guard_approval
  BEFORE UPDATE ON consultants FOR EACH ROW EXECUTE FUNCTION guard_consultant_approval();

-- ---------------------------------------------------------------------------
-- cosine_similarity
--
-- Why cosine, and not the alternatives:
--   * Cosine is magnitude-invariant. A student who answers the questionnaire
--     expansively produces larger raw scores than a terse student, but only the
--     DIRECTION of their interests should decide who they are matched with.
--     Cosine compares direction alone, so verbosity cannot make one student
--     look "more similar to everyone".
--   * Euclidean distance would conflate response verbosity with interest: two
--     students with identical interests but different answer lengths would sit
--     far apart.
--   * Jaccard was rejected because the vectors are continuous scores in [0, 1],
--     not binary sets.
--
-- Returns NULL when either vector is NULL, the lengths differ, an element is
-- NULL, or either norm is zero (cosine is undefined for a zero vector).
-- Rounded to 5 decimal places to match bridge_recommendations.similarity_score.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cosine_similarity(a real[], b real[]) RETURNS numeric
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN a IS NULL OR b IS NULL                         THEN NULL
    WHEN cardinality(a) = 0
      OR cardinality(a) <> cardinality(b)               THEN NULL
    WHEN s.null_pairs > 0                               THEN NULL
    WHEN s.norm_a IS NULL OR s.norm_b IS NULL
      OR s.norm_a = 0 OR s.norm_b = 0                   THEN NULL
    ELSE round(
           greatest(-1, least(1, s.dot / (sqrt(s.norm_a) * sqrt(s.norm_b))))::numeric,
           5)
  END
  FROM (
    SELECT sum(x::float8 * y)                          AS dot,
           sum(x::float8 * x)                          AS norm_a,
           sum(y::float8 * y)                          AS norm_b,
           count(*) FILTER (WHERE x IS NULL OR y IS NULL) AS null_pairs
    FROM unnest(a, b) AS t (x, y)
  ) AS s
$$;

-- ---------------------------------------------------------------------------
-- book_consultation
--
-- The procedural half of the double-booking defence. Three independent layers
-- stop two students from holding one slot:
--
--   1. Procedural  - this function locks the slot row with SELECT ... FOR UPDATE.
--                    A second caller blocks on the lock, then re-reads the row,
--                    sees status 'booked' and raises SLOT_UNAVAILABLE.
--   2. Declarative - bookings_one_live_booking_per_slot: a unique index allows
--                    at most one non-cancelled booking per slot, whoever writes.
--   3. Structural  - consultant_slots.no_overlapping_slots: an EXCLUDE
--                    constraint makes overlapping slots for one consultant
--                    impossible, so the same hour cannot exist twice to be
--                    booked twice.
--
-- Any one of these suffices. All three are present because a double booking is
-- unrecoverable in front of a participant: two students arrive for one call.
--
-- SECURITY DEFINER because a student must update a slot row they cannot update
-- directly under RLS. The identity check below stops a caller booking on
-- someone else's behalf.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION book_consultation(
  p_student_id  uuid,
  p_slot_id     uuid,
  p_roadmap_id  uuid    DEFAULT NULL,
  p_via_bridge  boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_slot        consultant_slots%ROWTYPE;
  v_consultant  consultants%ROWTYPE;
  v_roadmap     roadmaps%ROWTYPE;
  v_booking_id  uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_student_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORISED: cannot book on behalf of another student'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Pessimistic row lock. Only an available slot qualifies.
  SELECT * INTO v_slot
  FROM consultant_slots
  WHERE id = p_slot_id AND status = 'available'
  FOR UPDATE;

  -- 2. Gone, held, booked, or lost the race to a concurrent caller.
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE: slot % is no longer available', p_slot_id
      USING ERRCODE = '55006';
  END IF;

  IF v_slot.starts_at <= now() THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE: slot % has already started', p_slot_id
      USING ERRCODE = '55006';
  END IF;

  SELECT * INTO v_consultant FROM consultants WHERE id = v_slot.consultant_id;
  IF v_consultant.status <> 'approved' THEN
    RAISE EXCEPTION 'CONSULTANT_UNAVAILABLE: consultant % is not approved', v_slot.consultant_id
      USING ERRCODE = 'P0B05';
  END IF;

  -- 3. A bridge booking must have a roadmap, and must stay in that roadmap's sector.
  IF p_via_bridge AND p_roadmap_id IS NULL THEN
    RAISE EXCEPTION 'BRIDGE_REQUIRES_ROADMAP: a bridge booking must reference a roadmap'
      USING ERRCODE = 'P0B03';
  END IF;

  IF p_roadmap_id IS NOT NULL THEN
    SELECT * INTO v_roadmap FROM roadmaps WHERE id = p_roadmap_id;
    IF NOT FOUND OR v_roadmap.student_id <> p_student_id THEN
      RAISE EXCEPTION 'ROADMAP_MISMATCH: roadmap % does not belong to student %', p_roadmap_id, p_student_id
        USING ERRCODE = 'P0B03';
    END IF;

    IF p_via_bridge AND v_consultant.sector <> v_roadmap.consultant_sector THEN
      RAISE EXCEPTION 'BRIDGE_SECTOR_MISMATCH: consultant sector % does not match roadmap sector %',
        v_consultant.sector, v_roadmap.consultant_sector
        USING ERRCODE = 'P0B01';
    END IF;
  END IF;

  -- 4. Claim the slot.
  UPDATE consultant_slots SET status = 'booked' WHERE id = p_slot_id;

  -- 5. Record the booking. The partial unique index is the backstop if the
  --    lock above were ever bypassed.
  INSERT INTO bookings (student_id, consultant_id, slot_id, roadmap_id, via_bridge, status)
  VALUES (p_student_id, v_slot.consultant_id, p_slot_id, p_roadmap_id, p_via_bridge, 'confirmed')
  RETURNING id INTO v_booking_id;

  -- 6. Close the funnel for this recommendation.
  IF p_via_bridge THEN
    UPDATE bridge_recommendations
    SET booked_at = now()
    WHERE roadmap_id = p_roadmap_id
      AND consultant_id = v_slot.consultant_id
      AND booked_at IS NULL;
  END IF;

  -- 7.
  RETURN v_booking_id;
END
$$;

-- ---------------------------------------------------------------------------
-- surface_bridge_consultants: the mandatory bridge, B(s, sigma_r)
--
-- Ranks approved consultants IN THE ROADMAP'S SECTOR ONLY by cosine similarity
-- between their profile_vector and the roadmap's student_vector, records the
-- top three in bridge_recommendations with ranks 1-3, and returns them. Ties
-- are broken by consultant id, so the same vector always yields the same
-- ranking.
--
-- If the sector has fewer than three approved consultants with a usable
-- vector, it raises INSUFFICIENT_CONSULTANTS instead of returning two.
-- Degrading quietly would weaken the architectural claim the study tests.
--
-- Surfacing happens once per roadmap: a repeat call returns the recorded
-- recommendations unchanged, so surfaced_at stays the moment the student first
-- saw them. The roadmap row is locked so two concurrent calls cannot both
-- insert.
--
-- The OUT columns are named matched_consultant_id / match_rank /
-- match_similarity on purpose. Naming them consultant_id / rank /
-- similarity_score would collide with the table's column names inside plpgsql
-- and fail with "column reference is ambiguous".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION surface_bridge_consultants(p_roadmap_id uuid)
RETURNS TABLE (matched_consultant_id uuid, match_rank smallint, match_similarity numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_student_id  uuid;
  v_sector      sector_enum;
  v_vector      real[];
  v_eligible    integer;
BEGIN
  SELECT r.student_id, r.consultant_sector, r.student_vector
    INTO v_student_id, v_sector, v_vector
  FROM roadmaps r
  WHERE r.id = p_roadmap_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROADMAP_NOT_FOUND: roadmap % does not exist', p_roadmap_id
      USING ERRCODE = 'P0002';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_student_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORISED: roadmap % belongs to another student', p_roadmap_id
      USING ERRCODE = '42501';
  END IF;

  -- Already surfaced: return what the student was shown.
  IF EXISTS (SELECT 1 FROM bridge_recommendations br WHERE br.roadmap_id = p_roadmap_id) THEN
    RETURN QUERY
      SELECT br.consultant_id, br.rank, br.similarity_score
      FROM bridge_recommendations br
      WHERE br.roadmap_id = p_roadmap_id
      ORDER BY br.rank;
    RETURN;
  END IF;

  SELECT count(*) INTO v_eligible
  FROM consultants c
  WHERE c.status = 'approved'
    AND c.sector = v_sector
    AND cosine_similarity(c.profile_vector, v_vector) IS NOT NULL;

  IF v_eligible < 3 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CONSULTANTS: sector % has % approved consultant(s) with a usable profile vector; the bridge requires 3',
      v_sector, v_eligible
      USING ERRCODE = 'P0B02';
  END IF;

  RETURN QUERY
    WITH ranked AS (
      SELECT c.id AS cid,
             cosine_similarity(c.profile_vector, v_vector) AS sim
      FROM consultants c
      WHERE c.status = 'approved'
        AND c.sector = v_sector
        AND cosine_similarity(c.profile_vector, v_vector) IS NOT NULL
      ORDER BY sim DESC, c.id
      LIMIT 3
    ),
    numbered AS (
      SELECT cid, sim, (row_number() OVER (ORDER BY sim DESC, cid))::smallint AS rk
      FROM ranked
    ),
    inserted AS (
      INSERT INTO bridge_recommendations AS br (roadmap_id, consultant_id, rank, similarity_score)
      SELECT p_roadmap_id, n.cid, n.rk, n.sim
      FROM numbered n
      ON CONFLICT ON CONSTRAINT one_consultant_per_roadmap DO NOTHING
      RETURNING br.consultant_id, br.rank, br.similarity_score
    )
    SELECT i.consultant_id, i.rank, i.similarity_score
    FROM inserted i
    ORDER BY i.rank;
END
$$;

-- ---------------------------------------------------------------------------
-- cancel_booking
--
-- Only the student, the consultant, or an admin may cancel. Cancelling stamps
-- cancelled_at, releases the slot back to 'available' (the partial unique index
-- then allows a new booking of it) and expires any video room not yet used.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id uuid, p_actor_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_booking bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_actor_id THEN
    RAISE EXCEPTION 'NOT_AUTHORISED: actor does not match the signed-in user'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: booking % does not exist', p_booking_id
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
       p_actor_id = v_booking.student_id
    OR p_actor_id = v_booking.consultant_id
    OR EXISTS (SELECT 1 FROM admins WHERE id = p_actor_id)
  ) THEN
    RAISE EXCEPTION 'NOT_AUTHORISED: only the student, the consultant or an admin can cancel booking %', p_booking_id
      USING ERRCODE = '42501';
  END IF;

  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'BOOKING_NOT_CANCELLABLE: booking % is %', p_booking_id, v_booking.status
      USING ERRCODE = 'P0B04';
  END IF;

  UPDATE bookings
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = p_booking_id;

  UPDATE consultant_slots
  SET status = 'available'
  WHERE id = v_booking.slot_id;

  UPDATE video_sessions
  SET status = 'expired'
  WHERE booking_id = p_booking_id AND status = 'provisioned';
END
$$;

-- SECURITY DEFINER functions must not be callable by anonymous visitors.
REVOKE ALL ON FUNCTION book_consultation(uuid, uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION surface_bridge_consultants(uuid)             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION cancel_booking(uuid, uuid)                   FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION book_consultation(uuid, uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION surface_bridge_consultants(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking(uuid, uuid)                   TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin()                                   TO authenticated;
GRANT EXECUTE ON FUNCTION cosine_similarity(real[], real[])            TO authenticated;


-- =============================================================================
-- 5. ROW-LEVEL SECURITY
--
-- RLS is enabled on every table. With RLS on and no matching policy, access is
-- denied, so anything not granted below is closed. Writes that need to cross
-- ownership (booking a slot, surfacing the bridge, cancelling) go through the
-- SECURITY DEFINER functions in section 4, never through direct table access.
-- =============================================================================

ALTER TABLE students                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability             ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_slots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_recommendations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_resources       ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events         ENABLE ROW LEVEL SECURITY;

-- students: own row only; admins read all ----------------------------------
DROP POLICY IF EXISTS students_select_own ON students;
CREATE POLICY students_select_own ON students
  FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS students_update_own ON students;
CREATE POLICY students_update_own ON students
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS students_admin_select ON students;
CREATE POLICY students_admin_select ON students
  FOR SELECT TO authenticated USING (is_admin());

-- admins: an admin can see the admin list; nobody else can --------------------
DROP POLICY IF EXISTS admins_admin_select ON admins;
CREATE POLICY admins_admin_select ON admins
  FOR SELECT TO authenticated USING (is_admin());

-- consultants: approved directory is browsable; own row editable (approval
-- columns guarded by trigger); admins do everything ---------------------------
DROP POLICY IF EXISTS consultants_directory_select ON consultants;
CREATE POLICY consultants_directory_select ON consultants
  FOR SELECT TO authenticated USING (status = 'approved');

DROP POLICY IF EXISTS consultants_select_own ON consultants;
CREATE POLICY consultants_select_own ON consultants
  FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS consultants_update_own ON consultants;
CREATE POLICY consultants_update_own ON consultants
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS consultants_admin_all ON consultants;
CREATE POLICY consultants_admin_all ON consultants
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- questionnaire_responses: the author only. Not consultants, not admins -
-- these are personal reflections. --------------------------------------------
DROP POLICY IF EXISTS questionnaire_responses_select_own ON questionnaire_responses;
CREATE POLICY questionnaire_responses_select_own ON questionnaire_responses
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS questionnaire_responses_insert_own ON questionnaire_responses;
CREATE POLICY questionnaire_responses_insert_own ON questionnaire_responses
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- roadmaps: own; a consultant only with a booking against it; admins read ----
DROP POLICY IF EXISTS roadmaps_select_own ON roadmaps;
CREATE POLICY roadmaps_select_own ON roadmaps
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- WITH CHECK blocks a forged insert on another student's behalf.
DROP POLICY IF EXISTS roadmaps_insert_own ON roadmaps;
CREATE POLICY roadmaps_insert_own ON roadmaps
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS roadmaps_consultant_select_booked ON roadmaps;
CREATE POLICY roadmaps_consultant_select_booked ON roadmaps
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.roadmap_id = roadmaps.id AND b.consultant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS roadmaps_admin_select ON roadmaps;
CREATE POLICY roadmaps_admin_select ON roadmaps
  FOR SELECT TO authenticated USING (is_admin());

-- availability: consultant manages own; authenticated read active windows -----
DROP POLICY IF EXISTS availability_consultant_all ON availability;
CREATE POLICY availability_consultant_all ON availability
  FOR ALL TO authenticated
  USING (consultant_id = auth.uid()) WITH CHECK (consultant_id = auth.uid());

DROP POLICY IF EXISTS availability_read_active ON availability;
CREATE POLICY availability_read_active ON availability
  FOR SELECT TO authenticated USING (active);

-- consultant_slots: consultant manages own; authenticated read available -----
DROP POLICY IF EXISTS consultant_slots_consultant_all ON consultant_slots;
CREATE POLICY consultant_slots_consultant_all ON consultant_slots
  FOR ALL TO authenticated
  USING (consultant_id = auth.uid()) WITH CHECK (consultant_id = auth.uid());

DROP POLICY IF EXISTS consultant_slots_read_available ON consultant_slots;
CREATE POLICY consultant_slots_read_available ON consultant_slots
  FOR SELECT TO authenticated USING (status = 'available');

-- bookings: each party sees their own; admins all. No INSERT policy: bookings
-- are created only by book_consultation(). ----------------------------------
DROP POLICY IF EXISTS bookings_select_party ON bookings;
CREATE POLICY bookings_select_party ON bookings
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR consultant_id = auth.uid());

DROP POLICY IF EXISTS bookings_admin_all ON bookings;
CREATE POLICY bookings_admin_all ON bookings
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- bridge_recommendations: the student whose roadmap it is ---------------------
DROP POLICY IF EXISTS bridge_recommendations_select_own ON bridge_recommendations;
CREATE POLICY bridge_recommendations_select_own ON bridge_recommendations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM roadmaps r
      WHERE r.id = bridge_recommendations.roadmap_id AND r.student_id = auth.uid()
    )
  );

-- video_sessions: the two parties to the booking only ------------------------
DROP POLICY IF EXISTS video_sessions_select_party ON video_sessions;
CREATE POLICY video_sessions_select_party ON video_sessions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = video_sessions.booking_id
        AND (b.student_id = auth.uid() OR b.consultant_id = auth.uid())
    )
  );

-- opportunities: published ones readable; admins write ----------------------
DROP POLICY IF EXISTS opportunities_read_published ON opportunities;
CREATE POLICY opportunities_read_published ON opportunities
  FOR SELECT TO authenticated USING (is_published);

DROP POLICY IF EXISTS opportunities_admin_all ON opportunities;
CREATE POLICY opportunities_admin_all ON opportunities
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- verified_resources: active ones readable; admins write ---------------------
DROP POLICY IF EXISTS verified_resources_read_active ON verified_resources;
CREATE POLICY verified_resources_read_active ON verified_resources
  FOR SELECT TO authenticated USING (is_active);

DROP POLICY IF EXISTS verified_resources_admin_all ON verified_resources;
CREATE POLICY verified_resources_admin_all ON verified_resources
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- analytics_events: insert-only for participants, under their own code;
-- only admins read. A participant cannot write events under someone else's
-- code, which would corrupt the research dataset. ---------------------------
DROP POLICY IF EXISTS analytics_events_insert_own_code ON analytics_events;
CREATE POLICY analytics_events_insert_own_code ON analytics_events
  FOR INSERT TO authenticated WITH CHECK (
    participant_code = (SELECT s.participant_code FROM students s WHERE s.id = auth.uid())
  );

DROP POLICY IF EXISTS analytics_events_admin_select ON analytics_events;
CREATE POLICY analytics_events_admin_select ON analytics_events
  FOR SELECT TO authenticated USING (is_admin());


-- =============================================================================
-- 6. VIEWS
--
-- security_invoker = true makes each view apply the caller's RLS, so on
-- Supabase an ordinary student querying a view sees only their own rows rather
-- than the whole study. The research team reads them with the service role.
-- =============================================================================

-- The primary dependent variable of the study: of the roadmaps generated in
-- each sector, how many led to a booking with a surfaced consultant.
CREATE OR REPLACE VIEW v_bridge_funnel WITH (security_invoker = true) AS
SELECT
  r.consultant_sector,
  count(DISTINCT r.id)                                             AS roadmaps_generated,
  count(DISTINCT r.id) FILTER (WHERE br.viewed_at IS NOT NULL)     AS roadmaps_viewed,
  count(DISTINCT r.id) FILTER (WHERE br.booked_at IS NOT NULL)     AS roadmaps_booked,
  round(
    100.0 * count(DISTINCT r.id) FILTER (WHERE br.booked_at IS NOT NULL)
    / nullif(count(DISTINCT r.id), 0),
    2)                                                             AS bridge_conversion_pct
FROM roadmaps r
LEFT JOIN bridge_recommendations br ON br.roadmap_id = r.id
GROUP BY r.consultant_sector;
COMMENT ON VIEW v_bridge_funnel IS
  'Primary dependent variable: bridge conversion per sector, i.e. the share of generated '
  'roadmaps that led to a booking with one of the consultants surfaced on them.';

-- How reliably each prompt version meets its output contract.
CREATE OR REPLACE VIEW v_schema_validation WITH (security_invoker = true) AS
SELECT
  prompt_version,
  count(*)                                                       AS roadmaps,
  count(*) FILTER (WHERE schema_valid)                           AS schema_valid,
  round(100.0 * count(*) FILTER (WHERE schema_valid) / count(*), 2)
                                                                 AS validity_pct,
  count(*) FILTER (WHERE schema_valid AND retry_count = 0)       AS valid_first_attempt,
  round(100.0 * count(*) FILTER (WHERE schema_valid AND retry_count = 0) / count(*), 2)
                                                                 AS first_attempt_pct,
  round(avg(retry_count), 3)                                     AS mean_retries,
  array_agg(DISTINCT model_version)                              AS model_versions
FROM roadmaps
GROUP BY prompt_version;
COMMENT ON VIEW v_schema_validation IS
  'Prompt output validity by prompt_version: overall validity, validity without a retry, and '
  'mean retries.';

-- Whether booked sessions actually happen, and how long they run.
CREATE OR REPLACE VIEW v_session_completion WITH (security_invoker = true) AS
SELECT
  count(*)                                                          AS sessions,
  count(*) FILTER (WHERE status = 'ended')                          AS sessions_ended,
  round(100.0 * count(*) FILTER (WHERE status = 'ended') / nullif(count(*), 0), 2)
                                                                    AS completion_pct,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_seconds)
    FILTER (WHERE status = 'ended')                                 AS median_duration_seconds
FROM video_sessions;
COMMENT ON VIEW v_session_completion IS
  'Session completion rate and median duration of completed sessions.';

-- Aggregates over the whole study are not for ordinary users.
REVOKE ALL ON v_bridge_funnel, v_schema_validation, v_session_completion FROM anon, authenticated;


-- =============================================================================
-- 7. SEEDS
--
-- The verified resource catalogue. prompts/validate_prompt.py reads the names
-- between the BEGIN/END markers, so the prompt allow-list and this table come
-- from one source. Where the exact programme page is not certain, the URL is
-- the organisation's own homepage; confirm each before the study starts.
-- countries '{}' means no country restriction.
-- =============================================================================

-- BEGIN verified_resources seed
INSERT INTO verified_resources (name, organisation, sector, type, countries, url) VALUES
  ('Tony Elumelu Foundation Entrepreneurship Programme', 'Tony Elumelu Foundation',
     'Entrepreneurship', 'fellowship',            '{}',
     'https://www.tonyelumelufoundation.org'),
  ('ALX Software Engineering Programme',                  'ALX Africa',
     'Technology',       'scholarship',           '{}',
     'https://www.alxafrica.com'),
  ('Google Africa Developer Scholarship',                 'Google',
     'Technology',       'scholarship',           '{}',
     'https://developers.google.com'),
  ('Andela Technical Leadership Programme',               'Andela',
     'Technology',       'fellowship',            '{}',
     'https://andela.com'),
  ('Mastercard Foundation Scholars Programme',            'Mastercard Foundation',
     NULL,               'scholarship',           '{}',
     'https://mastercardfdn.org'),
  ('Moniepoint Campus Ambassador Programme',              'Moniepoint',
     'Finance',          'ambassador_programme',  '{Nigeria}',
     'https://moniepoint.com'),
  ('PwC Africa Graduate Programme',                       'PwC',
     'Finance',          'graduate_programme',    '{Nigeria,Ghana,Kenya,Rwanda,South Africa}',
     'https://www.pwc.com'),
  ('Standard Bank Graduate Programme',                    'Standard Bank Group',
     'Finance',          'graduate_programme',    '{South Africa,Kenya,Uganda,Ghana,Nigeria}',
     'https://www.standardbank.com'),
  ('AWS Build On Africa',                                 'Amazon Web Services',
     'Technology',       'hackathon',             '{}',
     'https://aws.amazon.com'),
  ('Notion Campus Leader Programme',                      'Notion',
     'Technology',       'ambassador_programme',  '{}',
     'https://www.notion.com'),
  ('MultiChoice Talent Factory',                          'MultiChoice Group',
     'Creative',         'fellowship',            '{Nigeria,Kenya,Zambia}',
     'https://www.multichoice.com'),
  ('Nigerian Film Corporation Training Programme',        'Nigerian Film Corporation',
     'Creative',         'fellowship',            '{Nigeria}',
     'https://nfc.gov.ng')
ON CONFLICT (name) DO UPDATE SET
  organisation = EXCLUDED.organisation,
  sector       = EXCLUDED.sector,
  type         = EXCLUDED.type,
  countries    = EXCLUDED.countries,
  url          = EXCLUDED.url;
-- END verified_resources seed

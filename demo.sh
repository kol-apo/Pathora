#!/usr/bin/env bash
# =============================================================================
# demo.sh - build the Pathora research schema from scratch and run every test.
#
#   ./demo.sh
#
# Connection settings come from the standard PostgreSQL variables (see SETUP.md):
#   PGHOST (localhost)  PGPORT (5432)  PGUSER (postgres)  PGDATABASE (pathora)
#
# The target database is DROPPED and recreated. As a safeguard, demo.sh refuses
# to drop an existing database that does not look like a previous Pathora demo
# database, unless PATHORA_FORCE_DROP=1 is set.
# =============================================================================
set -uo pipefail
cd "$(dirname "$0")"

PGHOST="${PGHOST:-localhost}"; PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"; PGDATABASE="${PGDATABASE:-pathora}"
export PGHOST PGPORT PGUSER PGDATABASE
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
MAINT_DB="${PGMAINTDB:-postgres}"
PSQL="psql -X -q -t -A"

bold() { printf '\n\033[1m%s\033[0m\n' "$1"; }
q() { $PSQL -v ON_ERROR_STOP=1 -c "$1" | tr -d '\r'; }

# --- Connectivity ------------------------------------------------------------
bold "Connecting to PostgreSQL at $PGHOST:$PGPORT as $PGUSER"
if ! $PSQL -d "$MAINT_DB" -c 'SELECT 1' >/dev/null 2>&1; then
  cat <<EOF
Cannot reach PostgreSQL at $PGHOST:$PGPORT as user "$PGUSER".

  Is the server running? The quickest option is Docker:
    docker run --name pathora-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
    export PGPASSWORD=postgres

  Using a different host, port or user? Set PGHOST, PGPORT, PGUSER (and
  PGPASSWORD if needed) before running this script. See SETUP.md.
EOF
  exit 1
fi
echo "  $(q 'SELECT version()' | cut -d, -f1)"

# --- Safety check before dropping anything ----------------------------------
exists=$($PSQL -d "$MAINT_DB" -c "SELECT 1 FROM pg_database WHERE datname = '$PGDATABASE'" | tr -d '\r')
if [ "$exists" = "1" ] && [ "${PATHORA_FORCE_DROP:-0}" != "1" ]; then
  # A previous demo database has verified_resources; an empty one has no tables.
  ours=$($PSQL -d "$PGDATABASE" -c "SELECT to_regclass('public.verified_resources') IS NOT NULL
                                    OR NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public')" | tr -d '\r')
  if [ "$ours" != "t" ]; then
    echo "Refusing to drop database \"$PGDATABASE\": it has tables but is not a Pathora demo database."
    echo "Point PGDATABASE at another name, or set PATHORA_FORCE_DROP=1 if you are sure."
    exit 1
  fi
fi

# --- Build -------------------------------------------------------------------
bold "Recreating database \"$PGDATABASE\""
$PSQL -d "$MAINT_DB" -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$PGDATABASE\" WITH (FORCE)" \
  -c "CREATE DATABASE \"$PGDATABASE\"" || exit 1
echo "  done"

LOG=$(mktemp)
bold "Applying schema.sql"
if ! psql -X -q -v ON_ERROR_STOP=1 -f schema.sql >"$LOG" 2>&1; then
  echo "  schema.sql FAILED. Last lines of the log ($LOG):"
  tail -n 20 "$LOG"
  exit 1
fi
echo "  first run OK"
if ! psql -X -q -v ON_ERROR_STOP=1 -f schema.sql >"$LOG" 2>&1; then
  echo "  schema.sql FAILED on the second run, so it is not idempotent. Last lines of the log ($LOG):"
  tail -n 20 "$LOG"
  exit 1
fi
echo "  second run OK (idempotent)"
rm -f "$LOG"

# --- What was built ----------------------------------------------------------
bold "Schema contents"
$PSQL -F '|' -v ON_ERROR_STOP=1 <<'SQL' | tr -d '\r' | while IFS='|' read -r label n; do printf '  %-40s %s\n' "$label" "$n"; done
SELECT 'Tables', count(*) FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'Tables with RLS enabled', count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
UNION ALL
SELECT 'Views', count(*) FROM information_schema.views WHERE table_schema = 'public'
UNION ALL
SELECT 'Indexes (explicit)', count(*) FROM pg_indexes i
  WHERE i.schemaname = 'public'
    AND NOT EXISTS (SELECT 1 FROM pg_constraint k
                    WHERE k.conindid = format('%I.%I', i.schemaname, i.indexname)::regclass)
UNION ALL
SELECT 'Indexes (incl. PK, UNIQUE, EXCLUDE)', count(*) FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 'RLS policies', count(*) FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 'Enums', count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typtype = 'e'
UNION ALL
SELECT 'Functions (excluding extensions)', count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
UNION ALL
SELECT 'Seeded verified resources', count(*) FROM verified_resources;
SQL

# --- Tests -------------------------------------------------------------------
FAILED=0
run_suite() {
  bold "$1"
  if bash "$2"; then :; else FAILED=1; fi
}
run_suite "Suite 1/3  Concurrency: two students, one slot"      tests/db/test_concurrency.sh
run_suite "Suite 2/3  Bridge: roadmap to three consultants"     tests/db/test_bridge.sh
run_suite "Suite 3/3  Row-level security: participant privacy"  tests/db/test_rls.sh

echo
if [ "$FAILED" = "0" ]; then
  printf '\033[1m%s\033[0m\n' "ALL SUITES PASSED"
else
  printf '\033[1m%s\033[0m\n' "SOME SUITES FAILED"
  exit 1
fi

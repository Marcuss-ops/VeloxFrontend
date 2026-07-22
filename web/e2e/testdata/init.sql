-- init.sql
--
-- Mounted into Postgres's docker-entrypoint-initdb.d so it runs ONCE
-- on the very first container boot (when the e2e_db_data volume is
-- empty). InstaeditLogin and Velox DataServer apply their own schema
-- migrations on app start; this file is a schema-bootstrap allowance
-- only, NOT a full schema definition.
--
-- IMPORTANT: InstaeditLogin's migrations own the schema for
--   users / workspaces / platform_accounts / external_destinations / external_deliveries / audit_logs ...
-- against the same `e2e_db`. Both services share this DB; their internal
-- migrations coexist (separately scoped table prefixes in the live tree).
--
-- We deliberately do NOT issue CREATE EXTENSION here. The chosen image
-- (postgres:16, debian) bundles pgcrypto + uuid-ossp; if a future swap
-- drops them, the FIRST-boot failure surfaces here cleanly rather than
-- masking the issue behind a desync.
--
-- Anything we declare must be IF-NOT-EXISTS so re-running the container
-- after a partial boot is safe.

-- Notice board (test-only / visible to humans looking at the DB)
CREATE TABLE IF NOT EXISTS _e2e_meta (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO _e2e_meta (key, value) VALUES
    ('spec', 'cross_repo_smoke'),
    ('modes', 'mock=true (fast), MOCK=false (live)'),
    ('shared_secret', 'e2e-shared-secret'),
    ('jwt_secret', 'e2e-jwt-secret-do-not-reuse-in-prod'),
    ('seed_purpose', 'Seed fixture marker (live workspace + destination created by spec beforeAll via admin endpoints)')
ON CONFLICT (key) DO NOTHING;

-- The spec uses these constants:
--   PROJECT_ID = 'proj-smoke-cross-repo-1'
--   EXTERNAL_DEST_ID = 'ext-dest-youtube-channel-A'
--   EXPECTED_PROJECT_ID = 'velox-proj-777'
--   EXPECTED_JOB_ID = 'velox-job-888'
--   EXPECTED_SOCIAL_DELIVERY_ID = 'soc-del-999'
--
-- Real fixture rows are created by the spec's beforeAll via POSTs to
-- InstaeditLogin's admin endpoints. We don't hard-code user existence
-- here because (a) InstaeditLogin's migrations register schema after
-- init.sql runs, and (b) hard-coded UUIDs would clash on re-runs.
--
-- Pointer rows that document the live expected IDs for human inspection:
INSERT INTO _e2e_meta (key, value) VALUES
    ('live_test_workspace_hint', '42'),
    ('live_test_destination_hint', 'ext-dest-youtube-channel-A')
ON CONFLICT (key) DO NOTHING;

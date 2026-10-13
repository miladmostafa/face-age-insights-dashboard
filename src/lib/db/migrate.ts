export const SQLITE_MIGRATION = `
CREATE TABLE IF NOT EXISTS sites (
  id text PRIMARY KEY,
  name text NOT NULL,
  write_key_hash text NOT NULL UNIQUE,
  allowed_origins text NOT NULL DEFAULT '*',
  created_at integer NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  site_id text NOT NULL,
  type text NOT NULL,
  session_id text NOT NULL,
  language text,
  skin_age_bucket text,
  skin_health_pct integer,
  problem_keys text,
  created_at integer NOT NULL
);
CREATE INDEX IF NOT EXISTS events_site_created_idx ON events (site_id, created_at);
`;

export const POSTGRES_MIGRATION = `
CREATE TABLE IF NOT EXISTS sites (
  id text PRIMARY KEY,
  name text NOT NULL,
  write_key_hash text NOT NULL UNIQUE,
  allowed_origins text NOT NULL DEFAULT '*',
  created_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  site_id text NOT NULL,
  type text NOT NULL,
  session_id text NOT NULL,
  language text,
  skin_age_bucket text,
  skin_health_pct integer,
  problem_keys text,
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS events_site_created_idx ON events (site_id, created_at);
`;

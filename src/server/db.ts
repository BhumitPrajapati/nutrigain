import { mkdirSync } from "fs";

/** Minimal query interface shared by node-postgres (production) and PGlite (embedded Postgres, local). */
export interface Db {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
  exec: (sql: string) => Promise<void>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS app_users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  profile       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS custom_foods   JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS reminders      JSONB;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS reminder_state JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS app_push_subs (
  endpoint   TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  tz         TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_push_subs_user_idx ON app_push_subs (user_id);
CREATE TABLE IF NOT EXISTS app_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS app_sessions_user_idx ON app_sessions (user_id);
CREATE TABLE IF NOT EXISTS app_days (
  user_id    TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  log_date   TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, log_date)
);
`;

const g = globalThis as unknown as { __ngDb?: Promise<Db> };

export function db(): Promise<Db> {
  return (g.__ngDb ??= open().catch((e) => { g.__ngDb = undefined; throw e; }));
}

async function open(): Promise<Db> {
  let d: Db;
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, ssl: process.env.PGSSL === "1" ? { rejectUnauthorized: false } : undefined });
    d = { query: (s, p) => pool.query(s, p as any[]) as any, exec: async (s) => { await pool.query(s); } };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR ?? ".data/pg";
    mkdirSync(dir, { recursive: true });
    const pg = new PGlite(dir);
    await pg.waitReady;
    d = { query: (s, p) => pg.query(s, p as any[]) as any, exec: async (s) => { await pg.exec(s); } };
  }
  await d.exec(SCHEMA);
  return d;
}

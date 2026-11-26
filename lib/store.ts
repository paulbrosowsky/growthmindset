import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import type { AppState } from "./types";

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const sql = DB_URL ? neon(DB_URL) : null;
let tableReady: Promise<unknown> | null = null;

function ensureTable() {
  if (!sql) return Promise.resolve();
  tableReady ??= sql`create table if not exists kompass_users (
    username text primary key,
    state jsonb not null,
    updated_at timestamptz not null default now()
  )`;
  return tableReady;
}

// Local fallback: JSON files (on Vercel without a database only /tmp is writable).
const DIR = process.env.VERCEL ? "/tmp/kompass" : path.join(process.cwd(), ".data");

export function cleanUsername(raw: string | null | undefined): string | null {
  const u = (raw || "").trim().toLowerCase();
  return /^[a-z0-9._-]{2,30}$/.test(u) ? u : null;
}

export async function loadState(username: string): Promise<AppState | null> {
  if (sql) {
    await ensureTable();
    const rows = (await sql`select state from kompass_users where username = ${username}`) as { state: AppState }[];
    return rows[0]?.state ?? null;
  }
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, `${username}.json`), "utf8")) as AppState;
  } catch {
    return null;
  }
}

export async function saveState(username: string, state: AppState): Promise<void> {
  if (sql) {
    await ensureTable();
    await sql`insert into kompass_users (username, state, updated_at)
      values (${username}, ${JSON.stringify(state)}::jsonb, now())
      on conflict (username) do update set state = excluded.state, updated_at = now()`;
    return;
  }
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${username}.json`), JSON.stringify(state));
}

export async function deleteState(username: string): Promise<void> {
  if (sql) {
    await ensureTable();
    await sql`delete from kompass_users where username = ${username}`;
    return;
  }
  await fs.rm(path.join(DIR, `${username}.json`), { force: true });
}

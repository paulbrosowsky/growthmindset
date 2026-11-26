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

export type SharedEntry = { username: string; name: string; role: string; items: NonNullable<AppState["shared"]> };

/** Alle selbst geteilten Erfolge (für die Unternehmenssicht). Nur Name, Rolle und die freigegebenen Einträge, nichts aus dem Coach. */
/** „max.mueller“ → „Max Mueller“ */
const prettyName = (u: string) =>
  u
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");

export async function listShared(): Promise<SharedEntry[]> {
  const pick = (username: string, st: Partial<AppState> | null): SharedEntry | null =>
    st?.shared?.length ? { username, name: st.profile?.name || prettyName(username), role: st.profile?.role || "", items: st.shared } : null;
  if (sql) {
    await ensureTable();
    const rows = (await sql`select username, jsonb_build_object('profile', state->'profile', 'shared', state->'shared') as st
      from kompass_users where jsonb_array_length(coalesce(state->'shared', '[]'::jsonb)) > 0`) as { username: string; st: Partial<AppState> }[];
    return rows.map((r) => pick(r.username, r.st)).filter((x): x is SharedEntry => !!x);
  }
  let files: string[] = [];
  try {
    files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: SharedEntry[] = [];
  for (const f of files) {
    try {
      const e = pick(f.slice(0, -5), JSON.parse(await fs.readFile(path.join(DIR, f), "utf8")));
      if (e) out.push(e);
    } catch {}
  }
  return out;
}

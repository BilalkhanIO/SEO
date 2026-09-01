import { createClient, type Client, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";

let _db: Client | null = null;

export function db(): Client {
  if (!_db) {
    const cfg = loadConfig();
    try {
      if (cfg.databaseUrl.startsWith("file:") && !cfg.databaseUrl.includes(":memory:")) {
        const filePath = cfg.databaseUrl.replace(/^file:/, "");
        const dir = path.dirname(filePath);
        if (dir && !fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
      _db = createClient({ url: cfg.databaseUrl, authToken: cfg.databaseAuthToken });
    } catch (err) {
      console.warn("Libsql init failed, falling back to in-memory SQLite:", err);
      _db = createClient({ url: "file::memory:?cache=shared" });
    }
  }
  return _db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS blogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  blogger_blog_id TEXT,
  gsc_property TEXT,          -- e.g. https://example.com/ or sc-domain:example.com
  ga4_property TEXT,          -- numeric GA4 property id
  is_custom_domain INTEGER DEFAULT 0,
  niche TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id INTEGER REFERENCES blogs(id),
  keyword TEXT NOT NULL,
  source TEXT,                -- autocomplete | gsc | paa | competitor | manual | related
  intent TEXT,                -- informational | commercial | transactional | navigational
  status TEXT DEFAULT 'idea', -- idea | scored | briefed | assigned | archived
  score_relevance INTEGER,    -- 0-2 per playbook gate
  score_intent INTEGER,
  score_winnable INTEGER,
  score_traffic INTEGER,
  score_value INTEGER,
  score_total INTEGER,
  notes TEXT,
  serp_json TEXT,             -- cached SERP analysis
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(blog_id, keyword)
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id INTEGER REFERENCES blogs(id),
  keyword_id INTEGER REFERENCES keywords(id),
  title TEXT,
  url TEXT,
  blogger_post_id TEXT,
  permalink TEXT,
  stage TEXT DEFAULT 'idea',  -- idea|researched|briefed|drafted|optimized|published|indexed|tracking|refresh
  brief_md TEXT,
  published_at TEXT,
  last_refreshed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gsc_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id INTEGER REFERENCES blogs(id),
  date TEXT NOT NULL,          -- period end date (YYYY-MM-DD)
  days INTEGER NOT NULL,       -- period length
  page TEXT,
  query TEXT,
  clicks REAL, impressions REAL, ctr REAL, position REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_snap ON gsc_snapshots(blog_id, date, page);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id INTEGER REFERENCES blogs(id),
  post_url TEXT,
  type TEXT,                   -- striking_distance | ctr_fix | query_gap | second_page | decay | index_issue
  message TEXT,
  data_json TEXT,
  status TEXT DEFAULT 'open',  -- open | done | dismissed
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prospects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id INTEGER REFERENCES blogs(id),
  site_name TEXT,
  site_url TEXT NOT NULL,
  niche TEXT,
  authority INTEGER,           -- DR/DA estimate
  contact_name TEXT,
  contact_email TEXT,
  email_verified INTEGER DEFAULT 0,
  opportunity TEXT,            -- guest_post | link_insert | resource_page | collab | journalist
  status TEXT DEFAULT 'found', -- found|qualified|contacted|followup_1|followup_2|followup_3|replied|agreed|published|link_live|rejected|no_response|link_removed
  last_contact_at TEXT,
  next_action_at TEXT,
  published_url TEXT,
  link_rel TEXT,               -- dofollow | nofollow | sponsored
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

export async function migrate(): Promise<void> {
  try {
    const statements = SCHEMA.split(";").map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await db().execute(stmt);
    }
  } catch (err) {
    console.error("Migration error:", err);
  }
}

export async function all<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T[]> {
  try {
    const res = await db().execute({ sql, args });
    return (res.rows || []) as unknown as T[];
  } catch (err: any) {
    if (err?.message?.includes("no such table")) {
      await migrate();
      try {
        const retryRes = await db().execute({ sql, args });
        return (retryRes.rows || []) as unknown as T[];
      } catch (retryErr) {
        console.error("Retry all query failed:", retryErr);
      }
    }
    console.error("Query failed in all():", sql, err?.message);
    return [];
  }
}

export async function run(sql: string, args: InValue[] = []): Promise<number | bigint | undefined> {
  try {
    const res = await db().execute({ sql, args });
    return res.lastInsertRowid;
  } catch (err: any) {
    if (err?.message?.includes("no such table")) {
      await migrate();
      try {
        const retryRes = await db().execute({ sql, args });
        return retryRes.lastInsertRowid;
      } catch (retryErr) {
        console.error("Retry run query failed:", retryErr);
      }
    }
    console.error("Query failed in run():", sql, err?.message);
    return undefined;
  }
}

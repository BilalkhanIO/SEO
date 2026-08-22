/**
 * The 6 GSC money recipes (playbook §9), run against stored snapshots.
 * `seo track sync` fills gsc_snapshots; these queries turn them into actions.
 */
import { all, run } from "../store.js";

// Rough expected CTR by position (organic, 2026 post-AI-Overview baseline).
const CTR_BENCHMARK: Record<number, number> = {
  1: 0.22, 2: 0.12, 3: 0.09, 4: 0.06, 5: 0.05, 6: 0.04, 7: 0.03, 8: 0.025, 9: 0.02, 10: 0.018,
};

export interface RecipeHit {
  type: string;
  page: string;
  query?: string;
  message: string;
  data: Record<string, number | string>;
}

interface SnapRow {
  page: string; query: string;
  clicks: number; impressions: number; ctr: number; position: number;
}

async function latestPeriod(blogId: number): Promise<{ date: string; days: number } | null> {
  const rows = await all<{ date: string; days: number }>(
    "SELECT date, days FROM gsc_snapshots WHERE blog_id = ? ORDER BY date DESC LIMIT 1", [blogId]
  );
  return rows[0] || null;
}

async function periodRows(blogId: number, date: string): Promise<SnapRow[]> {
  return all<SnapRow>(
    "SELECT page, query, clicks, impressions, ctr, position FROM gsc_snapshots WHERE blog_id = ? AND date = ?",
    [blogId, date]
  );
}

export async function runRecipes(blogId: number): Promise<RecipeHit[]> {
  const period = await latestPeriod(blogId);
  if (!period) throw new Error("No GSC snapshots yet — run `seo track sync` first.");
  const rows = await periodRows(blogId, period.date);
  const hits: RecipeHit[] = [];

  // Recipe 1 — Striking distance: position 4–15, meaningful impressions
  for (const r of rows) {
    if (r.position >= 4 && r.position <= 15 && r.impressions >= 100) {
      hits.push({
        type: "striking_distance", page: r.page, query: r.query,
        message: `"${r.query}" at position ${r.position.toFixed(1)} with ${Math.round(r.impressions)} impressions — one push from top-3. Add the query to title/H2, expand that section, add 2 internal links in.`,
        data: { position: +r.position.toFixed(1), impressions: Math.round(r.impressions) },
      });
    }
  }

  // Recipe 2 — CTR fixers: ranking ≤10 but CTR below benchmark
  for (const r of rows) {
    const pos = Math.round(r.position);
    const bench = CTR_BENCHMARK[pos];
    if (bench && r.impressions >= 200 && r.ctr < bench * 0.5) {
      hits.push({
        type: "ctr_fix", page: r.page, query: r.query,
        message: `"${r.query}" ranks ~${pos} but CTR is ${(r.ctr * 100).toFixed(1)}% (benchmark ~${(bench * 100).toFixed(0)}%). Rewrite the title (number/bracket/year/benefit) and search description.`,
        data: { position: pos, ctr: +(r.ctr * 100).toFixed(1), benchmark: +(bench * 100).toFixed(1) },
      });
    }
  }

  // Recipe 4 — Second-page queries per post (11–30, impressions): add a section
  const byPage = new Map<string, SnapRow[]>();
  for (const r of rows) {
    if (!byPage.has(r.page)) byPage.set(r.page, []);
    byPage.get(r.page)!.push(r);
  }
  for (const [page, prs] of byPage) {
    const secondPage = prs.filter((r) => r.position > 10 && r.position <= 30 && r.impressions >= 50);
    if (secondPage.length >= 3) {
      const qs = secondPage.slice(0, 8).map((r) => r.query).join(" · ");
      hits.push({
        type: "second_page", page,
        message: `${secondPage.length} queries at position 11–30 with impressions. Add sections covering: ${qs}`,
        data: { count: secondPage.length },
      });
    }
  }

  // Recipe 5 — Decay: compare against a snapshot ~90 days older, per page
  const prevRows = await all<{ date: string }>(
    "SELECT DISTINCT date FROM gsc_snapshots WHERE blog_id = ? AND date <= date(?, '-60 days') ORDER BY date DESC LIMIT 1",
    [blogId, period.date]
  );
  if (prevRows[0]) {
    const prev = await periodRows(blogId, prevRows[0].date);
    const clicksNow = sumByPage(rows);
    const clicksPrev = sumByPage(prev);
    for (const [page, prevClicks] of clicksPrev) {
      const now = clicksNow.get(page) || 0;
      if (prevClicks >= 20 && now < prevClicks * 0.75) {
        hits.push({
          type: "decay", page,
          message: `Clicks dropped ${Math.round((1 - now / prevClicks) * 100)}% (${Math.round(prevClicks)} → ${Math.round(now)}) vs the ${prevRows[0].date} period. Refresh before decline compounds.`,
          data: { before: Math.round(prevClicks), after: Math.round(now) },
        });
      }
    }
  }

  return hits;
}

function sumByPage(rows: SnapRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.page, (m.get(r.page) || 0) + r.clicks);
  return m;
}

export async function saveAlerts(blogId: number, hits: RecipeHit[]): Promise<number> {
  let saved = 0;
  for (const h of hits) {
    const dupe = await all(
      "SELECT id FROM alerts WHERE blog_id = ? AND post_url = ? AND type = ? AND status = 'open' AND ifnull(message,'') = ?",
      [blogId, h.page, h.type, h.message]
    );
    if (dupe.length) continue;
    await run(
      "INSERT INTO alerts (blog_id, post_url, type, message, data_json) VALUES (?, ?, ?, ?, ?)",
      [blogId, h.page, h.type, h.message, JSON.stringify(h.data)]
    );
    saved++;
  }
  return saved;
}

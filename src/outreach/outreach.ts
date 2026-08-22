/**
 * Outreach CRM (playbook §11): prospect pipeline + auto-computed follow-up dates.
 * Cadence encoded: follow-ups at +4 and +7 days, stop after 3 touches.
 */
import { all, run } from "../store.js";

export const PIPELINE = [
  "found", "qualified", "contacted", "followup_1", "followup_2", "followup_3",
  "replied", "agreed", "published", "link_live", "rejected", "no_response", "link_removed",
] as const;
export type ProspectStatus = (typeof PIPELINE)[number];

// Days until the next action, per status.
const NEXT_ACTION_DAYS: Partial<Record<ProspectStatus, number>> = {
  found: 2,        // qualify it
  qualified: 2,    // send first email
  contacted: 4,    // follow-up 1 after 4 days
  followup_1: 5,   // follow-up 2 after 5 more
  followup_2: 7,   // final follow-up after 7 more
  followup_3: 7,   // then mark no_response
  replied: 2,      // answer them!
  agreed: 7,       // deliver the draft
  published: 3,    // verify link live + rel attribute
  link_live: 90,   // re-verify quarterly
};

function nextActionDate(status: ProspectStatus, from = new Date()): string | null {
  const days = NEXT_ACTION_DAYS[status];
  if (days == null) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function addProspect(p: {
  blogId: number; siteUrl: string; siteName?: string; niche?: string;
  authority?: number; contactName?: string; contactEmail?: string;
  opportunity?: string; notes?: string;
}): Promise<void> {
  await run(
    `INSERT INTO prospects (blog_id, site_url, site_name, niche, authority, contact_name, contact_email, opportunity, notes, status, next_action_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'found', ?)`,
    [p.blogId, p.siteUrl, p.siteName ?? null, p.niche ?? null, p.authority ?? null,
     p.contactName ?? null, p.contactEmail ?? null, p.opportunity ?? "guest_post", p.notes ?? null,
     nextActionDate("found")]
  );
}

export async function setStatus(id: number, status: ProspectStatus, extra: { publishedUrl?: string; linkRel?: string; note?: string } = {}): Promise<void> {
  if (!PIPELINE.includes(status)) throw new Error(`Invalid status. One of: ${PIPELINE.join(", ")}`);
  const touch = ["contacted", "followup_1", "followup_2", "followup_3"].includes(status);
  await run(
    `UPDATE prospects SET status = ?, next_action_at = ?,
       last_contact_at = CASE WHEN ? THEN datetime('now') ELSE last_contact_at END,
       published_url = COALESCE(?, published_url),
       link_rel = COALESCE(?, link_rel),
       notes = CASE WHEN ? IS NOT NULL THEN COALESCE(notes,'') || char(10) || date('now') || ': ' || ? ELSE notes END
     WHERE id = ?`,
    [status, nextActionDate(status), touch ? 1 : 0, extra.publishedUrl ?? null, extra.linkRel ?? null,
     extra.note ?? null, extra.note ?? null, id]
  );
}

export async function dueToday(blogId?: number) {
  const where = blogId ? "AND blog_id = ?" : "";
  const args = blogId ? [blogId] : [];
  return all(
    `SELECT id, site_name, site_url, contact_email, opportunity, status, last_contact_at, next_action_at
     FROM prospects
     WHERE status NOT IN ('rejected','no_response','link_removed','link_live')
       AND next_action_at IS NOT NULL AND next_action_at <= date('now') ${where}
     ORDER BY next_action_at ASC`,
    args
  );
}

export async function listProspects(blogId?: number, status?: string) {
  const clauses: string[] = [];
  const args: (number | string)[] = [];
  if (blogId) { clauses.push("blog_id = ?"); args.push(blogId); }
  if (status) { clauses.push("status = ?"); args.push(status); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all(
    `SELECT id, site_name, site_url, authority, contact_email, opportunity, status, next_action_at, published_url, link_rel
     FROM prospects ${where} ORDER BY next_action_at ASC NULLS LAST, id DESC`,
    args
  );
}

/**
 * Pre-publish on-page validation gate (playbook §4 stage 5).
 * Blocks publishing until every rule passes or is explicitly waived.
 */
import * as cheerio from "cheerio";

export interface ValidationIssue {
  rule: string;
  level: "error" | "warn";
  message: string;
}

export interface PostInput {
  title: string;
  html: string;
  searchDescription?: string;
  permalinkSet?: boolean; // custom permalink confirmed in Blogger editor before publish
  keyword?: string;
}

export function validatePost(post: PostInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (rule: string, level: "error" | "warn", message: string) => issues.push({ rule, level, message });

  // Title
  const t = post.title.trim();
  if (t.length < 40 || t.length > 60)
    push("title-length", t.length > 70 || t.length < 25 ? "error" : "warn",
      `Title is ${t.length} chars — target 40–60 (best CTR range).`);
  if (post.keyword && !t.toLowerCase().includes(post.keyword.toLowerCase().split(" ").slice(0, 3).join(" ")))
    push("title-keyword", "warn", "Title doesn't appear to contain the target keyword (or its head).");

  // Search description
  const d = (post.searchDescription || "").trim();
  if (!d) push("search-description", "error", "Search Description missing — fill Blogger's per-post box (~150 chars, keyword + benefit).");
  else if (d.length > 160) push("search-description", "warn", `Search Description is ${d.length} chars — keep ≤160 or Google truncates it.`);

  // Permalink
  if (!post.permalinkSet)
    push("permalink", "error", "Custom permalink not confirmed. Set it in the Blogger editor BEFORE publishing — it cannot be changed after.");

  const $ = cheerio.load(post.html);
  const text = $.root().text().replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;

  // Headings
  const h1 = $("h1").length;
  if (h1 > 0) push("h1", "warn", `${h1} <h1> found in the body — Blogger renders the post title as H1; body should start at <h2>.`);
  if ($("h2").length === 0) push("h2", "error", "No <h2> headings — structure the post for skimming.");

  // First-100-words keyword
  if (post.keyword) {
    const first100 = text.split(" ").slice(0, 100).join(" ").toLowerCase();
    if (!first100.includes(post.keyword.toLowerCase()))
      push("keyword-early", "warn", "Target keyword not in the first 100 words — answer the query up front.");
  }

  // Links
  const links = $("a[href]").toArray().map((a) => $(a).attr("href") || "");
  const internal = links.filter((h) => h.startsWith("/") || h.includes("INTERNAL"));
  const external = links.filter((h) => h.startsWith("http"));
  const expectedInternal = Math.max(3, Math.round((words / 1000) * 3));
  if (internal.length + external.length === 0) push("links", "error", "No links at all — add internal links to related posts and 2–5 authoritative external sources.");
  else {
    if (internal.length < expectedInternal)
      push("internal-links", "warn", `${internal.length} internal link(s) — target 3–6 per 1,000 words (~${expectedInternal} here). Also add links FROM 2–3 older posts to this one.`);
    if (external.length < 2) push("external-links", "warn", `${external.length} external link(s) — cite 2–5 authoritative sources.`);
  }

  // Images
  const imgs = $("img").toArray();
  const missingAlt = imgs.filter((i) => !$(i).attr("alt")?.trim()).length;
  if (imgs.length === 0) push("images", "warn", "No images — original images/screenshots are an information-gain signal.");
  else if (missingAlt > 0) push("alt-text", "error", `${missingAlt} image(s) missing alt text.`);

  // Length sanity
  if (words < 500) push("length", "warn", `Only ~${words} words — fine if the query is fully answered, but check the SERP median.`);

  return issues;
}

export function formatIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) return "✅ All pre-publish checks passed.";
  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warn");
  const lines: string[] = [];
  if (errors.length) {
    lines.push(`❌ ${errors.length} blocking issue(s):`);
    for (const i of errors) lines.push(`   [${i.rule}] ${i.message}`);
  }
  if (warns.length) {
    lines.push(`⚠️  ${warns.length} warning(s):`);
    for (const i of warns) lines.push(`   [${i.rule}] ${i.message}`);
  }
  return lines.join("\n");
}

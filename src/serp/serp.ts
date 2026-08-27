/**
 * SERP analysis (playbook §5): top-10 fetch via Serper.dev (2,500 free credits),
 * plus heading extraction from the ranking pages for outline/gap analysis.
 */
import * as cheerio from "cheerio";
import { loadConfig } from "../config.js";

export interface SerpResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
  headings?: string[];
  wordCount?: number;
}

export interface SerpAnalysis {
  keyword: string;
  results: SerpResult[];
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  fetchedAt: string;
}

export async function fetchSerp(keyword: string, opts: { gl?: string; hl?: string } = {}): Promise<SerpAnalysis> {
  const cfg = loadConfig();
  if (!cfg.serperApiKey) {
    throw new Error(
      "SERPER_API_KEY not set. Get 2,500 free credits at https://serper.dev and add the key to .env — or analyze the SERP manually (search the keyword in an incognito window)."
    );
  }
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": cfg.serperApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: keyword, gl: opts.gl || "us", hl: opts.hl || "en", num: 10 }),
  });
  if (!res.ok) throw new Error(`Serper ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as any;

  return {
    keyword,
    results: (data.organic || []).map((r: any, i: number) => ({
      position: r.position ?? i + 1,
      title: r.title || "",
      url: r.link || "",
      snippet: r.snippet || "",
    })),
    peopleAlsoAsk: (data.peopleAlsoAsk || []).map((p: any) => p.question).filter(Boolean),
    relatedSearches: (data.relatedSearches || []).map((r: any) => r.query).filter(Boolean),
    fetchedAt: new Date().toISOString(),
  };
}

/** Fetch a competitor page and extract its headings + rough word count. */
export async function extractPage(url: string): Promise<{ headings: string[]; wordCount: number }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36" },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, aside").remove();

  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const tag = (el as any).tagName?.toUpperCase() || (el as any).name?.toUpperCase();
    if (!tag) return;
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text && text.length < 200) headings.push(`${tag}: ${text}`);
  });

  const text = $("body").text().replace(/\s+/g, " ").trim();
  return { headings, wordCount: text ? text.split(" ").length : 0 };
}

/** Enrich the top N results with headings + word counts (sequential, polite). */
export async function enrichSerp(analysis: SerpAnalysis, topN = 5): Promise<SerpAnalysis> {
  for (const r of analysis.results.slice(0, topN)) {
    try {
      const page = await extractPage(r.url);
      r.headings = page.headings;
      r.wordCount = page.wordCount;
    } catch {
      r.headings = [];
    }
    await new Promise((s) => setTimeout(s, 800));
  }
  return analysis;
}

/** Build the brief skeleton from a SERP analysis (playbook stage 3). */
export function briefFromSerp(a: SerpAnalysis): string {
  const withCounts = a.results.filter((r) => r.wordCount);
  const median = withCounts.length
    ? withCounts.map((r) => r.wordCount!).sort((x, y) => x - y)[Math.floor(withCounts.length / 2)]
    : null;

  const allHeadings = a.results.flatMap((r) => r.headings || []);
  const lines: string[] = [];
  lines.push(`# Content brief: ${a.keyword}`);
  lines.push("");
  lines.push(`- Target keyword: **${a.keyword}**`);
  lines.push(`- SERP median length: ${median ? `~${median} words` : "unknown (enrich failed)"} — target ±20%, completeness over padding`);
  lines.push("- Intent: <fill: informational / commercial — judge from the results below>");
  lines.push("- Format to match: <fill: guide / listicle / review — the dominant top-10 format>");
  lines.push("- THE GAP (2–3 things no top-10 result has): <fill — this is the whole point>");
  lines.push("");
  lines.push("## Top 10 today");
  for (const r of a.results) {
    lines.push(`${r.position}. [${r.title}](${r.url})${r.wordCount ? ` — ~${r.wordCount}w` : ""}`);
  }
  lines.push("");
  if (a.peopleAlsoAsk.length) {
    lines.push("## People Also Ask (use as H2s / FAQ)");
    for (const q of a.peopleAlsoAsk) lines.push(`- ${q}`);
    lines.push("");
  }
  if (a.relatedSearches.length) {
    lines.push("## Related searches (secondary keywords / internal-link targets)");
    for (const q of a.relatedSearches) lines.push(`- ${q}`);
    lines.push("");
  }
  if (allHeadings.length) {
    lines.push("## Union of competitor headings (cover everything, then beat it)");
    for (const h of allHeadings) lines.push(`- ${h}`);
  }
  return lines.join("\n");
}

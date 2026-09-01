import { google } from "googleapis";
import { getOAuthClient } from "./auth.js";

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface StrikingOpportunity {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  potentialClicks: number;
  recommendation: string;
}

function sc() {
  return google.searchconsole({ version: "v1", auth: getOAuthClient() as any });
}

export async function listSites(): Promise<string[]> {
  try {
    const res = await sc().sites.list();
    return (res.data.siteEntry || []).map((s) => s.siteUrl || "").filter(Boolean);
  } catch (err: any) {
    console.warn("Notice: GSC sites listing warning:", err.message);
    return [];
  }
}

export async function queryAnalytics(opts: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions: ("query" | "page" | "date" | "country" | "device")[];
  rowLimit?: number;
  pageFilter?: string;
}): Promise<GscRow[]> {
  const body: Record<string, unknown> = {
    startDate: opts.startDate,
    endDate: opts.endDate,
    dimensions: opts.dimensions,
    rowLimit: opts.rowLimit ?? 5000,
  };
  if (opts.pageFilter) {
    body.dimensionFilterGroups = [
      { filters: [{ dimension: "page", operator: "equals", expression: opts.pageFilter }] },
    ];
  }
  const res = await sc().searchanalytics.query({ siteUrl: opts.siteUrl, requestBody: body });
  return (res.data.rows || []).map((r) => ({
    keys: r.keys || [],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  }));
}

/**
 * Identify "Striking Distance" keywords (Positions 4 to 20 with high impressions)
 */
export async function getStrikingDistanceKeywords(
  siteUrl: string,
  days: number = 28
): Promise<StrikingOpportunity[]> {
  try {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

    const rows = await queryAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ["query", "page"],
      rowLimit: 1000,
    });

    const opportunities: StrikingOpportunity[] = [];

    for (const r of rows) {
      const query = r.keys[0] || "";
      const page = r.keys[1] || "";
      const pos = parseFloat(r.position.toFixed(1));
      const imp = Math.round(r.impressions);
      const clicks = Math.round(r.clicks);
      const ctr = parseFloat((r.ctr * 100).toFixed(2));

      // Filter: Striking distance is position 4 to 20 with at least 20 impressions
      if (pos >= 4.0 && pos <= 20.0 && imp >= 20) {
        // Potential clicks if boosted to top 3 (estimated 18% CTR)
        const potentialClicks = Math.round(imp * 0.18) - clicks;

        let recommendation = "Add keyword to H2 and intro paragraph.";
        if (pos >= 4 && pos <= 7) {
          recommendation = "Near page 1 top! Add an FAQ schema and 1 internal link with exact anchor text.";
        } else if (pos >= 8 && pos <= 12) {
          recommendation = "On page 1 threshold! Add 300 words of targeted content and 1 detailed comparison table.";
        } else {
          recommendation = "On page 2. Refresh title tag with higher CTR modifiers (2026, Best, Step-by-Step).";
        }

        opportunities.push({
          query,
          page,
          impressions: imp,
          clicks,
          ctr,
          position: pos,
          potentialClicks: Math.max(5, potentialClicks),
          recommendation,
        });
      }
    }

    return opportunities.sort((a, b) => b.impressions - a.impressions);
  } catch (err: any) {
    console.warn("Notice: Striking distance calculation fallback:", err.message);
    return [];
  }
}

export async function inspectUrl(siteUrl: string, inspectionUrl: string) {
  const res = await sc().urlInspection.index.inspect({
    requestBody: { siteUrl, inspectionUrl, languageCode: "en-US" },
  });
  const r = res.data.inspectionResult;
  return {
    verdict: r?.indexStatusResult?.verdict || "UNKNOWN",
    coverageState: r?.indexStatusResult?.coverageState || "",
    lastCrawl: r?.indexStatusResult?.lastCrawlTime || null,
    canonical: r?.indexStatusResult?.googleCanonical || null,
    robotsTxtState: r?.indexStatusResult?.robotsTxtState || null,
    richResults: r?.richResultsResult?.verdict || null,
  };
}

export async function submitSitemap(siteUrl: string, feedpath: string): Promise<void> {
  await sc().sitemaps.submit({ siteUrl, feedpath });
}

/**
 * Automatically submit all required Blogger sitemaps
 */
export async function submitDefaultSitemaps(siteUrl: string): Promise<string[]> {
  const sitemaps = [
    "atom.xml?redirect=false&start-index=1&max-results=500",
    "sitemap.xml",
    "feeds/posts/default?alt=rss",
  ];
  const submitted: string[] = [];

  for (const sm of sitemaps) {
    try {
      await submitSitemap(siteUrl, sm);
      submitted.push(sm);
    } catch (err: any) {
      console.warn(`Sitemap submit notice for ${sm}:`, err.message);
    }
  }

  return submitted;
}

export async function listSitemaps(siteUrl: string) {
  try {
    const res = await sc().sitemaps.list({ siteUrl });
    return (res.data.sitemap || []).map((s) => ({
      path: s.path,
      lastSubmitted: s.lastSubmitted,
      errors: s.errors,
      warnings: s.warnings,
      isPending: s.isPending,
    }));
  } catch (err: any) {
    console.warn("Notice: Sitemaps list warning:", err.message);
    return [];
  }
}

export async function requestGoogleIndexing(
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"
): Promise<any> {
  const auth = getOAuthClient() as any;
  const token = await auth.getAccessToken();

  const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.token}`,
    },
    body: JSON.stringify({
      url,
      type,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Indexing API Error: ${res.status} ${errText}`);
  }

  return await res.json();
}

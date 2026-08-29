import { google } from "googleapis";
import { getOAuthClient } from "./auth.js";

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function sc() {
  return google.searchconsole({ version: "v1", auth: getOAuthClient() as any });
}

export async function listSites(): Promise<string[]> {
  const res = await sc().sites.list();
  return (res.data.siteEntry || []).map((s) => s.siteUrl || "").filter(Boolean);
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

export async function listSitemaps(siteUrl: string) {
  const res = await sc().sitemaps.list({ siteUrl });
  return (res.data.sitemap || []).map((s) => ({
    path: s.path,
    lastSubmitted: s.lastSubmitted,
    errors: s.errors,
    warnings: s.warnings,
    isPending: s.isPending,
  }));
}

export async function requestGoogleIndexing(url: string, type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"): Promise<any> {
  const auth = getOAuthClient() as any;
  const token = await auth.getAccessToken();
  
  const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token.token}`
    },
    body: JSON.stringify({
      url,
      type
    })
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Indexing API Error: ${res.status} ${errText}`);
  }
  
  return await res.json();
}


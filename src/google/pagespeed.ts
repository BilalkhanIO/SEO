import { loadConfig } from "../config.js";

export interface PageSpeedResult {
  url: string;
  strategy: string;
  performance: number | null;
  seo: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  fieldData: boolean;
  topOpportunities: string[];
}

export async function runPageSpeed(url: string, strategy: "mobile" | "desktop" = "mobile"): Promise<PageSpeedResult> {
  const cfg = loadConfig();
  const params = new URLSearchParams({ url, strategy });
  params.append("category", "performance");
  params.append("category", "seo");
  if (cfg.pagespeedApiKey) params.set("key", cfg.pagespeedApiKey);

  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`);
  if (!res.ok) throw new Error(`PageSpeed API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as any;
  const lh = data.lighthouseResult;
  const audits = lh?.audits || {};

  const opportunities = Object.values(audits)
    .filter((a: any) => a.details?.type === "opportunity" && (a.details?.overallSavingsMs || 0) > 100)
    .sort((a: any, b: any) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
    .slice(0, 5)
    .map((a: any) => `${a.title} (~${Math.round(a.details.overallSavingsMs)}ms)`);

  return {
    url,
    strategy,
    performance: lh?.categories?.performance?.score != null ? Math.round(lh.categories.performance.score * 100) : null,
    seo: lh?.categories?.seo?.score != null ? Math.round(lh.categories.seo.score * 100) : null,
    lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
    tbtMs: audits["total-blocking-time"]?.numericValue ?? null,
    fieldData: !!data.loadingExperience?.metrics,
    topOpportunities: opportunities,
  };
}

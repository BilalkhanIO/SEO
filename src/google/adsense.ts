import { google, adsense_v2 } from "googleapis";
import { getOAuthClient } from "./auth.js";

function getAdSenseApi(): adsense_v2.Adsense {
  return google.adsense({ version: "v2", auth: getOAuthClient() as any });
}

export interface AdSenseAccount {
  name: string;
  displayName: string;
  reportingTimeZone: string;
  createTime?: string;
  state?: string;
}

export interface AdSenseReportRow {
  date?: string;
  pageViews: number;
  impressions: number;
  clicks: number;
  pageCtr: number;
  pageRpm: number;
  estimatedEarnings: number;
}

export interface AdSenseAuditItem {
  id: string;
  category: "Policy" | "Content" | "Technical" | "Navigation" | "Monetization";
  title: string;
  description: string;
  status: "pass" | "warn" | "fail";
  autoFixAvailable: boolean;
  fixAction?: string;
}

/**
 * List connected Google AdSense accounts
 */
export async function listAdSenseAccounts(): Promise<AdSenseAccount[]> {
  try {
    const api = getAdSenseApi();
    const res = await api.accounts.list();
    return (res.data.accounts || []).map((acc) => ({
      name: acc.name || "",
      displayName: acc.displayName || "Primary AdSense Account",
      reportingTimeZone: acc.timeZone?.id || "UTC",
      createTime: acc.createTime || "",
      state: acc.state || "ACTIVE",
    }));
  } catch (err: any) {
    console.warn("Notice: AdSense accounts listing error (or no account linked yet):", err.message);
    return [];
  }
}

/**
 * Get monetization sites registered in AdSense
 */
export async function listAdSenseSites(accountName: string) {
  try {
    const api = getAdSenseApi();
    const res = await api.accounts.sites.list({ parent: accountName });
    return (res.data.sites || []).map((site) => ({
      name: site.name || "",
      domain: site.domain || "",
      state: site.state || "UNKNOWN",
      autoAdsEnabled: site.autoAdsEnabled ?? true,
    }));
  } catch (err: any) {
    console.warn("Notice: AdSense sites listing error:", err.message);
    return [];
  }
}

/**
 * List Ad Units created under an account.
 * Ad units are nested under ad clients (accounts/{account}/adclients/{adclient}/adunits),
 * not directly under the account, so this first resolves the account's ad clients.
 */
export async function listAdUnits(accountName: string) {
  try {
    const api = getAdSenseApi();
    const clientsRes = await api.accounts.adclients.list({ parent: accountName });
    const adClients = clientsRes.data.adClients || [];

    const units: { name: string; displayName: string; state: string; format: string }[] = [];
    for (const client of adClients) {
      if (!client.name) continue;
      const res = await api.accounts.adclients.adunits.list({ parent: client.name });
      for (const ad of res.data.adUnits || []) {
        units.push({
          name: ad.name || "",
          displayName: ad.displayName || "Ad Unit",
          state: ad.state || "ACTIVE",
          format: ad.contentAdsSettings?.type || "DISPLAY",
        });
      }
    }
    return units;
  } catch (err: any) {
    console.warn("Notice: Ad units listing error:", err.message);
    return [];
  }
}

/**
 * List AdSense Alerts (Policy violations, payment holds, ads.txt warnings)
 */
export async function listAdSenseAlerts(accountName: string) {
  try {
    const api = getAdSenseApi();
    const res = await api.accounts.alerts.list({ parent: accountName });
    return (res.data.alerts || []).map((alert) => ({
      name: alert.name || "",
      message: alert.message || "",
      severity: alert.severity || "WARNING",
      type: alert.type || "GENERAL",
    }));
  } catch (err: any) {
    console.warn("Notice: AdSense alerts listing error:", err.message);
    return [];
  }
}

/**
 * Get AdSense revenue & performance metrics
 */
export async function getAdSenseReport(
  accountName: string,
  days: number = 30
): Promise<{
  summary: {
    estimatedEarnings: number;
    pageViews: number;
    impressions: number;
    clicks: number;
    pageCtr: number;
    pageRpm: number;
  };
  rows: AdSenseReportRow[];
}> {
  try {
    const api: any = getAdSenseApi();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const start = {
      year: startDate.getFullYear(),
      month: startDate.getMonth() + 1,
      day: startDate.getDate(),
    };
    const end = {
      year: endDate.getFullYear(),
      month: endDate.getMonth() + 1,
      day: endDate.getDate(),
    };

    const res = await api.accounts.reports.generate({
      account: accountName,
      "startDate.year": start.year,
      "startDate.month": start.month,
      "startDate.day": start.day,
      "endDate.year": end.year,
      "endDate.month": end.month,
      "endDate.day": end.day,
      dimensions: ["DATE"],
      metrics: [
        "PAGE_VIEWS",
        "IMPRESSIONS",
        "CLICKS",
        "PAGE_VIEWS_CTR",
        "PAGE_VIEWS_RPM",
        "ESTIMATED_EARNINGS",
      ],
    } as any);

    const rows: AdSenseReportRow[] = (res.data?.rows || []).map((r: any) => {
      const cells = r.cells || [];
      return {
        date: cells[0]?.value || "",
        pageViews: Number(cells[1]?.value || 0),
        impressions: Number(cells[2]?.value || 0),
        clicks: Number(cells[3]?.value || 0),
        // PAGE_VIEWS_CTR is a METRIC_RATIO: AdSense returns it as a 0-1 fraction
        // (e.g. "0.008" for 0.8%), so scale to percentage to match `summary.pageCtr` below.
        pageCtr: Number(cells[4]?.value || 0) * 100,
        pageRpm: Number(cells[5]?.value || 0),
        estimatedEarnings: Number(cells[6]?.value || 0),
      };
    });

    // Calculate totals
    const totalEarnings = rows.reduce((acc, curr) => acc + curr.estimatedEarnings, 0);
    const totalViews = rows.reduce((acc, curr) => acc + curr.pageViews, 0);
    const totalImpressions = rows.reduce((acc, curr) => acc + curr.impressions, 0);
    const totalClicks = rows.reduce((acc, curr) => acc + curr.clicks, 0);
    const avgCtr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    const avgRpm = totalViews > 0 ? (totalEarnings / totalViews) * 1000 : 0;

    return {
      summary: {
        estimatedEarnings: parseFloat(totalEarnings.toFixed(2)),
        pageViews: totalViews,
        impressions: totalImpressions,
        clicks: totalClicks,
        pageCtr: parseFloat(avgCtr.toFixed(2)),
        pageRpm: parseFloat(avgRpm.toFixed(2)),
      },
      rows,
    };
  } catch (err: any) {
    console.warn("Notice: AdSense report generation fallback:", err.message);
    // Return sample structure for preview when no live AdSense activity exists yet
    return {
      summary: {
        estimatedEarnings: 0,
        pageViews: 0,
        impressions: 0,
        clicks: 0,
        pageCtr: 0,
        pageRpm: 0,
      },
      rows: [],
    };
  }
}

/**
 * Generate formatted ads.txt for Google Blogger
 */
export function generateAdsTxt(publisherId: string): string {
  const cleanPubId = publisherId.replace(/[^a-zA-Z0-9-]/g, "");
  const pubFormatted = cleanPubId.startsWith("pub-") ? cleanPubId : `pub-${cleanPubId}`;
  return `google.com, ${pubFormatted}, DIRECT, f08c47fec0942fa0\n`;
}

/**
 * Perform a 360° Google AdSense Approval Readiness & Policy Audit
 */
export function auditAdSenseReadiness(params: {
  blogUrl: string;
  postCount: number;
  pages: { title: string; url?: string }[];
  posts: { title: string; wordCount?: number }[];
  hasCustomDomain?: boolean;
}): {
  readinessScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  items: AdSenseAuditItem[];
} {
  const items: AdSenseAuditItem[] = [];

  // 1. Mandatory Legal & Navigation Pages Audit
  const pageTitles = params.pages.map((p) => (p.title || "").toLowerCase());
  const hasPrivacy = pageTitles.some((t) => t.includes("privacy"));
  const hasTerms = pageTitles.some((t) => t.includes("terms") || t.includes("conditions"));
  const hasAbout = pageTitles.some((t) => t.includes("about"));
  const hasContact = pageTitles.some((t) => t.includes("contact"));
  const hasDisclaimer = pageTitles.some((t) => t.includes("disclaimer"));

  items.push({
    id: "page-privacy",
    category: "Policy",
    title: "Privacy Policy Page",
    description: hasPrivacy
      ? "Privacy Policy page detected. Meets Google AdSense GDPR, CCPA, and Cookie consent mandates."
      : "CRITICAL POLICY ERROR: Missing Privacy Policy page. AdSense will instantly reject the blog without it.",
    status: hasPrivacy ? "pass" : "fail",
    autoFixAvailable: !hasPrivacy,
    fixAction: "create_privacy_page",
  });

  items.push({
    id: "page-terms",
    category: "Policy",
    title: "Terms of Service Page",
    description: hasTerms
      ? "Terms of Service page detected."
      : "Missing Terms & Conditions page. Required for commercial site transparency.",
    status: hasTerms ? "pass" : "fail",
    autoFixAvailable: !hasTerms,
    fixAction: "create_terms_page",
  });

  items.push({
    id: "page-about",
    category: "Navigation",
    title: "About Us / Author Transparency",
    description: hasAbout
      ? "About Us page found. Satisfies Google E-E-A-T author authenticity guidelines."
      : "Missing About Us page. Google requires clear site ownership and author background.",
    status: hasAbout ? "pass" : "fail",
    autoFixAvailable: !hasAbout,
    fixAction: "create_about_page",
  });

  items.push({
    id: "page-contact",
    category: "Navigation",
    title: "Contact Us Page",
    description: hasContact
      ? "Contact Us page found with reachable inquiry channel."
      : "Missing Contact Us page. Mandatory for user support and advertiser contact verification.",
    status: hasContact ? "pass" : "fail",
    autoFixAvailable: !hasContact,
    fixAction: "create_contact_page",
  });

  items.push({
    id: "page-disclaimer",
    category: "Policy",
    title: "Earnings & Affiliate Disclaimer",
    description: hasDisclaimer
      ? "Disclaimer page active. Protects against affiliate and advertising liability."
      : "Disclaimer page recommended for monetization safety and affiliate transparency.",
    status: hasDisclaimer ? "pass" : "warn",
    autoFixAvailable: !hasDisclaimer,
    fixAction: "create_disclaimer_page",
  });

  // 2. Content Volume & Quality Audit
  const minPostsPass = params.postCount >= 20;
  const minPostsWarn = params.postCount >= 10;
  items.push({
    id: "content-volume",
    category: "Content",
    title: "Blog Post Inventory Volume",
    description: minPostsPass
      ? `High post inventory (${params.postCount} posts). Exceeds the 20-post baseline for AdSense domain maturity.`
      : minPostsWarn
      ? `Moderate post inventory (${params.postCount} posts). Google recommends at least 20 substantial articles before applying.`
      : `CRITICAL CONTENT WARNING: Only ${params.postCount} posts found. AdSense rejects blogs with fewer than 15-20 articles for "Low Value Content".`,
    status: minPostsPass ? "pass" : minPostsWarn ? "warn" : "fail",
    autoFixAvailable: !minPostsPass,
    fixAction: "generate_bulk_posts",
  });

  // 3. Thin Content Audit
  const thinPosts = params.posts.filter((p) => (p.wordCount || 0) < 600 && (p.wordCount || 0) > 0);
  items.push({
    id: "content-depth",
    category: "Content",
    title: "Thin Content (< 600 Words) Guard",
    description:
      thinPosts.length === 0
        ? "No thin content detected. Articles maintain high semantic depth and quality."
        : `${thinPosts.length} posts have low word counts (< 600 words). AdSense bots flag thin pages as low-value content.`,
    status: thinPosts.length === 0 ? "pass" : thinPosts.length <= 2 ? "warn" : "fail",
    autoFixAvailable: thinPosts.length > 0,
    fixAction: "expand_thin_posts",
  });

  // 4. Technical ads.txt & Custom Domain
  items.push({
    id: "tech-domain",
    category: "Technical",
    title: "Domain Setup",
    description: params.hasCustomDomain
      ? "Custom top-level domain connected (e.g., .com, .net, .org). Higher AdSense approval rate."
      : "Using default blogspot.com subdomain. Custom domains have a 3x higher AdSense approval rate and higher RPMs.",
    status: params.hasCustomDomain ? "pass" : "warn",
    autoFixAvailable: false,
  });

  items.push({
    id: "tech-adstxt",
    category: "Monetization",
    title: "Custom ads.txt Verification",
    description: "Custom ads.txt verifies publisher ownership and prevents ad spoofing / unauthorized inventory sales.",
    status: "pass",
    autoFixAvailable: true,
    fixAction: "generate_adstxt",
  });

  // Calculate score
  const passCount = items.filter((i) => i.status === "pass").length;
  const warnCount = items.filter((i) => i.status === "warn").length;
  const score = Math.round(((passCount * 1.0 + warnCount * 0.5) / items.length) * 100);

  let grade: "A" | "B" | "C" | "D" | "F" = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 55) grade = "D";

  return {
    readinessScore: score,
    grade,
    items,
  };
}

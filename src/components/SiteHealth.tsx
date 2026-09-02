import React, { useState } from "react";
import { Blog, PageSpeedData } from "../types.js";
import {
  Activity,
  Zap,
  Gauge,
  Search,
  CheckCircle2,
  AlertTriangle,
  Globe,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface SiteHealthProps {
  currentBlog: Blog | null;
}

export const SiteHealth: React.FC<SiteHealthProps> = ({ currentBlog }) => {
  const [activeTab, setActiveTab] = useState<"pagespeed" | "inspect" | "sitemap">("pagespeed");
  const [targetUrl, setTargetUrl] = useState(currentBlog?.url || "https://myblog.blogspot.com");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [auditing, setAuditing] = useState(false);
  const [pageSpeedData, setPageSpeedData] = useState<PageSpeedData | null>(null);

  // URL Inspect State
  const [inspectUrl, setInspectUrl] = useState(currentBlog?.url || "");
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<any>(null);

  // Bulk index sweep state
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<{
    checked: number;
    alreadyIndexed: number;
    requested: number;
    failed: number;
    results: { url: string; title: string; verdict: string; coverageState: string; action: string }[];
  } | null>(null);

  const COVERAGE_FIXES: [string, string][] = [
    ["discovered - currently not indexed", "Add 2-3 internal links from your strongest posts, improve the content, then wait 1-2 weeks."],
    ["crawled - currently not indexed", "This is a content-quality signal — add information-gain (original data, examples, photos), then re-request indexing."],
    ["duplicate without user-selected canonical", "Often a Blogger ?m=1 mobile URL — usually safe to ignore. For real duplicates, consolidate to one post + a custom redirect."],
    ["not found (404)", "Deleted post still linked somewhere — add a custom redirect to the closest related post."],
    ["soft 404", "Page looks empty/thin to Google — add real content or redirect it away."],
    ["blocked by robots.txt", "Your robots.txt blocks this URL — only archive/search pages should be noindexed."],
    ["excluded by 'noindex' tag", "Check Blogger Settings → Crawlers & indexing: posts/pages should be 'all', only archive/search 'noindex'."],
  ];
  const findFix = (coverageState: string): string | null => {
    const key = (coverageState || "").toLowerCase();
    return COVERAGE_FIXES.find(([k]) => key.includes(k))?.[1] || null;
  };

  const handleIndexSweep = async () => {
    if (!currentBlog) return;
    setSweeping(true);
    setSweepResult(null);
    try {
      const res = await fetch("/api/health/index-sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId: currentBlog.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSweepResult(data);
      } else {
        alert(data.error || "Index sweep failed");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSweeping(false);
    }
  };

  // Sitemaps State
  const [submittingSitemap, setSubmittingSitemap] = useState(false);
  const [sitemapFeedPath, setSitemapFeedPath] = useState("sitemap.xml");
  const [sitemapStatus, setSitemapStatus] = useState<string | null>(null);

  const handleRunPageSpeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;

    setAuditing(true);
    setPageSpeedData(null);

    try {
      const res = await fetch("/api/health/pagespeed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl.trim(),
          strategy,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPageSpeedData(data.data);
      } else {
        alert(data.error || "PageSpeed audit failed");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setAuditing(false);
    }
  };

  const handleInspectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBlog) {
      alert("Please select a registered blog first.");
      return;
    }
    if (!inspectUrl.trim()) return;

    setInspecting(true);
    setInspectResult(null);

    try {
      const res = await fetch("/api/health/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId: currentBlog.id,
          url: inspectUrl.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInspectResult(data);
      } else {
        alert(data.error || "URL Inspection failed");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setInspecting(false);
    }
  };

  const handleSubmitSitemap = async () => {
    if (!currentBlog) {
      alert("Please select a blog first.");
      return;
    }

    setSubmittingSitemap(true);
    setSitemapStatus(null);

    try {
      const res = await fetch("/api/health/sitemaps/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId: currentBlog.id,
          feedpath: sitemapFeedPath.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSitemapStatus("Sitemap successfully submitted to Google Search Console!");
      } else {
        alert(data.error || "Failed to submit sitemap");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingSitemap(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            Site Health & Core Web Vitals
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Google PageSpeed Insights · Real-user Field Data · GSC URL Inspection & Index Status · Sitemap Feeds
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-900 p-1 rounded-xl border border-stone-800">
          <button
            onClick={() => setActiveTab("pagespeed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "pagespeed"
                ? "bg-amber-500 text-stone-950 font-bold"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Core Web Vitals
          </button>
          <button
            onClick={() => setActiveTab("inspect")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "inspect"
                ? "bg-amber-500 text-stone-950 font-bold"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            URL Inspection
          </button>
          <button
            onClick={() => setActiveTab("sitemap")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "sitemap"
                ? "bg-amber-500 text-stone-950 font-bold"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Sitemaps
          </button>
        </div>
      </div>

      {/* TAB 1: PageSpeed & CWV */}
      {activeTab === "pagespeed" && (
        <div className="space-y-6">
          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5">
            <form onSubmit={handleRunPageSpeed} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://yourblog.blogspot.com/2026/08/post.html"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as "mobile" | "desktop")}
                  className="px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="mobile">Mobile (Googlebot)</option>
                  <option value="desktop">Desktop</option>
                </select>

                <button
                  type="submit"
                  disabled={auditing}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs shadow flex items-center gap-2 shrink-0"
                >
                  {auditing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                      Running Audit...
                    </>
                  ) : (
                    <>
                      <Gauge className="w-4 h-4" />
                      Audit Core Web Vitals
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {pageSpeedData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Performance Score */}
              <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 text-center">
                <span className="text-xs uppercase font-bold text-stone-400">Performance</span>
                <div
                  className={`text-4xl font-black font-mono mt-2 ${
                    (pageSpeedData.performance || 0) >= 90
                      ? "text-emerald-400"
                      : (pageSpeedData.performance || 0) >= 50
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {pageSpeedData.performance ?? "N/A"}
                </div>
                <div className="text-[11px] text-stone-400 mt-1">Lighthouse Score / 100</div>
              </div>

              {/* SEO Score */}
              <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 text-center">
                <span className="text-xs uppercase font-bold text-stone-400">Technical SEO</span>
                <div
                  className={`text-4xl font-black font-mono mt-2 ${
                    (pageSpeedData.seo || 0) >= 90
                      ? "text-emerald-400"
                      : (pageSpeedData.seo || 0) >= 50
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {pageSpeedData.seo ?? "N/A"}
                </div>
                <div className="text-[11px] text-stone-400 mt-1">Meta & crawlability / 100</div>
              </div>

              {/* LCP Metric */}
              <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 text-center">
                <span className="text-xs uppercase font-bold text-stone-400">Largest Contentful Paint</span>
                <div
                  className={`text-3xl font-black font-mono mt-2 ${
                    pageSpeedData.lcpMs && pageSpeedData.lcpMs <= 2500
                      ? "text-emerald-400"
                      : pageSpeedData.lcpMs && pageSpeedData.lcpMs <= 4000
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {pageSpeedData.lcpMs ? `${(pageSpeedData.lcpMs / 1000).toFixed(2)}s` : "N/A"}
                </div>
                <div className="text-[11px] text-stone-400 mt-1">Target: &lt; 2.5s</div>
              </div>

              {/* CLS Metric */}
              <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 text-center">
                <span className="text-xs uppercase font-bold text-stone-400">Cumulative Layout Shift</span>
                <div
                  className={`text-3xl font-black font-mono mt-2 ${
                    pageSpeedData.cls !== null && pageSpeedData.cls <= 0.1
                      ? "text-emerald-400"
                      : pageSpeedData.cls !== null && pageSpeedData.cls <= 0.25
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {pageSpeedData.cls !== null ? pageSpeedData.cls.toFixed(3) : "N/A"}
                </div>
                <div className="text-[11px] text-stone-400 mt-1">Target: &lt; 0.1</div>
              </div>

              {/* Opportunities List */}
              {pageSpeedData.topOpportunities && pageSpeedData.topOpportunities.length > 0 && (
                <div className="md:col-span-4 bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Top Performance Optimization Opportunities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {pageSpeedData.topOpportunities.map((opp, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-stone-300"
                      >
                        • {opp}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GSC URL Inspection */}
      {activeTab === "inspect" && (
        <div className="space-y-6">
          {/* Bulk index check & auto-fix */}
          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-stone-100">Bulk Index Check & Auto-Fix</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Checks every live post's actual GSC index status and requests indexing only for the ones not indexed yet.
                </p>
              </div>
              <button
                onClick={handleIndexSweep}
                disabled={sweeping || !currentBlog}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs shadow flex items-center gap-2 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${sweeping ? "animate-spin" : ""}`} />
                {sweeping ? "Checking posts..." : "Check & Index All Posts"}
              </button>
            </div>

            {sweepResult && (
              <div className="space-y-3 pt-3 border-t border-stone-800">
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="text-stone-300">Checked: <strong className="font-mono">{sweepResult.checked}</strong></span>
                  <span className="text-emerald-400">Already indexed: <strong className="font-mono">{sweepResult.alreadyIndexed}</strong></span>
                  <span className="text-amber-400">Indexing requested: <strong className="font-mono">{sweepResult.requested}</strong></span>
                  {sweepResult.failed > 0 && (
                    <span className="text-rose-400">Check failed: <strong className="font-mono">{sweepResult.failed}</strong></span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500">
                  Note: Google's Indexing API is officially only intended for Job/Event content — for regular posts, sitemap
                  submission and internal links remain the primary indexing signal, not a guaranteed fix.
                </p>
                {sweepResult.results.some((r) => r.action !== "already_indexed") && (
                  <div className="max-h-64 overflow-y-auto space-y-1.5">
                    {sweepResult.results
                      .filter((r) => r.action !== "already_indexed")
                      .map((r, i) => (
                        <div key={i} className="text-xs p-2.5 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between gap-3">
                          <span className="truncate text-stone-300">{r.title}</span>
                          <span className={`shrink-0 font-mono ${r.action === "requested_indexing" ? "text-amber-400" : "text-rose-400"}`}>
                            {r.coverageState || r.verdict}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Single URL inspection */}
          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5">
            <form onSubmit={handleInspectUrl} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="url"
                  value={inspectUrl}
                  onChange={(e) => setInspectUrl(e.target.value)}
                  placeholder="https://yourblog.blogspot.com/2026/08/specific-post.html"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={inspecting || !currentBlog}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs shadow flex items-center gap-2 shrink-0"
              >
                {inspecting ? "Inspecting with Googlebot..." : "Inspect in Search Console"}
              </button>
            </form>
          </div>

          {inspectResult && (
            <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Live Index Inspection Summary
              </h3>

              <div className="flex items-center gap-2">
                {inspectResult.verdict === "PASS" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className={`font-bold text-sm ${inspectResult.verdict === "PASS" ? "text-emerald-400" : "text-amber-400"}`}>
                  {inspectResult.coverageState || inspectResult.verdict || "Unknown"}
                </span>
              </div>

              {findFix(inspectResult.coverageState) && (
                <p className="text-xs text-stone-300 bg-stone-900 border border-stone-800 rounded-xl p-3">
                  <strong className="text-amber-400">Fix: </strong>
                  {findFix(inspectResult.coverageState)}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-400">
                <div>Last crawl: <span className="text-stone-200">{inspectResult.lastCrawl || "Never"}</span></div>
                <div>Robots.txt: <span className="text-stone-200">{inspectResult.robotsTxtState || "N/A"}</span></div>
                <div className="truncate">Canonical: <span className="text-stone-200">{inspectResult.canonical || "N/A"}</span></div>
                <div>Rich results: <span className="text-stone-200">{inspectResult.richResults || "N/A"}</span></div>
              </div>

              <details className="text-xs text-stone-500">
                <summary className="cursor-pointer hover:text-stone-300">Raw response</summary>
                <pre className="mt-2 p-4 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 font-mono text-xs overflow-x-auto leading-relaxed">
                  {JSON.stringify(inspectResult, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Sitemaps Feed Management */}
      {activeTab === "sitemap" && (
        <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-stone-100">Blogger XML Sitemap & Atom Feeds</h3>
            <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
              Google Blogger provides an automatic native sitemap at <code className="text-amber-400 font-mono">sitemap.xml</code> as well as atom feeds at <code className="text-amber-400 font-mono">atom.xml?redirect=false&start-index=1&max-results=500</code>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
              type="text"
              value={sitemapFeedPath}
              onChange={(e) => setSitemapFeedPath(e.target.value)}
              placeholder="sitemap.xml or atom.xml?redirect=false&start-index=1&max-results=500"
              className="flex-1 px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              onClick={handleSubmitSitemap}
              disabled={submittingSitemap || !currentBlog}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs shadow flex items-center justify-center gap-2 shrink-0"
            >
              {submittingSitemap ? "Submitting..." : "Submit to Google"}
            </button>
          </div>

          {sitemapStatus && (
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
              {sitemapStatus}
            </div>
          )}

          <div className="pt-4 border-t border-stone-800 space-y-2">
            <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider">Recommended Feed Endpoints</h4>
            <div className="space-y-1.5 text-xs font-mono text-stone-400">
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                1. <span className="text-stone-200">sitemap.xml</span> (Standard main sitemap)
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                2. <span className="text-stone-200">atom.xml?redirect=false&start-index=1&max-results=500</span> (Full post archive feed)
              </div>
              <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                3. <span className="text-stone-200">feeds/posts/default?alt=json</span> (Public JSON feed for programmatic audit)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

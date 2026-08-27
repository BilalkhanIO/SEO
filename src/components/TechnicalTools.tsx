import React, { useState } from "react";
import { Wrench, Search, Globe, Code, FileText, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export const TechnicalTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"scraper" | "robots" | "density">("scraper");

  // Scraper State
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);

  // Robots State
  const [robotsDomain, setRobotsDomain] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [robotsResult, setRobotsResult] = useState<any>(null);

  // Density State
  const [densityText, setDensityText] = useState("");
  const [densityKeyword, setDensityKeyword] = useState("");
  const [densityResult, setDensityResult] = useState<any>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeUrl) return;
    setIsScraping(true);
    setScrapeResult(null);
    try {
      const res = await fetch("/api/tools/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl }),
      });
      const data = await res.json();
      if (res.ok) setScrapeResult(data);
      else alert(data.error || "Failed to scrape");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleAuditRobots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!robotsDomain) return;
    setIsAuditing(true);
    setRobotsResult(null);
    try {
      const res = await fetch("/api/tools/audit-robots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: robotsDomain }),
      });
      const data = await res.json();
      if (res.ok) setRobotsResult(data);
      else alert(data.error || "Failed to audit");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const calculateDensity = () => {
    if (!densityText || !densityKeyword) return;
    const wordCount = densityText.replace(/\s+/g, " ").trim().split(" ").length;
    
    // basic regex for density
    const regex = new RegExp(densityKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
    const matches = densityText.match(regex);
    const count = matches ? matches.length : 0;
    
    const density = wordCount > 0 ? ((count / wordCount) * 100).toFixed(2) : "0.00";
    
    setDensityResult({
      wordCount,
      keywordCount: count,
      density,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100 tracking-tight">Technical SEO Tools</h1>
          <p className="text-xs text-stone-400">Open-source inspired utilities for deep on-page analysis</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab("scraper")}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "scraper"
              ? "bg-amber-500 text-stone-950 shadow"
              : "text-stone-400 hover:text-stone-200 hover:bg-stone-900"
          }`}
        >
          <Search className="w-4 h-4" />
          On-Page Meta Scraper
        </button>
        <button
          onClick={() => setActiveTab("robots")}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "robots"
              ? "bg-amber-500 text-stone-950 shadow"
              : "text-stone-400 hover:text-stone-200 hover:bg-stone-900"
          }`}
        >
          <Globe className="w-4 h-4" />
          Robots.txt & Sitemap
        </button>
        <button
          onClick={() => setActiveTab("density")}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === "density"
              ? "bg-amber-500 text-stone-950 shadow"
              : "text-stone-400 hover:text-stone-200 hover:bg-stone-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          Keyword Density
        </button>
      </div>

      {/* Tab 1: Meta Scraper */}
      {activeTab === "scraper" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-200">Live URL Analyzer</h3>
            <p className="text-xs text-stone-400">Fetch and parse standard SEO meta tags and canonicals from any live URL.</p>
            
            <form onSubmit={handleScrape} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Target URL</label>
                <input
                  type="url"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  placeholder="https://example.com/blog-post"
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isScraping}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-sm shadow transition-all flex items-center gap-2"
              >
                {isScraping ? "Scraping..." : "Analyze URL"}
              </button>
            </form>
          </div>

          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5">
            {scrapeResult ? (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-stone-200 border-b border-stone-800 pb-2">Analysis Results</h3>
                
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-stone-500 mb-1">Page Title ({scrapeResult.title?.length || 0} chars)</div>
                    <div className="text-stone-200 p-2 bg-stone-900 rounded border border-stone-800">{scrapeResult.title || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-stone-500 mb-1">Meta Description ({scrapeResult.metaDescription?.length || 0} chars)</div>
                    <div className="text-stone-200 p-2 bg-stone-900 rounded border border-stone-800">{scrapeResult.metaDescription || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-stone-500 mb-1">Canonical URL</div>
                    <div className="text-stone-200 p-2 bg-stone-900 rounded border border-stone-800 break-all">{scrapeResult.canonical || "Missing!"}</div>
                  </div>
                  <div>
                    <div className="text-stone-500 mb-1">Robots Directive</div>
                    <div className="text-stone-200 p-2 bg-stone-900 rounded border border-stone-800">{scrapeResult.robots || "None (Implies index, follow)"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-stone-500 mb-1">Total Word Count</div>
                      <div className="text-amber-400 font-mono font-bold text-sm">{scrapeResult.wordCount}</div>
                    </div>
                    <div>
                      <div className="text-stone-500 mb-1">H1 Tags</div>
                      <div className="text-amber-400 font-mono font-bold text-sm">{scrapeResult.h1Count}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500 text-xs">
                Results will appear here
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Robots */}
      {activeTab === "robots" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-200">Robots.txt Validator</h3>
            <p className="text-xs text-stone-400">Check for Blogger-specific directives and ensure sitemap declarations are present.</p>
            
            <form onSubmit={handleAuditRobots} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Domain URL</label>
                <input
                  type="text"
                  value={robotsDomain}
                  onChange={(e) => setRobotsDomain(e.target.value)}
                  placeholder="https://myblog.blogspot.com"
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isAuditing}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-sm shadow transition-all flex items-center gap-2"
              >
                {isAuditing ? "Auditing..." : "Audit Domain"}
              </button>
            </form>
          </div>

          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5">
             {robotsResult ? (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-stone-200 border-b border-stone-800 pb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-500" />
                  {robotsResult.url}
                </h3>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-stone-900 border border-stone-800">
                  <span className="text-xs text-stone-300">Sitemap Declaration Found:</span>
                  {robotsResult.hasSitemap ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                </div>

                <div>
                  <div className="text-xs text-stone-500 mb-2">Raw File Content:</div>
                  <pre className="p-3 bg-stone-950 rounded-lg border border-stone-800 text-[11px] text-stone-300 overflow-auto max-h-60 font-mono whitespace-pre-wrap">
                    {robotsResult.content}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500 text-xs">
                Results will appear here
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Density */}
      {activeTab === "density" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-200">Keyword Density Analyzer</h3>
            <p className="text-xs text-stone-400">Calculate term frequency and ensure natural optimization (aim for 1-2%).</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Target Keyword</label>
                <input
                  type="text"
                  value={densityKeyword}
                  onChange={(e) => setDensityKeyword(e.target.value)}
                  placeholder="e.g. coffee beans"
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Content / Draft</label>
                <textarea
                  value={densityText}
                  onChange={(e) => setDensityText(e.target.value)}
                  className="w-full h-40 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500 resize-none font-mono"
                  placeholder="Paste article text here..."
                />
              </div>
              <button
                onClick={calculateDensity}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow transition-all flex items-center gap-2"
              >
                Calculate
              </button>
            </div>
          </div>

          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5">
             {densityResult ? (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-stone-200 border-b border-stone-800 pb-2">Density Report</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-stone-900 rounded-xl border border-stone-800 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Word Count</div>
                    <div className="text-2xl font-bold font-mono text-stone-200">{densityResult.wordCount}</div>
                  </div>
                  <div className="p-4 bg-stone-900 rounded-xl border border-stone-800 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1">Occurrences</div>
                    <div className="text-2xl font-bold font-mono text-stone-200">{densityResult.keywordCount}</div>
                  </div>
                </div>

                <div className="p-5 bg-stone-900 rounded-xl border border-stone-800 text-center">
                  <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">Keyword Density</div>
                  <div className={`text-4xl font-bold font-mono ${parseFloat(densityResult.density) > 3 ? "text-rose-500" : parseFloat(densityResult.density) < 0.5 ? "text-amber-500" : "text-emerald-500"}`}>
                    {densityResult.density}%
                  </div>
                  <p className="text-xs text-stone-400 mt-2">
                    {parseFloat(densityResult.density) > 3 ? "Warning: High density (Risk of stuffing)" : parseFloat(densityResult.density) < 0.5 ? "Low density: Consider adding more mentions." : "Optimal density (0.5% - 3%)"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500 text-xs">
                Results will appear here
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

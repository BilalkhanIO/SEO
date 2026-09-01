import React, { useState, useEffect } from "react";
import { Blog } from "../types.js";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ShieldCheck,
  Globe,
  FileCode,
  Send,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowUpRight,
  Zap,
  Info,
  Copy,
  Check,
} from "lucide-react";

interface AdSenseAccount {
  name: string;
  displayName: string;
  reportingTimeZone: string;
  state?: string;
}

interface AdSenseReport {
  summary: {
    estimatedEarnings: number;
    pageViews: number;
    impressions: number;
    clicks: number;
    pageCtr: number;
    pageRpm: number;
  };
  rows: any[];
}

interface AdSenseAudit {
  readinessScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  items: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    status: "pass" | "warn" | "fail";
    autoFixAvailable: boolean;
    fixAction?: string;
  }>;
}

interface Ga4Traffic {
  activeUsers: number;
  totalSessions: number;
  organicSearchUsers: number;
  pageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  engagementRate: number;
  channels: { channel: string; users: number; percentage: number }[];
}

interface StrikingOpportunity {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  potentialClicks: number;
  recommendation: string;
}

export const GoogleEcosystem: React.FC<{
  currentBlog: Blog | null;
  onNavigateToTab?: (tab: string) => void;
}> = ({ currentBlog, onNavigateToTab }) => {
  const [subTab, setSubTab] = useState<"adsense" | "analytics" | "gsc">("adsense");
  const [loading, setLoading] = useState(false);

  // AdSense State
  const [accounts, setAccounts] = useState<AdSenseAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [adsenseReport, setAdSenseReport] = useState<AdSenseReport | null>(null);
  const [adsenseAudit, setAdSenseAudit] = useState<AdSenseAudit | null>(null);
  const [adsenseAlerts, setAdSenseAlerts] = useState<any[]>([]);
  const [publisherId, setPublisherId] = useState("pub-1234567890123456");
  const [adsTxtCopied, setAdsTxtCopied] = useState(false);
  const [fixingPageType, setFixingPageType] = useState<string | null>(null);
  const [fixSuccessMsg, setFixSuccessMsg] = useState<string | null>(null);

  // GA4 State
  const [gaProperties, setGaProperties] = useState<any[]>([]);
  const [selectedGaProperty, setSelectedGaProperty] = useState<string>("");
  const [gaTraffic, setGaTraffic] = useState<Ga4Traffic | null>(null);
  const [gaTopPages, setGaTopPages] = useState<any[]>([]);

  // GSC State
  const [sitemaps, setSitemaps] = useState<any[]>([]);
  const [strikingKws, setStrikingKws] = useState<StrikingOpportunity[]>([]);
  const [sitemapSubmitting, setSitemapSubmitting] = useState(false);
  const [sitemapSuccess, setSitemapSuccess] = useState<string | null>(null);
  const [instantIndexUrl, setInstantIndexUrl] = useState("");
  const [indexingLoading, setIndexingLoading] = useState(false);
  const [indexingMsg, setIndexingMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetchAdSenseData();
    fetchAnalyticsData();
    if (currentBlog) {
      fetchGscData();
      fetchAdSenseAudit();
    }
  }, [currentBlog]);

  const fetchAdSenseData = async () => {
    try {
      const res = await fetch("/api/adsense/accounts");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAccounts(data);
        const first = data[0].name;
        setSelectedAccount(first);
        loadAdSenseMetrics(first);
      }
    } catch (err) {
      console.warn("AdSense fetch error:", err);
    }
  };

  const loadAdSenseMetrics = async (accName: string) => {
    setLoading(true);
    try {
      const [repRes, alertsRes] = await Promise.all([
        fetch(`/api/adsense/report?accountName=${encodeURIComponent(accName)}&days=30`),
        fetch(`/api/adsense/alerts?accountName=${encodeURIComponent(accName)}`),
      ]);
      const repData = await repRes.json();
      const alertsData = await alertsRes.json();
      setAdSenseReport(repData);
      setAdSenseAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch (err) {
      console.warn("Metrics load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdSenseAudit = async () => {
    if (!currentBlog) return;
    try {
      const res = await fetch("/api/adsense/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId: currentBlog.id }),
      });
      const data = await res.json();
      if (data.audit) {
        setAdSenseAudit(data.audit);
      }
    } catch (err) {
      console.warn("AdSense audit error:", err);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const res = await fetch("/api/analytics/properties");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setGaProperties(data);
        const first = data[0].propertyId;
        setSelectedGaProperty(first);
        loadGaMetrics(first);
      }
    } catch (err) {
      console.warn("Analytics fetch error:", err);
    }
  };

  const loadGaMetrics = async (propId: string) => {
    try {
      const [repRes, topRes] = await Promise.all([
        fetch(`/api/analytics/report?propertyId=${encodeURIComponent(propId)}&days=30`),
        fetch(`/api/analytics/top-pages?propertyId=${encodeURIComponent(propId)}`),
      ]);
      const repData = await repRes.json();
      const topData = await topRes.json();
      setGaTraffic(repData);
      setGaTopPages(Array.isArray(topData) ? topData : []);
    } catch (err) {
      console.warn("GA metrics error:", err);
    }
  };

  const fetchGscData = async () => {
    if (!currentBlog?.url) return;
    try {
      const cleanUrl = currentBlog.url.endsWith("/") ? currentBlog.url : `${currentBlog.url}/`;
      const [smRes, strRes] = await Promise.all([
        fetch(`/api/gsc/sitemaps?siteUrl=${encodeURIComponent(cleanUrl)}`).catch(() => ({ json: () => [] })),
        fetch(`/api/gsc/striking-distance?siteUrl=${encodeURIComponent(cleanUrl)}`),
      ]);
      const smData = await smRes.json();
      const strData = await strRes.json();
      setSitemaps(Array.isArray(smData) ? smData : []);
      setStrikingKws(Array.isArray(strData) ? strData : []);
    } catch (err) {
      console.warn("GSC data error:", err);
    }
  };

  const handleAutoFixPage = async (pageType: string) => {
    if (!currentBlog) return;
    setFixingPageType(pageType);
    setFixSuccessMsg(null);
    try {
      const res = await fetch("/api/adsense/autofix-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId: currentBlog.id, pageType }),
      });
      const data = await res.json();
      if (res.ok) {
        setFixSuccessMsg(`Published "${data.page?.title || pageType}" directly to Blogger!`);
        await fetchAdSenseAudit();
      } else {
        alert(data.error || "Failed to publish policy page");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setFixingPageType(null);
    }
  };

  const handleSubmitSitemaps = async () => {
    if (!currentBlog?.url) return;
    setSitemapSubmitting(true);
    setSitemapSuccess(null);
    try {
      const cleanUrl = currentBlog.url.endsWith("/") ? currentBlog.url : `${currentBlog.url}/`;
      const res = await fetch("/api/gsc/submit-sitemaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: cleanUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setSitemapSuccess(`Submitted sitemaps: ${data.submitted.join(", ")}`);
        await fetchGscData();
      } else {
        alert(data.error || "Sitemap submission failed");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSitemapSubmitting(false);
    }
  };

  const handleInstantIndexing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instantIndexUrl) return;
    setIndexingLoading(true);
    setIndexingMsg(null);
    try {
      const res = await fetch("/api/tools/index-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: instantIndexUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setIndexingMsg({ text: `Google Indexing notified successfully for ${instantIndexUrl}`, ok: true });
        setInstantIndexUrl("");
      } else {
        setIndexingMsg({ text: data.error || "Indexing notification failed", ok: false });
      }
    } catch (err: any) {
      setIndexingMsg({ text: err.message, ok: false });
    } finally {
      setIndexingLoading(false);
    }
  };

  const copyAdsTxt = () => {
    const formatted = `google.com, ${publisherId.trim()}, DIRECT, f08c47fec0942fa0`;
    navigator.clipboard.writeText(formatted);
    setAdsTxtCopied(true);
    setTimeout(() => setAdsTxtCopied(false), 2500);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header & Sub-tabs */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-500/15 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> Full Google Suite Connected
              </span>
              {currentBlog && (
                <span className="text-xs text-stone-400 font-mono bg-stone-950/60 px-2.5 py-0.5 rounded-full border border-stone-800">
                  Target: <strong className="text-stone-200">{currentBlog.name}</strong>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-100 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              Google Ecosystem & AdSense Command Center
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 max-w-2xl leading-relaxed">
              Unified 360° analytics, automated AdSense monetization readiness, Search Console indexing, and traffic diagnostics.
            </p>
          </div>

          {/* Sub Navigation Segmented Control */}
          <div className="flex flex-wrap items-center bg-stone-950 p-1.5 rounded-2xl border border-stone-800 self-stretch sm:self-start gap-1">
            <button
              onClick={() => setSubTab("adsense")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                subTab === "adsense"
                  ? "bg-amber-500 text-stone-950 font-bold shadow-sm"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-850"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" /> AdSense & Monetization
            </button>
            <button
              onClick={() => setSubTab("analytics")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                subTab === "analytics"
                  ? "bg-sky-500 text-stone-950 font-bold shadow-sm"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-850"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analytics (GA4)
            </button>
            <button
              onClick={() => setSubTab("gsc")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                subTab === "gsc"
                  ? "bg-emerald-500 text-stone-950 font-bold shadow-sm"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-850"
              }`}
            >
              <Search className="w-3.5 h-3.5" /> GSC & Indexing
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: ADSENSE & MONETIZATION */}
      {subTab === "adsense" && (
        <div className="space-y-6">
          {/* Earnings Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] text-stone-400 font-medium flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" /> 30d Revenue
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">
                ${adsenseReport?.summary?.estimatedEarnings?.toFixed(2) || "0.00"}
              </p>
              <span className="text-[10px] text-emerald-400 mt-1 block font-mono">Live AdSense Sync</span>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] text-stone-400 font-medium">Page Views</span>
              <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">
                {adsenseReport?.summary?.pageViews?.toLocaleString() || "0"}
              </p>
              <span className="text-[10px] text-stone-500 mt-1 block">Last 30 days</span>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] text-stone-400 font-medium">Ad Impressions</span>
              <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">
                {adsenseReport?.summary?.impressions?.toLocaleString() || "0"}
              </p>
              <span className="text-[10px] text-stone-500 mt-1 block">Monetized impressions</span>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] text-stone-400 font-medium">Ad Clicks</span>
              <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">
                {adsenseReport?.summary?.clicks?.toLocaleString() || "0"}
              </p>
              <span className="text-[10px] text-stone-500 mt-1 block">Valid user clicks</span>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] text-stone-400 font-medium">Page CTR</span>
              <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">
                {adsenseReport?.summary?.pageCtr || 0}%
              </p>
              <span className="text-[10px] text-stone-500 mt-1 block">Click-through rate</span>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] text-stone-400 font-medium">Page RPM</span>
              <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">
                ${adsenseReport?.summary?.pageRpm || "0.00"}
              </p>
              <span className="text-[10px] text-stone-500 mt-1 block">Revenue per 1k views</span>
            </div>
          </div>

          {/* AdSense Approval Readiness Scorecard */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-5 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-stone-100">Google AdSense 360° Readiness Audit</h2>
                  {adsenseAudit && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        adsenseAudit.grade === "A"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : adsenseAudit.grade === "B"
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          : adsenseAudit.grade === "C"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      Grade: {adsenseAudit.grade} ({adsenseAudit.readinessScore}%)
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  10-point algorithmic verification covering mandatory policy pages, content depth, E-E-A-T trust signals, and ads.txt.
                </p>
              </div>

              {fixSuccessMsg && (
                <div className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {fixSuccessMsg}
                </div>
              )}
            </div>

            {/* Audit Checklist Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {adsenseAudit?.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-stone-950/70 border border-stone-850 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-stone-750 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                        {item.category}
                      </span>
                      {item.status === "pass" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                        </span>
                      ) : item.status === "warn" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" /> Warning
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5" /> Critical Fail
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-stone-100">{item.title}</h3>
                    <p className="text-xs text-stone-400 leading-relaxed">{item.description}</p>
                  </div>

                  {item.autoFixAvailable && (
                    <div className="mt-4 pt-3 border-t border-stone-850 flex items-center justify-end">
                      {item.fixAction === "create_privacy_page" && (
                        <button
                          onClick={() => handleAutoFixPage("privacy")}
                          disabled={fixingPageType === "privacy"}
                          className="text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {fixingPageType === "privacy" ? "Publishing Page..." : "Auto-Publish Privacy Policy"}
                        </button>
                      )}
                      {item.fixAction === "create_terms_page" && (
                        <button
                          onClick={() => handleAutoFixPage("terms")}
                          disabled={fixingPageType === "terms"}
                          className="text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {fixingPageType === "terms" ? "Publishing Page..." : "Auto-Publish Terms"}
                        </button>
                      )}
                      {item.fixAction === "create_about_page" && (
                        <button
                          onClick={() => handleAutoFixPage("about")}
                          disabled={fixingPageType === "about"}
                          className="text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {fixingPageType === "about" ? "Publishing Page..." : "Auto-Publish About Us"}
                        </button>
                      )}
                      {item.fixAction === "create_contact_page" && (
                        <button
                          onClick={() => handleAutoFixPage("contact")}
                          disabled={fixingPageType === "contact"}
                          className="text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {fixingPageType === "contact" ? "Publishing Page..." : "Auto-Publish Contact Us"}
                        </button>
                      )}
                      {item.fixAction === "create_disclaimer_page" && (
                        <button
                          onClick={() => handleAutoFixPage("disclaimer")}
                          disabled={fixingPageType === "disclaimer"}
                          className="text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {fixingPageType === "disclaimer" ? "Publishing Page..." : "Auto-Publish Disclaimer"}
                        </button>
                      )}
                      {item.fixAction === "expand_thin_posts" && onNavigateToTab && (
                        <button
                          onClick={() => onNavigateToTab("autoblog")}
                          className="text-xs font-semibold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" /> Auto-Enrich via Auto-Pilot
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Blogger Custom ads.txt Generator */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2 mb-1.5">
              <FileCode className="w-5 h-5 text-amber-400" />
              Blogger Custom ads.txt Code Generator
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              Copy this verified line and paste it in Blogger ➔ Settings ➔ Monetization ➔ <strong>Custom ads.txt</strong>.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                value={publisherId}
                onChange={(e) => setPublisherId(e.target.value)}
                placeholder="pub-XXXXXXXXXXXXXXXX"
                className="w-full sm:w-64 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
              />

              <div className="flex-1 w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-emerald-400 font-mono flex items-center justify-between gap-2">
                <span className="truncate">google.com, {publisherId.trim()}, DIRECT, f08c47fec0942fa0</span>
                <button
                  onClick={copyAdsTxt}
                  className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {adsTxtCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span className="text-[11px] font-sans">{adsTxtCopied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GOOGLE ANALYTICS (GA4) */}
      {subTab === "analytics" && (
        <div className="space-y-6">
          {/* Traffic Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] text-stone-400 font-medium">30-Day Active Users</span>
              <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">
                {gaTraffic?.activeUsers?.toLocaleString() || "0"}
              </p>
              <span className="text-[10px] text-sky-400 mt-1 block font-mono">Live GA4 Sync</span>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] text-stone-400 font-medium">Total Sessions</span>
              <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">
                {gaTraffic?.totalSessions?.toLocaleString() || "0"}
              </p>
              <span className="text-[10px] text-stone-500 mt-1 block">Engaged visits</span>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] text-stone-400 font-medium">Engagement Rate</span>
              <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">
                {gaTraffic?.engagementRate || 0}%
              </p>
              <span className="text-[10px] text-emerald-400 mt-1 block font-mono">
                Avg Duration: {gaTraffic?.averageSessionDuration || 0}s
              </span>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] text-stone-400 font-medium">Bounce Rate</span>
              <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">
                {gaTraffic?.bounceRate || 0}%
              </p>
              <span className="text-[10px] text-stone-500 mt-1 block">Unengaged bounces</span>
            </div>
          </div>

          {/* Traffic Channels Breakdown */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <h3 className="text-base font-bold text-stone-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-400" />
              Traffic Acquisition Channels
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {(gaTraffic?.channels || []).map((ch, idx) => (
                <div key={idx} className="bg-stone-950/70 border border-stone-850 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs sm:text-sm font-semibold text-stone-200">{ch.channel}</span>
                    <span className="text-xs text-sky-400 font-bold font-mono">{ch.percentage}%</span>
                  </div>
                  <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-500 h-full rounded-full transition-all"
                      style={{ width: `${ch.percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-stone-400 mt-2 block font-mono">{ch.users} active visitors</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Landing Pages Diagnostic */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <h3 className="text-base font-bold text-stone-100 mb-4">Top Landing Pages & Engagement Health</h3>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-semibold">Page Title & Path</th>
                    <th className="py-3 px-4 font-semibold">Views</th>
                    <th className="py-3 px-4 font-semibold">Users</th>
                    <th className="py-3 px-4 font-semibold">Engagement</th>
                    <th className="py-3 px-4 font-semibold">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-850">
                  {gaTopPages.map((page, idx) => (
                    <tr key={idx} className="hover:bg-stone-850/40 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-stone-200 truncate max-w-xs sm:max-w-md">{page.pageTitle}</p>
                        <span className="text-[11px] text-stone-400 font-mono truncate block max-w-xs">{page.pagePath}</span>
                      </td>
                      <td className="py-3 px-4 text-stone-300 font-semibold font-mono">{page.views.toLocaleString()}</td>
                      <td className="py-3 px-4 text-stone-300 font-mono">{page.activeUsers.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-400 font-semibold font-mono">{page.engagementRate}%</span>
                        <span className="text-stone-500 text-[10px] block font-mono">{page.avgDuration}s avg</span>
                      </td>
                      <td className="py-3 px-4">
                        {page.trend === "rising" ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" /> High Engagement
                          </span>
                        ) : page.trend === "declining" ? (
                          <span className="text-rose-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Drop-off Alert
                          </span>
                        ) : (
                          <span className="text-stone-400">Stable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SEARCH CONSOLE & INDEXING */}
      {subTab === "gsc" && (
        <div className="space-y-6">
          {/* Instant Indexing Push & Sitemap Submit Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Sitemap Management */}
            <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2 mb-1.5">
                <Globe className="w-5 h-5 text-emerald-400" /> Google Search Console Sitemaps
              </h3>
              <p className="text-xs text-stone-400 mb-4">
                Submits both Blogger XML and Atom 500-post feed sitemaps directly to Google.
              </p>

              <button
                onClick={handleSubmitSitemaps}
                disabled={sitemapSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${sitemapSubmitting ? "animate-spin" : ""}`} />
                {sitemapSubmitting ? "Submitting to GSC..." : "Auto-Submit Blogger Sitemaps (1-Click)"}
              </button>

              {sitemapSuccess && (
                <p className="text-xs text-emerald-400 mt-3 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {sitemapSuccess}
                </p>
              )}
            </div>

            {/* Instant Indexing Request */}
            <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2 mb-1.5">
                <Zap className="w-5 h-5 text-amber-400" /> Instant Google Indexing API Push
              </h3>
              <p className="text-xs text-stone-400 mb-4">
                Directly notify Google Indexing bot to crawl new or updated URLs within minutes.
              </p>

              <form onSubmit={handleInstantIndexing} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={instantIndexUrl}
                  onChange={(e) => setInstantIndexUrl(e.target.value)}
                  placeholder="https://yourblog.blogspot.com/2026/08/post.html"
                  className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  required
                />
                <button
                  type="submit"
                  disabled={indexingLoading}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {indexingLoading ? "Pushed..." : "Index Now"}
                </button>
              </form>

              {indexingMsg && (
                <p
                  className={`text-xs mt-3 font-medium flex items-center gap-1 ${
                    indexingMsg.ok ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {indexingMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  {indexingMsg.text}
                </p>
              )}
            </div>
          </div>

          {/* Striking Distance Opportunities */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Striking Distance Keywords (Rankings 4 – 20)
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  High-opportunity keywords already ranking on page 1–2 of Google. A minor content refresh can push them to the top 3!
                </p>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-semibold">Target Query</th>
                    <th className="py-3 px-4 font-semibold">Position</th>
                    <th className="py-3 px-4 font-semibold">Impressions</th>
                    <th className="py-3 px-4 font-semibold">CTR</th>
                    <th className="py-3 px-4 font-semibold">Est. Click Gain</th>
                    <th className="py-3 px-4 font-semibold">AI Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-850">
                  {strikingKws.map((item, idx) => (
                    <tr key={idx} className="hover:bg-stone-850/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-stone-200">{item.query}</td>
                      <td className="py-3 px-4">
                        <span className="bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                          Pos {item.position}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-300 font-medium font-mono">{item.impressions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-stone-300 font-mono">{item.ctr}%</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold font-mono">+{item.potentialClicks} clicks/mo</td>
                      <td className="py-3 px-4 text-stone-400">{item.recommendation}</td>
                    </tr>
                  ))}
                  {strikingKws.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-500">
                        No striking distance keywords detected yet. Run an Auto-Pilot cycle or wait for GSC data sync.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

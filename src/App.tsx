import React, { useState, useEffect } from "react";
import { Blog } from "./types.js";
import { Overview } from "./components/Overview.js";
import { KeywordResearch } from "./components/KeywordResearch.js";
import { SerpBriefs } from "./components/SerpBriefs.js";
import { ContentPipeline } from "./components/ContentPipeline.js";
import { PrePublishValidator } from "./components/PrePublishValidator.js";
import { SchemaGenerator } from "./components/SchemaGenerator.js";
import { RankTracker } from "./components/RankTracker.js";
import { SiteHealth } from "./components/SiteHealth.js";
import { OutreachCrm } from "./components/OutreachCrm.js";
import { BlogManager } from "./components/BlogManager.js";
import { TechnicalTools } from "./components/TechnicalTools.js";
import { AutoPilot } from "./components/AutoPilot.js";
import { GoogleEcosystem } from "./components/GoogleEcosystem.js";
import {
  Sparkles,
  LayoutDashboard,
  Search,
  FileText,
  Layers,
  FileCheck,
  Code,
  TrendingUp,
  Activity,
  Send,
  Globe,
  ChevronDown,
  ShieldCheck,
  AlertCircle,
  Wrench,
  Rocket,
  DollarSign,
  Menu,
  X,
  Zap,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [currentBlog, setCurrentBlog] = useState<Blog | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    authReady: boolean;
    hasSerper: boolean;
    hasPageSpeed: boolean;
    hasGemini: boolean;
    counts: { blogs: number; keywords: number; prospects: number; alerts: number };
  }>({
    authReady: false,
    hasSerper: false,
    hasPageSpeed: false,
    hasGemini: true,
    counts: { blogs: 0, keywords: 0, prospects: 0, alerts: 0 },
  });

  // State passing between components
  const [serpKeyword, setSerpKeyword] = useState<string>("");
  const [serpKeywordId, setSerpKeywordId] = useState<number | undefined>(undefined);
  const [pendingPostData, setPendingPostData] = useState<{
    title: string;
    briefMd: string;
    keywordId?: number;
  } | null>(null);
  const [validatorTitle, setValidatorTitle] = useState<string>("");
  const [validatorKeyword, setValidatorKeyword] = useState<string>("");

  useEffect(() => {
    fetchSystemStatus();
    fetchBlogs();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      const isAllowed =
        origin === window.location.origin ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost') ||
        origin.endsWith('.vercel.app');

      if (!isAllowed) return;

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchSystemStatus();
        fetchBlogs();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/auth/url');
      if (!response.ok) {
        let errorMsg = `Server returned HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
        } catch {
          const text = await response.text().catch(() => '');
          if (text) errorMsg = text.slice(0, 150);
        }
        throw new Error(errorMsg);
      }
      const { url } = await response.json();
      if (!url) throw new Error("No authorization URL returned by server");
      
      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) alert('Please allow popups for this site to connect your Google account.');
    } catch (err: any) {
      alert("Error initiating OAuth: " + err.message);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        setSystemStatus(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch system status:", err);
    }
  };

  const fetchBlogs = async () => {
    try {
      const res = await fetch("/api/blogs");
      if (res.ok) {
        const data: Blog[] = await res.json();
        setBlogs(data);
        if (data.length > 0 && !currentBlog) {
          setCurrentBlog(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch blogs:", err);
    }
  };

  const handleOpenSerp = (kw: string, kwId?: number) => {
    setSerpKeyword(kw);
    setSerpKeywordId(kwId);
    setActiveTab("serp");
  };

  const handleSendToPipeline = (title: string, briefMd: string, keywordId?: number) => {
    setPendingPostData({ title, briefMd, keywordId });
    setActiveTab("pipeline");
  };

  const handleValidatePost = (title: string, keyword?: string) => {
    setValidatorTitle(title);
    setValidatorKeyword(keyword || "");
    setActiveTab("validator");
  };

  const navCategories = [
    {
      title: "Core Automation",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard, badge: null },
        { id: "google", label: "Google Suite & AdSense", icon: DollarSign, badge: "Live" },
        { id: "autoblog", label: "360° Auto-Pilot", icon: Rocket, badge: "AI" },
      ],
    },
    {
      title: "Content & SEO Loop",
      items: [
        { id: "keywords", label: "Keywords", icon: Search, badge: systemStatus.counts.keywords > 0 ? `${systemStatus.counts.keywords}` : null },
        { id: "serp", label: "SERP & Briefs", icon: FileText, badge: null },
        { id: "pipeline", label: "Pipeline", icon: Layers, badge: null },
        { id: "validator", label: "Validator", icon: FileCheck, badge: null },
        { id: "schema", label: "Schema", icon: Code, badge: null },
      ],
    },
    {
      title: "Performance & Growth",
      items: [
        { id: "tracking", label: "Rank Tracking", icon: TrendingUp, badge: systemStatus.counts.alerts > 0 ? `${systemStatus.counts.alerts}` : null },
        { id: "health", label: "Site Health", icon: Activity, badge: null },
        { id: "outreach", label: "Outreach CRM", icon: Send, badge: systemStatus.counts.prospects > 0 ? `${systemStatus.counts.prospects}` : null },
        { id: "tools", label: "Tech SEO Tools", icon: Wrench, badge: null },
        { id: "blogs", label: "Blogs", icon: Globe, badge: blogs.length > 0 ? `${blogs.length}` : null },
      ],
    },
  ];

  const allNavItems = navCategories.flatMap((c) => c.items);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800/90 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Mobile Toggle & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/80 transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => {
                setActiveTab("overview");
                setMobileMenuOpen(false);
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-stone-950 shadow-md group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-1.5">
                  <span className="bg-gradient-to-r from-stone-100 to-stone-300 bg-clip-text text-transparent">
                    Blogger SEO
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Pro
                  </span>
                </div>
                <p className="hidden sm:block text-[10px] text-stone-400 font-mono -mt-0.5">
                  Multi-Blog Organic Engine
                </p>
              </div>
            </div>
          </div>

          {/* Right: Active Blog Switcher, API Pills & Quick Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Active Blog Dropdown */}
            {blogs.length > 0 && (
              <div className="relative">
                <select
                  value={currentBlog?.id || ""}
                  onChange={(e) => {
                    const found = blogs.find((b) => b.id === parseInt(e.target.value));
                    if (found) setCurrentBlog(found);
                  }}
                  className="appearance-none bg-stone-850 hover:bg-stone-800 border border-stone-700/90 text-stone-200 text-xs font-semibold pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:border-amber-500 transition-colors cursor-pointer max-w-[140px] sm:max-w-[220px] truncate"
                >
                  {blogs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            )}

            {/* API Status Pills on Desktop */}
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono">
              <span
                title="Gemini 3.7 Flash AI Engine Active"
                className="px-2 py-1 rounded-lg border bg-amber-500/10 text-amber-300 border-amber-500/20 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                Gemini
              </span>

              <span
                title={systemStatus.authReady ? "Google OAuth Active" : "Google OAuth Configured"}
                className={`px-2 py-1 rounded-lg border flex items-center gap-1 ${
                  systemStatus.authReady
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    : "bg-stone-800 text-stone-400 border-stone-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${systemStatus.authReady ? "bg-emerald-400" : "bg-stone-500"}`} />
                Google
              </span>

              <span
                title={systemStatus.hasSerper ? "Serper Live SERP Connected" : "SERP Scraper Ready"}
                className={`px-2 py-1 rounded-lg border flex items-center gap-1 ${
                  systemStatus.hasSerper
                    ? "bg-sky-500/10 text-sky-300 border-sky-500/20"
                    : "bg-stone-800 text-stone-400 border-stone-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${systemStatus.hasSerper ? "bg-sky-400" : "bg-stone-500"}`} />
                SERP
              </span>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => {
                setActiveTab("autoblog");
                setMobileMenuOpen(false);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold px-3 sm:px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Auto-Pilot</span>
            </button>
          </div>
        </div>

        {/* Desktop Horizontal Navigation Bar */}
        <div className="hidden lg:block border-t border-stone-800/80 bg-stone-900/70 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 py-1.5">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-amber-500 text-stone-950 shadow-sm font-bold scale-100"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/70"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-stone-950" : "text-stone-400"}`} />
                  <span>{item.label}</span>
                  {item.badge && !isActive && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Navigation Drawer / Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-800 bg-stone-900/98 max-h-[80vh] overflow-y-auto p-4 space-y-5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-200">
            {navCategories.map((category, idx) => (
              <div key={idx} className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 px-3">
                  {category.title}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-amber-500 text-stone-950 font-bold shadow-md"
                            : "text-stone-300 hover:text-white hover:bg-stone-800/80 bg-stone-950/40 border border-stone-850"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? "text-stone-950" : "text-amber-400"}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                              isActive
                                ? "bg-stone-950 text-amber-400 font-bold"
                                : "bg-stone-800 text-stone-400 border border-stone-700"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Mobile Auth Button if not connected */}
            {!systemStatus.authReady && (
              <div className="pt-2 border-t border-stone-800">
                <button
                  onClick={handleConnectGoogle}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Connect Google Account
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {!systemStatus.authReady && (
          <div className="mb-6 bg-stone-900 border border-stone-700/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-200">Connect Your Google Workspace & Blogger Account</h3>
                <p className="text-xs text-stone-400 mt-0.5">Enables automated publishing, live Search Console audits, and AdSense syncing.</p>
              </div>
            </div>
            <button 
              onClick={handleConnectGoogle}
              className="w-full sm:w-auto whitespace-nowrap px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer text-center"
            >
              Authenticate with Google
            </button>
          </div>
        )}

        {/* Tab Components */}
        {activeTab === "overview" && (
          <Overview
            currentBlog={currentBlog}
            onNavigate={(tab) => setActiveTab(tab)}
            systemStatus={systemStatus}
          />
        )}

        {activeTab === "google" && (
          <GoogleEcosystem
            currentBlog={currentBlog}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "autoblog" && <AutoPilot currentBlog={currentBlog} />}

        {activeTab === "keywords" && (
          <KeywordResearch
            currentBlog={currentBlog}
            onOpenSerp={handleOpenSerp}
            onCreateBrief={() => {
              setActiveTab("serp");
            }}
          />
        )}

        {activeTab === "serp" && (
          <SerpBriefs
            initialKeyword={serpKeyword}
            initialKeywordId={serpKeywordId}
            currentBlog={currentBlog}
            onSendToPipeline={handleSendToPipeline}
          />
        )}

        {activeTab === "pipeline" && (
          <ContentPipeline
            currentBlog={currentBlog}
            onValidatePost={handleValidatePost}
            pendingPostData={pendingPostData}
          />
        )}

        {activeTab === "validator" && (
          <PrePublishValidator
            currentBlog={currentBlog}
            initialTitle={validatorTitle}
            initialKeyword={validatorKeyword}
          />
        )}

        {activeTab === "schema" && <SchemaGenerator />}

        {activeTab === "tracking" && <RankTracker currentBlog={currentBlog} />}

        {activeTab === "health" && <SiteHealth currentBlog={currentBlog} />}

        {activeTab === "outreach" && <OutreachCrm currentBlog={currentBlog} />}

        {activeTab === "tools" && <TechnicalTools />}

        {activeTab === "blogs" && (
          <BlogManager
            blogs={blogs}
            currentBlog={currentBlog}
            onSelectBlog={(b) => setCurrentBlog(b)}
            onRefreshBlogs={fetchBlogs}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-850 bg-stone-900/60 py-6 text-center text-xs text-stone-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Blogger SEO Command Center · 2026 Growth Playbook</span>
          <span className="text-[11px] text-stone-600">Google Search Console · Blogger API v3 · AdSense Ready</span>
        </div>
      </footer>
    </div>
  );
};

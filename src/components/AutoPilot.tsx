import React, { useState, useEffect } from "react";
import { Blog } from "../types.js";
import {
  Sparkles,
  Zap,
  Bot,
  Rocket,
  CheckCircle2,
  ListTree,
  Play,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Globe,
  FileText,
  AlertTriangle,
  Send,
  Sliders,
  DollarSign,
  Search,
} from "lucide-react";

interface AutoPilotLog {
  timestamp: string;
  stage: string;
  type: "info" | "success" | "warn" | "error";
  message: string;
}

interface AutoPilotMetrics {
  pagesCreated: number;
  postsAudited: number;
  postsEnriched: number;
  sitemapsSubmitted: number;
  urlsIndexed: number;
  newPostPublished?: string;
  adsenseReadinessScore: number;
}

export const AutoPilot: React.FC<{ currentBlog: Blog | null }> = ({ currentBlog }) => {
  // 360° Full Auto-Pilot State
  const [running360, setRunning360] = useState(false);
  const [autoFixThin, setAutoFixThin] = useState(true);
  const [autoPublishPolicy, setAutoPublishPolicy] = useState(true);
  const [autoSubmitSitemaps, setAutoSubmitSitemaps] = useState(true);
  const [autoIndex, setAutoIndex] = useState(true);
  const [publishNewPost, setPublishNewPost] = useState(true);
  const [logs360, setLogs360] = useState<AutoPilotLog[]>([]);
  const [metrics360, setMetrics360] = useState<AutoPilotMetrics | null>(null);

  // Manual / Single Post Generator State
  const [keyword, setKeyword] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);

  // Instant Indexing State
  const [indexUrl, setIndexUrl] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<any>(null);

  // Content Audit & Issue Resolver
  const [postsAuditList, setPostsAuditList] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [fixingPostId, setFixingPostId] = useState<string | null>(null);
  const [fixPostMessage, setFixPostMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentBlog) {
      fetchBlogPostsAudit();
    }
  }, [currentBlog]);

  const fetchBlogPostsAudit = async () => {
    if (!currentBlog?.blogger_blog_id) return;
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/blogger/audit-posts?blogId=${encodeURIComponent(currentBlog.blogger_blog_id)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPostsAuditList(data);
      }
    } catch (err) {
      console.warn("Audit load error:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleRun360AutoPilot = async () => {
    if (!currentBlog) {
      alert("Please select or configure a blog first.");
      return;
    }

    setRunning360(true);
    setLogs360([
      {
        timestamp: new Date().toLocaleTimeString(),
        stage: "INIT",
        type: "info",
        message: `Initiating 360° Automated Optimization for: "${currentBlog.name}"...`,
      },
    ]);
    setMetrics360(null);

    try {
      const res = await fetch("/api/autopilot/run-360", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId: currentBlog.id,
          options: {
            autoFixThinContent: autoFixThin,
            autoPublishPolicyPages: autoPublishPolicy,
            autoSubmitSitemaps: autoSubmitSitemaps,
            autoIndexUrls: autoIndex,
            publishNewArticle: publishNewPost,
          },
        }),
      });

      const data = await res.json();
      if (data.logs && Array.isArray(data.logs)) {
        setLogs360(data.logs);
      }
      if (data.metrics) {
        setMetrics360(data.metrics);
      }

      await fetchBlogPostsAudit();
    } catch (err: any) {
      setLogs360((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          stage: "ERROR",
          type: "error",
          message: "Auto-Pilot run failed: " + err.message,
        },
      ]);
    } finally {
      setRunning360(false);
    }
  };

  const handleFixIndividualPost = async (post: any) => {
    if (!currentBlog?.blogger_blog_id) return;
    setFixingPostId(post.bloggerPostId);
    setFixPostMessage(null);

    try {
      const res = await fetch("/api/blogger/autofix-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bloggerBlogId: currentBlog.blogger_blog_id,
          bloggerPostId: post.bloggerPostId,
          title: post.title,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFixPostMessage(`Successfully enriched "${post.title}"! (${data.changelog?.join(", ") || "Updated"})`);
        await fetchBlogPostsAudit();
      } else {
        alert(data.error || "Failed to auto-fix post");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setFixingPostId(null);
    }
  };

  const handleSinglePostGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBlog) {
      alert("Please select a blog first.");
      return;
    }
    if (!keyword) return;

    const submittedKeyword = keyword;
    setIsGenerating(true);
    setGenResult(null);

    try {
      const res = await fetch("/api/ai/autoblog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          niche: currentBlog.niche,
          blogId: currentBlog.id,
          isDraft,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenResult({ ...data, keyword: submittedKeyword });
        setKeyword("");
        await fetchBlogPostsAudit();
      } else {
        alert(data.error || "Failed to publish blog post");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 360° Hero Launch Section */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-500/15 text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/30">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Complete Autonomous Engine
              </span>
              {currentBlog && (
                <span className="text-xs text-stone-400 font-mono bg-stone-950/60 px-2.5 py-0.5 rounded-full border border-stone-800">
                  Target: <strong className="text-stone-200">{currentBlog.name}</strong>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-100 tracking-tight flex items-center gap-2">
              <Rocket className="w-6 h-6 text-amber-400" />
              360° Google & Blog Auto-Pilot
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Once initiated, the autonomous engine scans your entire Blogger site, resolves AdSense policy gaps by auto-publishing mandatory legal pages, expands thin articles to 1,500+ words with Gemini, submits sitemaps to Search Console, and publishes fresh high-intent content.
            </p>
          </div>

          {/* Action Button */}
          <div className="flex flex-col items-stretch lg:items-end gap-3 shrink-0">
            <button
              onClick={handleRun360AutoPilot}
              disabled={running360 || !currentBlog}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
            >
              {running360 ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Optimizing Ecosystem (360°)...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-stone-950" />
                  <span>Run Full 360° Auto-Pilot Now</span>
                </>
              )}
            </button>

            {metrics360 && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Last Cycle Completed Successfully
              </span>
            )}
          </div>
        </div>

        {/* Configuration Toggles */}
        <div className="mt-6 pt-5 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer bg-stone-950/60 p-2.5 rounded-xl border border-stone-850 hover:border-stone-750">
            <input
              type="checkbox"
              checked={autoPublishPolicy}
              onChange={(e) => setAutoPublishPolicy(e.target.checked)}
              className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="truncate">Auto-Fix Legal Pages</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer bg-stone-950/60 p-2.5 rounded-xl border border-stone-850 hover:border-stone-750">
            <input
              type="checkbox"
              checked={autoFixThin}
              onChange={(e) => setAutoFixThin(e.target.checked)}
              className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="truncate">Auto-Enrich Thin Posts</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer bg-stone-950/60 p-2.5 rounded-xl border border-stone-850 hover:border-stone-750">
            <input
              type="checkbox"
              checked={autoSubmitSitemaps}
              onChange={(e) => setAutoSubmitSitemaps(e.target.checked)}
              className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="truncate">Auto-Submit GSC Sitemaps</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer bg-stone-950/60 p-2.5 rounded-xl border border-stone-850 hover:border-stone-750">
            <input
              type="checkbox"
              checked={publishNewPost}
              onChange={(e) => setPublishNewPost(e.target.checked)}
              className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="truncate">Write & Publish Post</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer bg-stone-950/60 p-2.5 rounded-xl border border-stone-850 hover:border-stone-750 sm:col-span-2 md:col-span-1">
            <input
              type="checkbox"
              checked={autoIndex}
              onChange={(e) => setAutoIndex(e.target.checked)}
              className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="truncate">Instant Google Indexing</span>
          </label>
        </div>
      </div>

      {/* Real-Time Terminal / Execution Logs */}
      {(running360 || logs360.length > 0) && (
        <div className="bg-stone-950 border border-stone-800 rounded-3xl p-5 shadow-inner">
          <div className="flex items-center justify-between border-b border-stone-850 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-stone-400 font-mono ml-2">Auto-Pilot Live Execution Console</span>
            </div>
            {running360 && (
              <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
              </span>
            )}
          </div>

          <div className="space-y-1.5 font-mono text-xs max-h-64 overflow-y-auto pr-2">
            {logs360.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="text-stone-600 shrink-0 select-none">[{log.timestamp}]</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    log.stage === "ADSENSE"
                      ? "bg-amber-500/20 text-amber-300"
                      : log.stage === "CONTENT"
                      ? "bg-sky-500/20 text-sky-300"
                      : log.stage === "GSC"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : log.stage === "INDEXING"
                      ? "bg-purple-500/20 text-purple-300"
                      : log.stage === "PUBLISH"
                      ? "bg-pink-500/20 text-pink-300"
                      : "bg-stone-800 text-stone-300"
                  }`}
                >
                  {log.stage}
                </span>
                <span
                  className={`leading-relaxed ${
                    log.type === "success"
                      ? "text-emerald-400 font-semibold"
                      : log.type === "warn"
                      ? "text-amber-400"
                      : log.type === "error"
                      ? "text-rose-400 font-semibold"
                      : "text-stone-300"
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Scorecard from Auto-Pilot Run */}
      {metrics360 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] text-stone-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> AdSense Readiness
            </span>
            <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">{metrics360.adsenseReadinessScore}%</p>
            <span className="text-[10px] text-emerald-400 mt-0.5 block font-mono">Policy Compliant</span>
          </div>

          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] text-stone-400 font-medium">Pages Auto-Created</span>
            <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">+{metrics360.pagesCreated}</p>
            <span className="text-[10px] text-stone-500 mt-0.5 block font-mono">Legal/Policy pages</span>
          </div>

          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] text-stone-400 font-medium">Posts Auto-Enriched</span>
            <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">+{metrics360.postsEnriched}</p>
            <span className="text-[10px] text-sky-400 mt-0.5 block font-mono">1500+ Words & Schema</span>
          </div>

          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] text-stone-400 font-medium">Sitemaps Submitted</span>
            <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">{metrics360.sitemapsSubmitted}</p>
            <span className="text-[10px] text-emerald-400 mt-0.5 block font-mono">To Search Console</span>
          </div>

          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-[11px] text-stone-400 font-medium">URLs Indexed</span>
            <p className="text-xl sm:text-2xl font-extrabold text-stone-100 font-mono mt-1">{metrics360.urlsIndexed}</p>
            <span className="text-[10px] text-purple-400 mt-0.5 block font-mono">Instant Google Indexing</span>
          </div>
        </div>
      )}

      {/* Content Quality Audit & One-Click AI Post Enhancer */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              Live Blogger Content Audit & Quality Fixer
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Identifies thin content (&lt;800 words), missing H2 subheadings, missing image ALT tags, and missing FAQ schema.
            </p>
          </div>

          <button
            onClick={fetchBlogPostsAudit}
            disabled={loadingAudit}
            className="text-xs text-stone-300 hover:text-white bg-stone-850 hover:bg-stone-750 border border-stone-750 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? "animate-spin" : ""}`} />
            Refresh Audit
          </button>
        </div>

        {fixPostMessage && (
          <div className="mb-4 bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{fixPostMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          {postsAuditList.map((post) => {
            const audit = post.audit;
            const isThin = audit && audit.wordCount < 800;
            const isFixing = fixingPostId === post.bloggerPostId;

            return (
              <div
                key={post.bloggerPostId}
                className="bg-stone-950/70 border border-stone-850 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-stone-750 transition-colors"
              >
                <div className="space-y-1.5 max-w-2xl min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono ${
                        audit?.seoScore >= 80
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : audit?.seoScore >= 60
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      SEO Score: {audit?.seoScore || 0}/100
                    </span>

                    {isThin && (
                      <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-md border border-rose-500/20 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Thin Content
                      </span>
                    )}

                    <span className="text-[11px] text-stone-400">
                      Words: <strong className="text-stone-200 font-mono">{audit?.wordCount || 0}</strong> • Headings:{" "}
                      <strong className="text-stone-200 font-mono">{audit?.headingsCount || 0}</strong> • FAQs:{" "}
                      <strong className="text-stone-200">{audit?.hasFaqSection ? "Yes" : "No"}</strong>
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-stone-100 truncate">{post.title}</h4>

                  {audit?.issues && audit.issues.length > 0 && (
                    <p className="text-xs text-amber-400/90 leading-relaxed">{audit.issues.join(" • ")}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  <button
                    onClick={() => handleFixIndividualPost(post)}
                    disabled={isFixing}
                    className="text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isFixing ? "animate-spin" : ""}`} />
                    {isFixing ? "Enriching with Gemini..." : "Auto-Fix & Enrich Post"}
                  </button>
                </div>
              </div>
            );
          })}

          {postsAuditList.length === 0 && !loadingAudit && (
            <div className="py-8 text-center text-stone-500 text-xs">
              No posts found on Blogger yet. Use the generator below to publish your first post!
            </div>
          )}
        </div>
      </div>

      {/* Manual Targeted Post Generator */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <h3 className="text-base font-bold text-stone-100 flex items-center gap-2 mb-1.5">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Targeted AI Article Publisher (1,500+ Words + Schema.org)
        </h3>
        <p className="text-xs text-stone-400 mb-4">
          Provide a keyword to generate a complete, structured article with comparison tables, FAQ schema, and instant Blogger publishing.
        </p>

        <form onSubmit={handleSinglePostGenerate} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. Best SEO Tips for Blogger in 2026"
              className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-4 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              required
            />

            <div className="flex items-center gap-3 justify-between sm:justify-start">
              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDraft}
                  onChange={(e) => setIsDraft(e.target.checked)}
                  className="rounded bg-stone-950 border-stone-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Save as Draft</span>
              </label>

              <button
                type="submit"
                disabled={isGenerating || !currentBlog}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Writing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Generate & Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {genResult && (
          <div className="mt-4 bg-stone-950 border border-emerald-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4" /> Published Successfully to Blogger!
            </div>
            <p className="text-xs text-stone-300 font-medium">{genResult.title || genResult.keyword}</p>
            {genResult.postUrl && (
              <a
                href={genResult.postUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
              >
                View Live Article <Globe className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from "react";
import { Blog } from "../types.js";
import { Sparkles, Zap, Bot, Rocket, CheckCircle2, ListTree, Play, Loader2 } from "lucide-react";

export const AutoPilot: React.FC<{ currentBlog: Blog | null }> = ({ currentBlog }) => {
  const [keyword, setKeyword] = useState("");
  const [isDraft, setIsDraft] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [indexUrl, setIndexUrl] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState<any>(null);

  // End-to-End Campaign State
  const [campaignSeed, setCampaignSeed] = useState("");
  const [campaignCount, setCampaignCount] = useState(3);
  const [campaignDraft, setCampaignDraft] = useState(true);
  const [campaignRunning, setCampaignRunning] = useState(false);
  const [campaignLogs, setCampaignLogs] = useState<{ time: string; msg: string; type: "info" | "success" | "error" }[]>([]);

  const addLog = (msg: string, type: "info" | "success" | "error" = "info") => {
    setCampaignLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const handleRunCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBlog) {
      alert("Please select a blog first.");
      return;
    }
    if (!campaignSeed) return;

    setCampaignRunning(true);
    setCampaignLogs([]);
    addLog(`Starting End-to-End Campaign for: "${campaignSeed}"`, "info");
    addLog(`Target: ${campaignCount} posts, Mode: ${campaignDraft ? "Draft" : "Live Publish"}`, "info");

    try {
      // Step 1: Research Keywords
      addLog("Step 1: Researching semantic keywords via Gemini...", "info");
      const kwRes = await fetch("/api/ai/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: campaignSeed, niche: currentBlog.niche }),
      });
      const kwData = await kwRes.json();
      
      if (!kwRes.ok || !kwData.clusters) {
        throw new Error(kwData.error || "Failed to fetch keyword clusters");
      }

      let keywords: string[] = kwData.clusters.map((c: any) => c.keyword);
      addLog(`Found ${keywords.length} potential keywords. Selecting top ${campaignCount}...`, "success");
      
      const targetKeywords = keywords.slice(0, campaignCount);

      // Step 2: Loop through each keyword to generate and publish
      for (let i = 0; i < targetKeywords.length; i++) {
        const targetKw = targetKeywords[i];
        addLog(`[Post ${i + 1}/${targetKeywords.length}] Generating content for: "${targetKw}"`, "info");
        
        try {
          const postRes = await fetch("/api/ai/autoblog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keyword: targetKw,
              niche: currentBlog.niche,
              blogId: currentBlog.id,
              isDraft: campaignDraft,
            }),
          });
          
          const postData = await postRes.json();
          if (postRes.ok) {
            addLog(`[Post ${i + 1}] Successfully pushed to Blogger! Post ID: ${postData.postId}`, "success");
            
            // Step 3: Auto-Indexing (if Live)
            if (!campaignDraft && postData.postUrl) {
              addLog(`[Post ${i + 1}] Requesting instant indexing for: ${postData.postUrl}`, "info");
              try {
                await fetch("/api/tools/index-url", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: postData.postUrl }),
                });
                addLog(`[Post ${i + 1}] Indexing requested successfully.`, "success");
              } catch (idxErr) {
                addLog(`[Post ${i + 1}] Indexing request failed, but post is live.`, "error");
              }
            }
          } else {
            addLog(`[Post ${i + 1}] Failed: ${postData.error}`, "error");
          }
        } catch (postErr: any) {
          addLog(`[Post ${i + 1}] Error: ${postErr.message}`, "error");
        }

        // Add a brief delay between posts to prevent rate limiting
        if (i < targetKeywords.length - 1) {
          addLog(`Waiting 5 seconds before next post...`, "info");
          await new Promise(r => setTimeout(r, 5000));
        }
      }

      addLog(`Campaign completed successfully!`, "success");
    } catch (err: any) {
      addLog(`Campaign halted due to error: ${err.message}`, "error");
    } finally {
      setCampaignRunning(false);
    }
  };

  const handleAutoBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBlog) {
      alert("Please select a blog from the top dropdown first.");
      return;
    }
    if (!keyword) return;

    setIsGenerating(true);
    setResult(null);
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
        setResult(data);
        if (!isDraft && data.postUrl) {
          setIndexUrl(data.postUrl);
        }
      } else {
        alert(data.error || "Failed to run Auto-Pilot");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRequestIndexing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indexUrl) return;
    setIsIndexing(true);
    setIndexResult(null);
    try {
      const res = await fetch("/api/tools/index-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: indexUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setIndexResult(data.response);
      } else {
        alert(data.error || "Failed to submit to Google Indexing API");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100 tracking-tight">AI Auto-Pilot & Indexing</h1>
          <p className="text-xs text-stone-400">Generate complete Blogger posts and push them instantly to Google Indexing API.</p>
        </div>
      </div>

      {/* End-to-End Campaign Module */}
      <div className="bg-stone-850 border border-violet-500/30 rounded-2xl p-6 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ListTree className="w-5 h-5 text-violet-400" />
              <h3 className="text-lg font-bold text-stone-100">End-to-End Automated Campaign</h3>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-lg">
              Fully automate the SEO lifecycle. Provide a seed topic, and the agent will discover keywords, research briefs, write HTML-optimized blog posts, and publish them to Blogger automatically.
            </p>

            <form onSubmit={handleRunCampaign} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Seed Topic / Niche</label>
                <input
                  type="text"
                  value={campaignSeed}
                  onChange={(e) => setCampaignSeed(e.target.value)}
                  placeholder="e.g. Minimalist home office setups"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-violet-500"
                  required
                  disabled={campaignRunning}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Posts to Generate</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={campaignCount}
                    onChange={(e) => setCampaignCount(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-violet-500"
                    required
                    disabled={campaignRunning}
                  />
                </div>
                <div className="flex-1 flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="campaignDraft"
                      checked={campaignDraft}
                      onChange={(e) => setCampaignDraft(e.target.checked)}
                      className="rounded border-stone-700 bg-stone-900 text-violet-500 focus:ring-violet-500"
                      disabled={campaignRunning}
                    />
                    <label htmlFor="campaignDraft" className="text-xs text-stone-300 font-semibold cursor-pointer">
                      Publish as Draft
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={campaignRunning || !currentBlog}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm shadow transition-all flex items-center justify-center gap-2 mt-4"
              >
                {campaignRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Campaign Running...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Start Automated Campaign
                  </>
                )}
              </button>
              {!currentBlog && (
                <p className="text-[10px] text-amber-500 text-center">Please select a blog from the top menu to start.</p>
              )}
            </form>
          </div>

          {/* Campaign Console */}
          <div className="flex-1 flex flex-col min-h-[300px]">
            <label className="block text-xs font-semibold text-stone-400 mb-2">Campaign Console</label>
            <div className="flex-1 bg-stone-950 border border-stone-800 rounded-xl p-4 overflow-y-auto font-mono text-[11px] space-y-2">
              {campaignLogs.length === 0 ? (
                <span className="text-stone-600">Waiting to start campaign...</span>
              ) : (
                campaignLogs.map((log, i) => (
                  <div key={i} className={`flex gap-2 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-emerald-400' : 'text-stone-300'
                  }`}>
                    <span className="text-stone-600 shrink-0">[{log.time}]</span>
                    <span>{log.msg}</span>
                  </div>
                ))
              )}
              {campaignRunning && (
                <div className="flex gap-2 text-violet-400 animate-pulse mt-2">
                  <span className="text-stone-600">[{new Date().toLocaleTimeString()}]</span>
                  <span>Working...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: AI Auto-Blogger (Single Post) */}
        <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-bold text-stone-200">Single Post Auto-Blogger</h3>
          </div>
          <p className="text-xs text-stone-400">
            Write a full SEO-optimized HTML article for a specific keyword and push it to your account.
          </p>
          
          <form onSubmit={handleAutoBlog} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Target Keyword</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Best pour over coffee makers 2026"
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDraftSingle"
                checked={isDraft}
                onChange={(e) => setIsDraft(e.target.checked)}
                className="rounded border-stone-700 bg-stone-900 text-violet-500 focus:ring-violet-500"
              />
              <label htmlFor="isDraftSingle" className="text-xs text-stone-300 font-semibold cursor-pointer">
                Publish as Draft (Recommended)
              </label>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !currentBlog}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-white font-bold text-sm shadow transition-all flex items-center justify-center gap-2 border border-stone-700"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating & Publishing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  Generate Single Post
                </>
              )}
            </button>
          </form>

          {result && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mt-4">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-bold">Successfully pushed to Blogger!</span>
              </div>
              <a href={result.postUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-300 hover:underline">
                View on Blogger (Post ID: {result.postId})
              </a>
            </div>
          )}
        </div>

        {/* Module 2: Instant Indexing API */}
        <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-stone-200">Google Indexing API</h3>
          </div>
          <p className="text-xs text-stone-400">
            Force Google to crawl your URL immediately. Use sparingly for new or heavily updated content.
          </p>

          <form onSubmit={handleRequestIndexing} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Live URL to Index</label>
              <input
                type="url"
                value={indexUrl}
                onChange={(e) => setIndexUrl(e.target.value)}
                placeholder="https://yourblog.blogspot.com/2026/08/post.html"
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isIndexing}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 font-bold text-sm shadow transition-all flex items-center justify-center gap-2 border border-stone-700"
            >
              {isIndexing ? "Submitting to Google..." : "Request Instant Indexing"}
            </button>
          </form>

          {indexResult && (
            <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl mt-4 overflow-auto text-[10px] font-mono text-stone-400">
              <div className="text-emerald-400 mb-2 flex items-center gap-2 font-bold text-xs font-sans">
                <CheckCircle2 className="w-4 h-4" />
                Notification Sent!
              </div>
              <pre>{JSON.stringify(indexResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



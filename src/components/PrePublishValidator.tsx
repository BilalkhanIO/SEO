import React, { useState } from "react";
import { Blog, ValidationIssue } from "../types.js";
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  Send,
  Sparkles,
  Info,
} from "lucide-react";

interface PrePublishValidatorProps {
  currentBlog: Blog | null;
  initialTitle?: string;
  initialKeyword?: string;
}

export const PrePublishValidator: React.FC<PrePublishValidatorProps> = ({
  currentBlog,
  initialTitle = "",
  initialKeyword = "",
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [searchDescription, setSearchDescription] = useState("");
  const [permalinkSet, setPermalinkSet] = useState(false);
  const [labels, setLabels] = useState("");
  const [htmlContent, setHtmlContent] = useState(`<h2>Introduction</h2>
<p>In this comprehensive guide, we will explore the best strategies for Google Blogger SEO in 2026. Learning how to properly configure your blog helps increase search rankings.</p>

<h2>1. Optimize Post Permalinks</h2>
<p>Blogger allows setting a custom permalink before publication. Always keep it clean and include your primary keyword.</p>
<p>For more details, check our related guide on <a href="/p/keyword-research.html">keyword research</a> and authoritative documentation on <a href="https://developers.google.com/search">Google Search Central</a>.</p>

<h2>2. Image Optimization & Alt Text</h2>
<p><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600" alt="SEO analytics dashboard on laptop screen" /></p>
<p>Ensure every image includes descriptive alt text to improve accessibility and image SEO.</p>

<h2>Conclusion</h2>
<p>Follow these on-page guidelines to achieve sustainable organic traffic growth.</p>`);

  const [validationResult, setValidationResult] = useState<{
    passed: boolean;
    issues: ValidationIssue[];
    formatted: string;
  } | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Gemini AI Metadata Suggestions State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    titles: string[];
    descriptions: string[];
    permalinks: string[];
  } | null>(null);

  const handleGenerateAiMetadata = async () => {
    const kw = keyword.trim() || title.trim();
    if (!kw) {
      alert("Please enter a Target Keyword or Title first.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: kw,
          currentTitle: title.trim(),
          niche: currentBlog?.niche,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiSuggestions(data);
      } else {
        alert(data.error || "Failed to generate AI metadata");
      }
    } catch (err: any) {
      alert("AI Generation error: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!title.trim()) {
      alert("Please provide a title");
      return;
    }

    setIsValidating(true);
    setPublishSuccess(null);

    try {
      const res = await fetch("/api/posts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          html: htmlContent,
          searchDescription: searchDescription.trim(),
          keyword: keyword.trim(),
          permalinkSet,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setValidationResult(data);
      } else {
        alert(data.error || "Validation failed");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handlePublish = async (isDraft: boolean) => {
    if (!currentBlog) {
      alert("Select a target blog first.");
      return;
    }

    setIsPublishing(true);
    setPublishSuccess(null);

    try {
      const res = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId: currentBlog.id,
          title: title.trim(),
          html: htmlContent,
          labels,
          isDraft,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPublishSuccess(
          `Successfully ${isDraft ? "created draft" : "published live"}! Post ID: ${data.post?.id || "N/A"}`
        );
      } else {
        alert(data.error || "Blogger publish failed. Ensure Google credentials are authenticated.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const errorCount = validationResult?.issues.filter((i) => i.level === "error").length || 0;
  const warnCount = validationResult?.issues.filter((i) => i.level === "warn").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-amber-400" />
            Pre-Publish On-Page Validation Gate
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Enforces Playbook §4 Stage 5 rules: Title 40–60 chars · Custom permalink · Search description · Headings & Links · Image alt tags
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateAiMetadata}
          disabled={aiLoading || (!keyword.trim() && !title.trim())}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-stone-950 font-bold text-xs shadow flex items-center gap-2 shrink-0 transition-all cursor-pointer"
        >
          {aiLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
              Gemini Optimizing...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              Gemini AI Meta Optimizer
            </>
          )}
        </button>
      </div>

      {/* AI Metadata Suggestions Panel */}
      {aiSuggestions && (
        <div className="bg-gradient-to-r from-stone-900 to-stone-850 border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Gemini 3.7 AI Suggestions (Click any to apply instantly)
            </h3>
            <button
              onClick={() => setAiSuggestions(null)}
              className="text-stone-400 hover:text-stone-200 text-xs"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Title Options */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-stone-400 uppercase">Recommended Titles</span>
              <div className="space-y-1.5">
                {aiSuggestions.titles.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTitle(t)}
                    className="w-full text-left p-2 rounded-lg bg-stone-950/60 hover:bg-amber-500/10 border border-stone-800 hover:border-amber-500/40 text-xs text-stone-200 transition-all flex items-start justify-between gap-1"
                  >
                    <span>{t}</span>
                    <span className="text-[10px] font-mono text-stone-400 shrink-0">{t.length}c</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description Options */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-stone-400 uppercase">Search Descriptions</span>
              <div className="space-y-1.5">
                {aiSuggestions.descriptions.map((d, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSearchDescription(d)}
                    className="w-full text-left p-2 rounded-lg bg-stone-950/60 hover:bg-sky-500/10 border border-stone-800 hover:border-sky-500/40 text-xs text-stone-200 transition-all flex items-start justify-between gap-1"
                  >
                    <span>{d}</span>
                    <span className="text-[10px] font-mono text-stone-400 shrink-0">{d.length}c</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Permalink Slugs */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-stone-400 uppercase">Custom Permalink Slugs</span>
              <div className="space-y-1.5">
                {aiSuggestions.permalinks.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPermalinkSet(true);
                      alert(`Set Custom Permalink in Blogger settings: ${p}.html`);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-stone-950/60 hover:bg-emerald-500/10 border border-stone-800 hover:border-emerald-500/40 text-xs text-emerald-300 font-mono transition-all flex items-center justify-between"
                  >
                    <span>/{p}.html</span>
                    <span className="text-[10px] text-stone-400 uppercase">Use</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Draft Metadata & HTML (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-300">Post Title (Target: 40–60 characters)</label>
                <span className={`text-xs font-mono ${
                  title.length >= 40 && title.length <= 60 ? "text-emerald-400 font-bold" : "text-amber-400"
                }`}>
                  {title.length} chars
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 10 Proven Blogger SEO Tips to Boost Organic Traffic in 2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Target Keyword</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. blogger seo"
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Labels / Tags (comma separated)</label>
                <input
                  type="text"
                  value={labels}
                  onChange={(e) => setLabels(e.target.value)}
                  placeholder="e.g. SEO, Blogging, Tutorials"
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-300">
                  Search Description (Blogger per-post box, ≤160 chars)
                </label>
                <span className={`text-xs font-mono ${
                  searchDescription.length > 0 && searchDescription.length <= 160 ? "text-emerald-400 font-bold" : "text-stone-400"
                }`}>
                  {searchDescription.length}/160
                </span>
              </div>
              <textarea
                value={searchDescription}
                onChange={(e) => setSearchDescription(e.target.value)}
                placeholder="Compelling search snippet (~150 chars) containing primary keyword and user benefit..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <input
                type="checkbox"
                id="permalinkCheck"
                checked={permalinkSet}
                onChange={(e) => setPermalinkSet(e.target.checked)}
                className="rounded bg-stone-950 border-stone-700 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="permalinkCheck" className="text-xs text-stone-300 cursor-pointer">
                <strong>Custom Permalink Confirmed:</strong> I have configured the custom URL slug in Blogger before publishing.
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Draft Body HTML</label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={12}
                className="w-full p-3.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-amber-500 resize-y"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleValidate}
                disabled={isValidating}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs shadow flex items-center gap-2"
              >
                {isValidating ? "Running Gate Checks..." : "Run Pre-Publish Audit"}
              </button>

              <button
                type="button"
                onClick={() => handlePublish(true)}
                disabled={isPublishing || !currentBlog}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 font-semibold text-xs border border-stone-700 flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                Push Draft to Blogger
              </button>

              <button
                type="button"
                onClick={() => handlePublish(false)}
                disabled={isPublishing || !currentBlog || errorCount > 0}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs shadow flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Publish Live
              </button>
            </div>

            {publishSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
                {publishSuccess}
              </div>
            )}
          </div>
        </div>

        {/* Right Audit Results: Issues & Gate Verdict (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-4 h-full">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Gate Audit Verdict
              </h3>
              {validationResult && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                  validationResult.passed
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                }`}>
                  {validationResult.passed ? "PASS (Ready)" : "FAIL (Blocked)"}
                </span>
              )}
            </div>

            {!validationResult ? (
              <div className="py-16 text-center text-stone-500 text-xs space-y-2">
                <Info className="w-8 h-8 text-stone-600 mx-auto" />
                <p>Click "Run Pre-Publish Audit" to test your draft against the 9 on-page ranking criteria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Score Bar */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-rose-400">Blocking Errors</span>
                    <div className="text-xl font-bold font-mono text-rose-300 mt-0.5">{errorCount}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-400">Warnings</span>
                    <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">{warnCount}</div>
                  </div>
                </div>

                {validationResult.issues.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                    <p className="font-bold">All On-Page Checks Passed!</p>
                    <p className="text-[11px] text-emerald-400/80">
                      Your draft satisfies title bounds, structure, keyword placements, links, and search description.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                    {validationResult.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl text-xs space-y-1 border ${
                          issue.level === "error"
                            ? "bg-rose-950/30 border-rose-800/60 text-rose-200"
                            : "bg-amber-950/30 border-amber-800/60 text-amber-200"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                          {issue.level === "error" ? (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>[{issue.rule}] {issue.level}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-90">{issue.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { SerpAnalysis, Blog } from "../types.js";
import {
  FileText,
  Search,
  ExternalLink,
  HelpCircle,
  ListTree,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  BarChart2,
} from "lucide-react";

interface SerpBriefsProps {
  initialKeyword?: string;
  initialKeywordId?: number;
  currentBlog: Blog | null;
  onSendToPipeline: (title: string, briefMd: string, keywordId?: number) => void;
}

export const SerpBriefs: React.FC<SerpBriefsProps> = ({
  initialKeyword = "",
  initialKeywordId,
  currentBlog,
  onSendToPipeline,
}) => {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [keywordId, setKeywordId] = useState<number | undefined>(initialKeywordId);
  const [gl, setGl] = useState("us");
  const [loading, setLoading] = useState(false);
  const [serpData, setSerpData] = useState<SerpAnalysis | null>(null);
  const [briefMd, setBriefMd] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    if (initialKeyword) {
      setKeyword(initialKeyword);
      setKeywordId(initialKeywordId);
      handleAnalyze(initialKeyword, initialKeywordId);
    }
  }, [initialKeyword, initialKeywordId]);

  const handleGenerateAiBrief = async () => {
    if (!keyword.trim()) return;
    setAiGenerating(true);
    try {
      const competitorHeadings = serpData?.results
        ? serpData.results.flatMap((r) => r.headings || [])
        : [];

      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          niche: currentBlog?.niche,
          competitorHeadings,
        }),
      });

      const data = await res.json();
      if (res.ok && data.brief) {
        setBriefMd(data.brief);
      } else {
        alert(data.error || "Failed to generate AI brief with Gemini");
      }
    } catch (err: any) {
      alert("AI Generation error: " + err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAnalyze = async (kwToAnalyze?: string, kwId?: number) => {
    const kw = kwToAnalyze || keyword;
    if (!kw.trim()) return;

    setLoading(true);
    setSerpData(null);
    setBriefMd("");

    try {
      const res = await fetch("/api/keywords/serp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: kw.trim(),
          keywordId: kwId ?? keywordId,
          gl,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSerpData(data.analysis);
        setBriefMd(data.brief);
      } else {
        alert(data.error || "Failed to fetch SERP analysis");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(briefMd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreatePost = () => {
    if (!briefMd) return;
    onSendToPipeline(keyword, briefMd, keywordId);
  };

  const wordCounts = (serpData?.results || [])
    .filter((r) => r.wordCount)
    .map((r) => r.wordCount!);
  const medianWords = wordCounts.length
    ? wordCounts.sort((a, b) => a - b)[Math.floor(wordCounts.length / 2)]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            SERP Intelligence & Content Brief Generator
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Top 10 competitor heading analysis · Median word count · People Also Ask & Related query extraction
          </p>
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAnalyze();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter target keyword to analyze SERP..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <select
            value={gl}
            onChange={(e) => setGl(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
          >
            <option value="us">US (United States)</option>
            <option value="uk">UK (United Kingdom)</option>
            <option value="ca">CA (Canada)</option>
            <option value="au">AU (Australia)</option>
            <option value="pk">PK (Pakistan)</option>
            <option value="in">IN (India)</option>
          </select>

          <button
            type="submit"
            disabled={loading || aiGenerating}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs shadow transition-all flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                Analyzing Top 10...
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                Analyze SERP
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleGenerateAiBrief}
            disabled={loading || aiGenerating || !keyword.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-stone-950 font-bold text-xs shadow transition-all flex items-center justify-center gap-2 shrink-0"
          >
            {aiGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                Gemini Synthesizing...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                Generate Gemini AI Brief
              </>
            )}
          </button>
        </form>
      </div>

      {loading && (
        <div className="py-16 text-center bg-stone-850 rounded-2xl border border-stone-800 space-y-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-stone-200">Extracting SERP results and competitor headings...</p>
          <p className="text-xs text-stone-500">Querying Serper API and parsing ranking pages structure.</p>
        </div>
      )}

      {serpData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: SERP Findings & Competitors (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Quick Metrics */}
            <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-4 grid grid-cols-2 gap-3">
              <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800">
                <span className="text-[11px] text-stone-400 uppercase font-semibold">Median Length</span>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {medianWords ? `~${medianWords} words` : "N/A"}
                </div>
              </div>
              <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800">
                <span className="text-[11px] text-stone-400 uppercase font-semibold">Top 10 Enriched</span>
                <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
                  {serpData.results.length} Pages
                </div>
              </div>
            </div>

            {/* People Also Ask */}
            {serpData.peopleAlsoAsk.length > 0 && (
              <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-4 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-sky-400" />
                  People Also Ask (H2 / FAQ Candidates)
                </h3>
                <ul className="space-y-1.5 text-xs text-stone-300">
                  {serpData.peopleAlsoAsk.map((q, i) => (
                    <li key={i} className="p-2 rounded-lg bg-stone-900/60 border border-stone-800">
                      • {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top 10 Ranking Pages */}
            <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                <ListTree className="w-4 h-4 text-amber-400" />
                Top Ranking Competitors
              </h3>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {serpData.results.map((r) => (
                  <div
                    key={r.position}
                    className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 font-mono">#{r.position}</span>
                      {r.wordCount && (
                        <span className="text-[10px] text-stone-400 font-mono">~{r.wordCount} words</span>
                      )}
                    </div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-stone-200 hover:text-amber-300 line-clamp-1 flex items-center gap-1"
                    >
                      {r.title} <ExternalLink className="w-3 h-3 shrink-0 inline opacity-60" />
                    </a>
                    <p className="text-stone-400 text-[11px] line-clamp-2">{r.snippet}</p>
                    {r.headings && r.headings.length > 0 && (
                      <div className="pt-1 text-[10px] text-stone-400 font-mono line-clamp-2">
                        Headings: {r.headings.slice(0, 3).join(" · ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Generated Content Brief (7 cols) */}
          <div className="lg:col-span-7 bg-stone-850 border border-stone-700/60 rounded-2xl p-5 flex flex-col h-[700px]">
            <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-3">
              <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Playbook Content Brief Skeleton
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Markdown"}
                </button>
                <button
                  onClick={handleCreatePost}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  Push to Pipeline <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              value={briefMd}
              onChange={(e) => setBriefMd(e.target.value)}
              className="flex-1 w-full p-4 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-amber-500 resize-none"
              placeholder="Content brief markdown will appear here..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

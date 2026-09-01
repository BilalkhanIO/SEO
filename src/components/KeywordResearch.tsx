import React, { useState, useEffect } from "react";
import { Blog, Keyword } from "../types.js";
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Database,
  Globe,
  Flame,
  FileText,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

interface KeywordResearchProps {
  currentBlog: Blog | null;
  onOpenSerp: (keyword: string, keywordId?: number) => void;
  onCreateBrief: (keywordId: number) => void;
}

export const KeywordResearch: React.FC<KeywordResearchProps> = ({
  currentBlog,
  onOpenSerp,
  onCreateBrief,
}) => {
  const [activeTab, setActiveTab] = useState<"harvest" | "mine" | "ai" | "list">("harvest");
  const [seed, setSeed] = useState("");
  const [gl, setGl] = useState("us");
  const [hl, setHl] = useState("en");
  const [alphabet, setAlphabet] = useState(true);
  const [questions, setQuestions] = useState(true);
  const [modifiers, setModifiers] = useState(true);
  const [recursive, setRecursive] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [harvestResults, setHarvestResults] = useState<string[]>([]);
  const [harvestStoredCount, setHarvestStoredCount] = useState<number | null>(null);

  // Gemini AI Keyword Expansion State
  const [aiSeed, setAiSeed] = useState("");
  const [isAiExpanding, setIsAiExpanding] = useState(false);
  const [aiClusters, setAiClusters] = useState<
    Array<{
      keyword: string;
      intent: "informational" | "commercial" | "transactional" | "navigational";
      difficulty: "Easy" | "Medium" | "Hard";
      priorityScore: number;
      reason: string;
    }>
  >([]);

  // GSC Mining State
  const [mineDays, setMineDays] = useState("90");
  const [mineMinImp, setMineMinImp] = useState("50");
  const [isMining, setIsMining] = useState(false);
  const [mineCandidates, setMineCandidates] = useState<any[]>([]);

  // Keywords List State
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  // Scoring Modal State
  const [scoringKw, setScoringKw] = useState<Keyword | null>(null);
  const [scoreRelevance, setScoreRelevance] = useState(2);
  const [scoreIntent, setScoreIntent] = useState(2);
  const [scoreWinnable, setScoreWinnable] = useState(1);
  const [scoreTraffic, setScoreTraffic] = useState(2);
  const [scoreValue, setScoreValue] = useState(2);
  const [intentType, setIntentType] = useState("informational");
  const [scoringNotes, setScoringNotes] = useState("");
  const [submittingScore, setSubmittingScore] = useState(false);

  useEffect(() => {
    fetchKeywords();
  }, [currentBlog, statusFilter]);

  const fetchKeywords = async () => {
    setLoadingList(true);
    try {
      const blogParam = currentBlog ? `blogId=${currentBlog.id}&` : "";
      const statusParam = statusFilter !== "all" ? `status=${statusFilter}` : "";
      const res = await fetch(`/api/keywords?${blogParam}${statusParam}`);
      if (res.ok) {
        setKeywords(await res.json());
      }
    } catch (err) {
      console.error("Error fetching keywords:", err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seed.trim()) return;

    setIsHarvesting(true);
    setHarvestResults([]);
    setHarvestStoredCount(null);

    try {
      const res = await fetch("/api/keywords/harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed: seed.trim(),
          blogId: currentBlog?.id,
          gl,
          hl,
          alphabet,
          questions,
          modifiers,
          recursive,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setHarvestResults(data.keywords || []);
        setHarvestStoredCount(data.stored || 0);
        fetchKeywords();
      } else {
        alert(data.error || "Failed to harvest keywords");
      }
    } catch (err: any) {
      alert("Error harvesting: " + err.message);
    } finally {
      setIsHarvesting(false);
    }
  };

  const handleMine = async () => {
    if (!currentBlog) {
      alert("Please select a registered blog first.");
      return;
    }
    setIsMining(true);
    setMineCandidates([]);
    try {
      const res = await fetch("/api/keywords/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId: currentBlog.id,
          days: parseInt(mineDays),
          minImpressions: parseInt(mineMinImp),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMineCandidates(data.candidates || []);
        fetchKeywords();
      } else {
        alert(data.error || "GSC mining failed");
      }
    } catch (err: any) {
      alert("Error mining GSC: " + err.message);
    } finally {
      setIsMining(false);
    }
  };

  const handleAiExpand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSeed.trim()) return;
    setIsAiExpanding(true);
    setAiClusters([]);
    try {
      const res = await fetch("/api/ai/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed: aiSeed.trim(),
          niche: currentBlog?.niche,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiClusters(data.clusters || []);
      } else {
        alert(data.error || "Failed to expand keywords with Gemini");
      }
    } catch (err: any) {
      alert("AI keyword expansion error: " + err.message);
    } finally {
      setIsAiExpanding(false);
    }
  };

  const handleSaveAiKeyword = async (item: {
    keyword: string;
    intent: string;
    priorityScore: number;
  }) => {
    try {
      const res = await fetch("/api/keywords/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywordId: undefined,
          keyword: item.keyword,
          blogId: currentBlog?.id,
          relevance: 2,
          intent: 2,
          winnable: 2,
          traffic: 2,
          value: 2,
          intentType: item.intent,
          notes: `Imported from Gemini AI (${item.priorityScore}/10 priority)`,
          status: "scored",
        }),
      });
      if (res.ok) {
        fetchKeywords();
        alert(`Saved "${item.keyword}" to scored repository!`);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openScoring = (kw: Keyword) => {
    setScoringKw(kw);
    setScoreRelevance(kw.score_relevance ?? 2);
    setScoreIntent(kw.score_intent ?? 2);
    setScoreWinnable(kw.score_winnable ?? 1);
    setScoreTraffic(kw.score_traffic ?? 2);
    setScoreValue(kw.score_value ?? 2);
    setIntentType(kw.intent || "informational");
    setScoringNotes(kw.notes || "");
  };

  const submitScore = async () => {
    if (!scoringKw) return;
    setSubmittingScore(true);
    try {
      const res = await fetch("/api/keywords/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywordId: scoringKw.id,
          relevance: scoreRelevance,
          intentFit: scoreIntent,
          winnable: scoreWinnable,
          traffic: scoreTraffic,
          value: scoreValue,
          intent: intentType,
          notes: scoringNotes,
        }),
      });

      if (res.ok) {
        setScoringKw(null);
        fetchKeywords();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to score keyword");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingScore(false);
    }
  };

  const totalCurrentScore =
    scoreRelevance + scoreIntent + scoreWinnable + scoreTraffic + scoreValue;

  const filteredKeywords = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-400" />
            Keyword Intelligence & 5-Gate Funnel
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Google Autocomplete Harvester (a–z + questions + modifiers) · GSC pre-validated query gaps · 5-Gate scoring funnel
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-stone-900/90 p-1.5 rounded-2xl border border-stone-800 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("harvest")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "harvest"
                ? "bg-amber-500 text-stone-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Autocomplete Harvester
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ai"
                ? "bg-amber-500 text-stone-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            Gemini AI Discovery
          </button>
          <button
            onClick={() => setActiveTab("mine")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "mine"
                ? "bg-amber-500 text-stone-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Mine GSC Gaps
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "list"
                ? "bg-amber-500 text-stone-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Repository ({keywords.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Autocomplete Harvester */}
      {activeTab === "harvest" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Harvest Configuration
            </h3>

            <form onSubmit={handleHarvest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Seed Keyword / Topic
                </label>
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="e.g. blogger seo, recipe blog, tech review"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                    Country (gl)
                  </label>
                  <select
                    value={gl}
                    onChange={(e) => setGl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="us">United States (us)</option>
                    <option value="uk">United Kingdom (uk)</option>
                    <option value="ca">Canada (ca)</option>
                    <option value="au">Australia (au)</option>
                    <option value="pk">Pakistan (pk)</option>
                    <option value="in">India (in)</option>
                    <option value="de">Germany (de)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                    Language (hl)
                  </label>
                  <select
                    value={hl}
                    onChange={(e) => setHl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="en">English (en)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                    <option value="de">German (de)</option>
                    <option value="ur">Urdu (ur)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-800">
                <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alphabet}
                    onChange={(e) => setAlphabet(e.target.checked)}
                    className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Alphabet expansion (seed + a..z)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questions}
                    onChange={(e) => setQuestions(e.target.checked)}
                    className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Question prefixes (how, why, what, can...)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modifiers}
                    onChange={(e) => setModifiers(e.target.checked)}
                    className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Modifiers (for, vs, best, free, review...)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recursive}
                    onChange={(e) => setRecursive(e.target.checked)}
                    className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Recursive 2nd level loop (feed top candidates back)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isHarvesting}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-sm shadow transition-all flex items-center justify-center gap-2"
              >
                {isHarvesting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    Harvesting Google Queries...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Harvest All Variations (~45 queries)
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-stone-850 border border-stone-700/60 rounded-2xl p-5 flex flex-col h-[520px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-200">
                Harvest Candidates {harvestResults.length > 0 && `(${harvestResults.length} found)`}
              </h3>
              {harvestStoredCount !== null && (
                <span className="text-xs text-emerald-400 font-medium">
                  ✅ Stored {harvestStoredCount} new candidates to DB
                </span>
              )}
            </div>

            {harvestResults.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-stone-800 rounded-xl bg-stone-900/40">
                <Search className="w-10 h-10 text-stone-600 mb-2" />
                <p className="text-sm text-stone-300 font-medium">Ready to harvest autocomplete data</p>
                <p className="text-xs text-stone-500 max-w-sm mt-1">
                  Enter a seed phrase and run the harvester to uncover dozens of exact search queries real users type into Google.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                {harvestResults.map((kw, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-800 hover:border-stone-700 flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-stone-200">{kw}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenSerp(kw)}
                        className="text-stone-400 hover:text-amber-400 flex items-center gap-1 font-semibold"
                      >
                        SERP <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GSC Opportunity Miner */}
      {activeTab === "mine" && (
        <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-400" />
                Search Console Pre-Validated Demand Miner
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Find queries your blog already appears for (Position &gt; 8, Impressions ≥ {mineMinImp}) that you don't yet have dedicated posts for.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={mineDays}
                onChange={(e) => setMineDays(e.target.value)}
                className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-stone-200"
              >
                <option value="28">Last 28 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="180">Last 180 Days</option>
              </select>

              <button
                onClick={handleMine}
                disabled={isMining || !currentBlog}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-stone-950 font-bold text-xs shadow transition-all flex items-center gap-2"
              >
                {isMining ? "Mining GSC..." : "Mine GSC Query Gaps"}
              </button>
            </div>
          </div>

          {mineCandidates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Discovered Opportunities ({mineCandidates.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {mineCandidates.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-stone-200">{c.keys[0]}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        Pos: <span className="text-amber-400 font-mono">{c.position.toFixed(1)}</span> · Imp: <span className="text-sky-300 font-mono">{Math.round(c.impressions)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenSerp(c.keys[0])}
                      className="px-2.5 py-1 rounded bg-stone-800 hover:bg-amber-500/20 text-amber-300 border border-stone-700 text-[11px] font-semibold"
                    >
                      Analyze SERP
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Gemini AI Keyword Discovery & Clustering */}
      {activeTab === "ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-stone-850 border border-stone-700/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Gemini 3.7 AI Topic Expansion
            </h3>
            <p className="text-xs text-stone-400">
              Generates high-ROI keyword clusters with search intent classification, estimated difficulty, and monetization priority scores.
            </p>

            <form onSubmit={handleAiExpand} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Seed Topic or Core Niche
                </label>
                <input
                  type="text"
                  value={aiSeed}
                  onChange={(e) => setAiSeed(e.target.value)}
                  placeholder="e.g. coffee brewing, tech tutorials, travel gear"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {currentBlog?.niche && (
                <div className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 text-xs text-stone-400">
                  Target Niche: <span className="text-stone-200 font-semibold">{currentBlog.niche}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isAiExpanding}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-stone-950 font-bold text-sm shadow transition-all flex items-center justify-center gap-2"
              >
                {isAiExpanding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    Gemini AI Thinking & Clustering...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    Expand with Gemini AI
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-stone-850 border border-stone-700/60 rounded-2xl p-5 flex flex-col h-[560px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-200">
                AI Keyword Clusters {aiClusters.length > 0 && `(${aiClusters.length} discovered)`}
              </h3>
            </div>

            {aiClusters.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-stone-800 rounded-xl bg-stone-900/40">
                <Sparkles className="w-10 h-10 text-stone-600 mb-2" />
                <p className="text-sm text-stone-300 font-medium">Ready to discover AI keyword clusters</p>
                <p className="text-xs text-stone-500 max-w-sm mt-1">
                  Enter your core topic and click Expand to receive intelligent keyword opportunities scored for winnability and audience intent.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
                {aiClusters.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-100 font-mono text-sm">{item.keyword}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.difficulty === "Easy"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : item.difficulty === "Medium"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {item.difficulty}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-800 text-stone-300 border border-stone-700">
                          {item.intent}
                        </span>
                      </div>
                      <p className="text-stone-400 text-[11px]">{item.reason}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-center px-2 py-1 bg-stone-950 rounded-lg border border-stone-800">
                        <div className="text-[10px] text-stone-500 uppercase">Priority</div>
                        <div className="font-mono font-bold text-amber-400">{item.priorityScore}/10</div>
                      </div>

                      <button
                        onClick={() => handleSaveAiKeyword(item)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold"
                      >
                        + Save to Repo
                      </button>

                      <button
                        onClick={() => onOpenSerp(item.keyword)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
                        title="Analyze SERP"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Stored Keywords Repository & 5-Gate Funnel */}
      {activeTab === "list" && (
        <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stored keywords..."
                className="w-full px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-stone-200"
              >
                <option value="all">All Statuses</option>
                <option value="idea">Idea (Unscored)</option>
                <option value="scored">Scored (≥6)</option>
                <option value="briefed">Briefed</option>
                <option value="archived">Archived (&lt;6)</option>
              </select>
            </div>
          </div>

          {loadingList ? (
            <div className="py-12 text-center text-stone-400 text-sm">Loading repository...</div>
          ) : filteredKeywords.length === 0 ? (
            <div className="py-12 text-center bg-stone-900/50 rounded-xl border border-dashed border-stone-800 text-stone-400 text-xs">
              No keywords match current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Keyword</th>
                    <th className="pb-3 font-semibold">Source</th>
                    <th className="pb-3 font-semibold">Intent</th>
                    <th className="pb-3 font-semibold">5-Gate Score</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {filteredKeywords.map((kw) => (
                    <tr key={kw.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-3 font-medium text-stone-200 pr-3">{kw.keyword}</td>
                      <td className="py-3 text-stone-400">
                        <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 font-mono text-[10px]">
                          {kw.source}
                        </span>
                      </td>
                      <td className="py-3 text-stone-300 capitalize">{kw.intent || "—"}</td>
                      <td className="py-3">
                        {kw.score_total !== null ? (
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                              kw.score_total >= 8
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : kw.score_total >= 6
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {kw.score_total}/10
                          </span>
                        ) : (
                          <span className="text-stone-500">Unscored</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="text-stone-300 uppercase text-[10px] font-semibold">{kw.status}</span>
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => openScoring(kw)}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold text-[11px]"
                        >
                          Score
                        </button>
                        <button
                          onClick={() => onOpenSerp(kw.keyword, kw.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold text-[11px]"
                        >
                          SERP
                        </button>
                        {kw.score_total !== null && kw.score_total >= 6 && (
                          <button
                            onClick={() => onCreateBrief(kw.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px]"
                          >
                            Brief
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5-Gate Funnel Scoring Modal */}
      {scoringKw && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-100">5-Gate Scoring Funnel</h3>
                <p className="text-xs text-amber-400 font-mono mt-0.5">"{scoringKw.keyword}"</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-stone-100">{totalCurrentScore}/10</span>
                <div className={`text-[10px] font-bold uppercase ${
                  totalCurrentScore >= 8 ? "text-emerald-400" : totalCurrentScore >= 6 ? "text-amber-400" : "text-rose-400"
                }`}>
                  {totalCurrentScore >= 8 ? "🎯 Write It (Pass)" : totalCurrentScore >= 6 ? "🟡 Backlog" : "❌ Archive"}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Gate 1: Relevance */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-850 border border-stone-800">
                <div>
                  <div className="font-semibold text-stone-200">1. Relevance (Niche Fit)</div>
                  <div className="text-[11px] text-stone-400">Direct match to your blog topic authority</div>
                </div>
                <select
                  value={scoreRelevance}
                  onChange={(e) => setScoreRelevance(parseInt(e.target.value))}
                  className="px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-stone-200"
                >
                  <option value={2}>2 - Perfect Fit</option>
                  <option value={1}>1 - Adjacent</option>
                  <option value={0}>0 - Irrelevant</option>
                </select>
              </div>

              {/* Gate 2: Intent Fit */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-850 border border-stone-800">
                <div>
                  <div className="font-semibold text-stone-200">2. Intent Alignment</div>
                  <div className="text-[11px] text-stone-400">Clear answerable intent format</div>
                </div>
                <select
                  value={scoreIntent}
                  onChange={(e) => setScoreIntent(parseInt(e.target.value))}
                  className="px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-stone-200"
                >
                  <option value={2}>2 - Clear Intent</option>
                  <option value={1}>1 - Mixed Intent</option>
                  <option value={0}>0 - Ambiguous</option>
                </select>
              </div>

              {/* Gate 3: Winnability */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-850 border border-stone-800">
                <div>
                  <div className="font-semibold text-stone-200">3. Winnability vs SERP</div>
                  <div className="text-[11px] text-stone-400">Can beat competitor quality / authority</div>
                </div>
                <select
                  value={scoreWinnable}
                  onChange={(e) => setScoreWinnable(parseInt(e.target.value))}
                  className="px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-stone-200"
                >
                  <option value={2}>2 - Highly Winnable</option>
                  <option value={1}>1 - Moderate Effort</option>
                  <option value={0}>0 - Dominant Giants</option>
                </select>
              </div>

              {/* Gate 4: Traffic Demand */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-850 border border-stone-800">
                <div>
                  <div className="font-semibold text-stone-200">4. Traffic Potential</div>
                  <div className="text-[11px] text-stone-400">Search volume & secondary keyword clusters</div>
                </div>
                <select
                  value={scoreTraffic}
                  onChange={(e) => setScoreTraffic(parseInt(e.target.value))}
                  className="px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-stone-200"
                >
                  <option value={2}>2 - Solid Volume</option>
                  <option value={1}>1 - Long-tail</option>
                  <option value={0}>0 - Zero Demand</option>
                </select>
              </div>

              {/* Gate 5: Business / Audience Value */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-850 border border-stone-800">
                <div>
                  <div className="font-semibold text-stone-200">5. Value & Conversions</div>
                  <div className="text-[11px] text-stone-400">Ad revenue, affiliate, or email signups</div>
                </div>
                <select
                  value={scoreValue}
                  onChange={(e) => setScoreValue(parseInt(e.target.value))}
                  className="px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-stone-200"
                >
                  <option value={2}>2 - High Monetization</option>
                  <option value={1}>1 - Indirect Value</option>
                  <option value={0}>0 - No Value</option>
                </select>
              </div>

              {/* Intent & Notes */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Intent Category</label>
                  <select
                    value={intentType}
                    onChange={(e) => setIntentType(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200"
                  >
                    <option value="informational">Informational</option>
                    <option value="commercial">Commercial</option>
                    <option value="transactional">Transactional</option>
                    <option value="navigational">Navigational</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Notes / Angle</label>
                  <input
                    type="text"
                    value={scoringNotes}
                    onChange={(e) => setScoringNotes(e.target.value)}
                    placeholder="e.g. Include comparison table"
                    className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setScoringKw(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitScore}
                disabled={submittingScore}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
              >
                {submittingScore ? "Saving..." : "Save Score"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

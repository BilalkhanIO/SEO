import React, { useState, useEffect } from "react";
import { Blog, Post } from "../types.js";
import {
  Sparkles,
  Plus,
  ArrowRight,
  FileCheck,
  Globe,
  Clock,
  Layers,
  Edit3,
  CheckCircle2,
} from "lucide-react";

const STAGES = [
  "idea",
  "researched",
  "briefed",
  "drafted",
  "optimized",
  "published",
  "indexed",
  "tracking",
  "refresh",
] as const;

interface ContentPipelineProps {
  currentBlog: Blog | null;
  onValidatePost: (title: string, keyword?: string) => void;
  pendingPostData?: { title: string; briefMd: string; keywordId?: number } | null;
}

export const ContentPipeline: React.FC<ContentPipelineProps> = ({
  currentBlog,
  onValidatePost,
  pendingPostData,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeBriefPost, setActiveBriefPost] = useState<Post | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formStage, setFormStage] = useState<Post["stage"]>("idea");
  const [formBrief, setFormBrief] = useState("");
  const [formKeywordId, setFormKeywordId] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [currentBlog]);

  useEffect(() => {
    if (pendingPostData) {
      setFormTitle(pendingPostData.title);
      setFormBrief(pendingPostData.briefMd);
      setFormKeywordId(pendingPostData.keywordId);
      setFormStage("briefed");
      setShowCreateModal(true);
    }
  }, [pendingPostData]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const blogParam = currentBlog ? `?blogId=${currentBlog.id}` : "";
      const res = await fetch(`/api/posts${blogParam}`);
      if (res.ok) {
        setPosts(await res.json());
      }
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBlog) {
      alert("Please select a target blog first.");
      return;
    }
    if (!formTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId: currentBlog.id,
          keywordId: formKeywordId || null,
          title: formTitle.trim(),
          stage: formStage,
          briefMd: formBrief || null,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setFormTitle("");
        setFormBrief("");
        setFormKeywordId(undefined);
        fetchPosts();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to create post");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStage = async (postId: number, newStage: Post["stage"]) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, stage: newStage } : p))
        );
      }
    } catch (err) {
      console.error("Failed to update post stage:", err);
    }
  };

  const filteredPosts = posts.filter(
    (p) => selectedStage === "all" || p.stage === selectedStage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Blogger Content State Machine
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Track posts across all 9 production stages: Idea → Briefed → Drafted → Optimized → Published → Refresh
          </p>
        </div>

        <button
          onClick={() => {
            setFormTitle("");
            setFormBrief("");
            setFormStage("idea");
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Pipeline Post
        </button>
      </div>

      {/* Stage Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedStage("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedStage === "all"
              ? "bg-amber-500 text-stone-950 font-bold shadow-sm"
              : "bg-stone-900 text-stone-300 hover:bg-stone-850 border border-stone-800"
          }`}
        >
          All ({posts.length})
        </button>
        {STAGES.map((s) => {
          const count = posts.filter((p) => p.stage === s).length;
          return (
            <button
              key={s}
              onClick={() => setSelectedStage(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition-all cursor-pointer ${
                selectedStage === s
                  ? "bg-amber-500 text-stone-950 font-bold shadow-sm"
                  : "bg-stone-900 text-stone-400 hover:bg-stone-850 border border-stone-800"
              }`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Pipeline Kanban / List */}
      {loading ? (
        <div className="py-12 text-center text-stone-400 text-sm">Loading pipeline...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-16 text-center bg-stone-900/60 rounded-3xl border border-dashed border-stone-800">
          <Layers className="w-8 h-8 text-stone-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-300">No posts in this stage</p>
          <p className="text-xs text-stone-500 mt-1">Create a new post or generate a brief from a harvested keyword.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 space-y-4 hover:border-stone-700 transition-all flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-850 text-amber-300 border border-stone-750 font-mono">
                    {post.stage}
                  </span>
                  <span className="text-xs text-stone-500 font-mono">#{post.id}</span>
                </div>
                <h3 className="text-sm font-bold text-stone-100 line-clamp-2">{post.title}</h3>
                {post.keyword && (
                  <div className="text-xs text-stone-400">
                    Target Keyword: <span className="text-stone-300 font-mono">{post.keyword}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-stone-850">
                {/* Stage Progression Selector */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400 font-medium">Move Stage:</span>
                  <select
                    value={post.stage}
                    onChange={(e) => handleUpdateStage(post.id, e.target.value as Post["stage"])}
                    className="px-2 py-1 bg-stone-950 border border-stone-750 rounded-lg text-xs text-stone-200 capitalize font-medium cursor-pointer"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {post.brief_md && (
                    <button
                      onClick={() => setActiveBriefPost(post)}
                      className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      View Brief
                    </button>
                  )}
                  <button
                    onClick={() => onValidatePost(post.title, post.keyword)}
                    className="ml-auto px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Validate Gate
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Brief Modal */}
      {activeBriefPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-100">Content Brief</h3>
                <p className="text-xs text-stone-400">{activeBriefPost.title}</p>
              </div>
              <button
                onClick={() => setActiveBriefPost(null)}
                className="text-xs text-stone-400 hover:text-stone-200 font-bold"
              >
                Close
              </button>
            </div>
            <textarea
              readOnly
              value={activeBriefPost.brief_md || ""}
              className="flex-1 w-full p-4 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 font-mono text-xs leading-relaxed overflow-y-auto resize-none"
              rows={16}
            />
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePost}
            className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-bold text-stone-100">New Content Pipeline Post</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-stone-400 hover:text-stone-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">Post Title / Working Headline</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. 10 Essential Blogger SEO Tips for 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Initial Stage</label>
                <select
                  value={formStage}
                  onChange={(e) => setFormStage(e.target.value as Post["stage"])}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 capitalize"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Brief Markdown (Optional)</label>
                <textarea
                  value={formBrief}
                  onChange={(e) => setFormBrief(e.target.value)}
                  placeholder="# Outline..."
                  className="w-full p-3 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 font-mono text-xs resize-none"
                  rows={6}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
              >
                {isSubmitting ? "Creating..." : "Add to Pipeline"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

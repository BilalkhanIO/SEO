import React, { useState } from "react";
import { Blog } from "../types.js";
import {
  Globe,
  Plus,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";

interface BlogManagerProps {
  blogs: Blog[];
  currentBlog: Blog | null;
  onSelectBlog: (blog: Blog) => void;
  onRefreshBlogs: () => void;
}

export const BlogManager: React.FC<BlogManagerProps> = ({
  blogs,
  currentBlog,
  onSelectBlog,
  onRefreshBlogs,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [bloggerBlogId, setBloggerBlogId] = useState("");
  const [gscProperty, setGscProperty] = useState("");
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [niche, setNiche] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingBlogger, setIsSyncingBlogger] = useState(false);

  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          bloggerBlogId: bloggerBlogId.trim() || null,
          gscProperty: gscProperty.trim() || null,
          isCustomDomain,
          niche: niche.trim() || null,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setName("");
        setUrl("");
        setBloggerBlogId("");
        setGscProperty("");
        setNiche("");
        onRefreshBlogs();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to create blog");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncFromBlogger = async () => {
    setIsSyncingBlogger(true);
    try {
      const res = await fetch("/api/blogs/sync-blogger", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`Synced ${data.synced ?? data.count ?? 0} blogs from Google Blogger account!`);
        onRefreshBlogs();
      } else {
        alert(data.error || "Failed to sync. Make sure Google OAuth credentials are authenticated.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSyncingBlogger(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-400" />
            Managed Blogs ({blogs.length})
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Configure target Blogger domains, Google Search Console properties, and niche categories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncFromBlogger}
            disabled={isSyncingBlogger}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700 flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBlogger ? "animate-spin" : ""}`} />
            {isSyncingBlogger ? "Syncing..." : "Sync from Blogger API"}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Blog
          </button>
        </div>
      </div>

      {/* Blogs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {blogs.map((blog) => {
          const isSelected = currentBlog?.id === blog.id;
          return (
            <div
              key={blog.id}
              onClick={() => onSelectBlog(blog)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                isSelected
                  ? "bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40"
                  : "bg-stone-850 border-stone-700/60 hover:border-stone-600"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-100">{blog.name}</span>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950">
                      Active Target
                    </span>
                  )}
                </div>

                <a
                  href={blog.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-stone-400 hover:text-amber-300 font-mono flex items-center gap-1 truncate"
                >
                  {blog.url} <ExternalLink className="w-3 h-3 inline shrink-0" />
                </a>

                {blog.niche && (
                  <div className="text-[11px] text-stone-400">
                    Niche: <span className="text-stone-300 font-medium">{blog.niche}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                <span>{blog.is_custom_domain ? "Custom Domain" : "BlogSpot Subdomain"}</span>
                <span className="font-mono">{blog.gsc_property ? "GSC Connected" : "No GSC"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Blog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBlog}
            className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-bold text-stone-100">Add Managed Blog</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-stone-400 hover:text-stone-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">Blog Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SEO Master Blog"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Blog Canonical URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://myblog.blogspot.com"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Blogger Blog ID (Optional)</label>
                <input
                  type="text"
                  value={bloggerBlogId}
                  onChange={(e) => setBloggerBlogId(e.target.value)}
                  placeholder="e.g. 847291948291048"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">GSC Property URL / Domain (Optional)</label>
                <input
                  type="text"
                  value={gscProperty}
                  onChange={(e) => setGscProperty(e.target.value)}
                  placeholder="sc-domain:myblog.com or https://myblog.blogspot.com/"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Niche / Category</label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. Technology, Recipes, Finance"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="customDomain"
                  checked={isCustomDomain}
                  onChange={(e) => setIsCustomDomain(e.target.checked)}
                  className="rounded bg-stone-950 border-stone-700 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="customDomain" className="text-xs text-stone-300 cursor-pointer">
                  Uses custom apex/sub domain (not blogspot.com)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
              >
                {isSubmitting ? "Saving..." : "Save Blog"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

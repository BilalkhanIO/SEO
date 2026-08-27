import React, { useState, useEffect } from "react";
import { Blog, Prospect } from "../types.js";
import {
  Send,
  Plus,
  Clock,
  CheckCircle2,
  ExternalLink,
  Mail,
  Filter,
  Link,
  ShieldCheck,
  Calendar,
} from "lucide-react";

const STAGES = [
  "found",
  "qualified",
  "contacted",
  "followup_1",
  "followup_2",
  "followup_3",
  "replied",
  "agreed",
  "published",
  "link_live",
  "rejected",
  "no_response",
] as const;

interface OutreachCrmProps {
  currentBlog: Blog | null;
}

export const OutreachCrm: React.FC<OutreachCrmProps> = ({ currentBlog }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [dueProspects, setDueProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);

  // New Prospect Form State
  const [siteUrl, setSiteUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [niche, setNiche] = useState("");
  const [opportunity, setOpportunity] = useState("guest_post");
  const [authority, setAuthority] = useState("35");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProspects();
    fetchDueProspects();
  }, [currentBlog, selectedStage]);

  const fetchProspects = async () => {
    setLoading(true);
    try {
      const blogParam = currentBlog ? `blogId=${currentBlog.id}&` : "";
      const stageParam = selectedStage !== "all" ? `status=${selectedStage}` : "";
      const res = await fetch(`/api/outreach?${blogParam}${stageParam}`);
      if (res.ok) {
        setProspects(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDueProspects = async () => {
    try {
      const blogParam = currentBlog ? `?blogId=${currentBlog.id}` : "";
      const res = await fetch(`/api/outreach/due${blogParam}`);
      if (res.ok) {
        setDueProspects(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBlog) {
      alert("Select a blog first.");
      return;
    }
    if (!siteUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogId: currentBlog.id,
          siteUrl: siteUrl.trim(),
          siteName: siteName.trim() || null,
          niche: niche.trim() || null,
          opportunity,
          authority: parseInt(authority) || null,
          contactName: contactName.trim() || null,
          contactEmail: contactEmail.trim() || null,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSiteUrl("");
        setSiteName("");
        setContactName("");
        setContactEmail("");
        fetchProspects();
        fetchDueProspects();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to create prospect");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogContact = async (prospectId: number, status: string) => {
    try {
      const res = await fetch("/api/outreach/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId,
          status,
          contactedAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        fetchProspects();
        fetchDueProspects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLinkLive = async (prospectId: number, publishedUrl: string, linkRel: string) => {
    try {
      const res = await fetch(`/api/outreach/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "link_live",
          publishedUrl,
          linkRel,
        }),
      });

      if (res.ok) {
        setEditingProspect(null);
        fetchProspects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-400" />
            Blogger Outreach & Backlink CRM
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            13-Stage Pipeline · Automated 3-day & 7-day follow-up scheduler · Verified link_rel & dofollow tracker
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Outreach Prospect
        </button>
      </div>

      {/* Due Today Banner */}
      {dueProspects.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-700/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-indigo-200">
                {dueProspects.length} Outreach Actions / Follow-ups Due Today!
              </h4>
              <p className="text-xs text-indigo-300/80">
                Scheduled based on the standard 3-day (Follow-up #1) and 7-day (Follow-up #2) playbook cadences.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            Action Needed
          </span>
        </div>
      )}

      {/* Stage Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedStage("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedStage === "all"
              ? "bg-amber-500 text-stone-950 font-bold"
              : "bg-stone-850 text-stone-300 hover:bg-stone-800 border border-stone-800"
          }`}
        >
          All ({prospects.length})
        </button>
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedStage(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition-all ${
              selectedStage === s
                ? "bg-amber-500 text-stone-950 font-bold"
                : "bg-stone-850 text-stone-400 hover:bg-stone-800 border border-stone-800"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Prospects Table */}
      <div className="bg-stone-850 border border-stone-700/60 rounded-2xl p-6 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-stone-400 text-sm">Loading prospects...</div>
        ) : prospects.length === 0 ? (
          <div className="py-12 text-center bg-stone-900/50 rounded-xl border border-dashed border-stone-800 text-stone-400 text-xs">
            No prospects found in this stage. Click "Add Outreach Prospect" to start your link-building pipeline.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Target Site</th>
                  <th className="pb-3 font-semibold">Opportunity</th>
                  <th className="pb-3 font-semibold">Authority</th>
                  <th className="pb-3 font-semibold">Contact</th>
                  <th className="pb-3 font-semibold">Stage</th>
                  <th className="pb-3 font-semibold">Next Action</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="py-3 font-medium text-stone-200 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span>{p.site_name || p.site_url}</span>
                        <a
                          href={p.site_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-stone-500 hover:text-amber-400"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3 capitalize text-stone-300">
                      {p.opportunity.replace("_", " ")}
                    </td>
                    <td className="py-3 font-mono text-stone-300">
                      {p.authority ? `DA ${p.authority}` : "—"}
                    </td>
                    <td className="py-3 text-stone-300">
                      {p.contact_email ? (
                        <span className="font-mono text-[11px] text-sky-300">{p.contact_email}</span>
                      ) : (
                        <span className="text-stone-500">No email</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.status === "link_live"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : p.status.startsWith("followup")
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-stone-800 text-stone-300 border border-stone-700"
                      }`}>
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-stone-400 font-mono text-[11px]">
                      {p.next_action_at ? p.next_action_at.slice(0, 10) : "—"}
                    </td>
                    <td className="py-3 text-right space-x-1.5">
                      {p.status === "found" || p.status === "qualified" ? (
                        <button
                          onClick={() => handleLogContact(p.id, "contacted")}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 font-semibold text-[11px]"
                        >
                          Log Outreach
                        </button>
                      ) : p.status === "contacted" ? (
                        <button
                          onClick={() => handleLogContact(p.id, "followup_1")}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold text-[11px]"
                        >
                          Log Follow-up 1
                        </button>
                      ) : p.status === "followup_1" ? (
                        <button
                          onClick={() => handleLogContact(p.id, "followup_2")}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold text-[11px]"
                        >
                          Log Follow-up 2
                        </button>
                      ) : p.status === "agreed" || p.status === "published" ? (
                        <button
                          onClick={() => setEditingProspect(p)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px]"
                        >
                          Confirm Live Link
                        </button>
                      ) : null}

                      <button
                        onClick={() => handleLogContact(p.id, "replied")}
                        className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px]"
                      >
                        Replied
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Prospect Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddProspect}
            className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-bold text-stone-100">Add Outreach Prospect</h3>
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
                <label className="block text-stone-300 font-semibold mb-1">Target Website URL</label>
                <input
                  type="url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://authoritativesite.com"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Site / Blog Name</label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Tech Weekly"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Opportunity Type</label>
                  <select
                    value={opportunity}
                    onChange={(e) => setOpportunity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200"
                  >
                    <option value="guest_post">Guest Post</option>
                    <option value="broken_link">Broken Link</option>
                    <option value="resource_page">Resource Page</option>
                    <option value="unlinked_mention">Unlinked Mention</option>
                    <option value="expert_roundup">Expert Roundup</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Editor John"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="editor@site.com"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                  />
                </div>
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
                {isSubmitting ? "Adding..." : "Add to CRM"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Live Link Modal */}
      {editingProspect && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-stone-100">Confirm Live Backlink</h3>
            <p className="text-xs text-stone-400">
              Record the published live URL and link attribute tag on {editingProspect.site_name || editingProspect.site_url}.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const pubUrl = (form.elements.namedItem("pubUrl") as HTMLInputElement).value;
                const linkRel = (form.elements.namedItem("linkRel") as HTMLSelectElement).value;
                handleUpdateLinkLive(editingProspect.id, pubUrl, linkRel);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-stone-300 font-semibold mb-1">Live Published URL</label>
                <input
                  name="pubUrl"
                  type="url"
                  defaultValue={editingProspect.published_url || ""}
                  placeholder="https://site.com/guest-post-live.html"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Link Rel Attribute</label>
                <select
                  name="linkRel"
                  defaultValue={editingProspect.link_rel || "dofollow"}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-200"
                >
                  <option value="dofollow">dofollow (Standard equity passing)</option>
                  <option value="nofollow">nofollow</option>
                  <option value="ugc">ugc (User generated)</option>
                  <option value="sponsored">sponsored</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingProspect(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs"
                >
                  Save Live Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

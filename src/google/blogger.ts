import { google, blogger_v3 } from "googleapis";
import { getOAuthClient } from "./auth.js";

function api(): blogger_v3.Blogger {
  return google.blogger({ version: "v3", auth: getOAuthClient() as any });
}

export async function listBlogs() {
  const res = await api().blogs.listByUser({ userId: "self" });
  return (res.data.items || []).map((b) => ({
    bloggerBlogId: b.id || "",
    name: b.name || "",
    url: b.url || "",
    posts: b.posts?.totalItems ?? 0,
  }));
}

export async function listPosts(blogId: string, maxResults = 50, status?: "LIVE" | "DRAFT" | "SCHEDULED") {
  const params: blogger_v3.Params$Resource$Posts$List = { blogId, maxResults, fetchBodies: false };
  if (status) params.status = [status];
  const res = await api().posts.list(params);
  return (res.data.items || []).map((p) => ({
    bloggerPostId: p.id || "",
    title: p.title || "",
    url: p.url || "",
    published: p.published || "",
    updated: p.updated || "",
    labels: p.labels || [],
  }));
}

export async function getPost(blogId: string, postId: string) {
  const res = await api().posts.get({ blogId, postId });
  return res.data;
}

/**
 * Inserts a post as DRAFT by default. Note: the Blogger API cannot set a custom
 * permalink — set it in the Blogger editor BEFORE publishing (playbook stage 5),
 * then publish from the editor or via publishPost().
 */
export async function insertPost(opts: {
  blogId: string;
  title: string;
  contentHtml: string;
  labels?: string[];
  isDraft?: boolean;
}) {
  const res = await api().posts.insert({
    blogId: opts.blogId,
    isDraft: opts.isDraft ?? true,
    requestBody: {
      title: opts.title,
      content: opts.contentHtml,
      labels: opts.labels,
    },
  });
  return res.data;
}

export async function updatePost(blogId: string, postId: string, patch: { title?: string; content?: string; labels?: string[] }) {
  const res = await api().posts.patch({ blogId, postId, requestBody: patch });
  return res.data;
}

export async function publishPost(blogId: string, postId: string, publishDate?: string) {
  const res = await api().posts.publish({ blogId, postId, ...(publishDate ? { publishDate } : {}) });
  return res.data;
}

/** No-auth content inventory via the public JSON feed (works for any Blogger blog). */
export async function feedInventory(blogUrl: string, max = 500) {
  const base = blogUrl.replace(/\/$/, "");
  const out: { title: string; url: string; published: string; updated: string; labels: string[] }[] = [];
  let start = 1;
  while (out.length < max) {
    const batch = Math.min(150, max - out.length);
    const url = `${base}/feeds/posts/default?alt=json&max-results=${batch}&start-index=${start}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = (await res.json()) as any;
    const entries = data?.feed?.entry || [];
    if (entries.length === 0) break;
    for (const e of entries) {
      const link = (e.link || []).find((l: any) => l.rel === "alternate")?.href || "";
      out.push({
        title: e.title?.$t || "",
        url: link,
        published: e.published?.$t || "",
        updated: e.updated?.$t || "",
        labels: (e.category || []).map((c: any) => c.term),
      });
    }
    start += entries.length;
    if (entries.length < batch) break;
  }
  return out;
}

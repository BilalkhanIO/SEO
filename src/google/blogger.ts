import { google, blogger_v3 } from "googleapis";
import { getOAuthClient } from "./auth.js";

function api(): blogger_v3.Blogger {
  return google.blogger({ version: "v3", auth: getOAuthClient() as any });
}

export interface PostAuditResult {
  wordCount: number;
  headingsCount: number;
  h2Count: number;
  h3Count: number;
  imagesCount: number;
  missingAltCount: number;
  hasFaqSection: boolean;
  hasSchemaMarkup: boolean;
  internalLinksCount: number;
  readabilityScore: number; // 0 - 100
  seoScore: number; // 0 - 100
  issues: string[];
  autoFixAvailable: boolean;
}

export async function listBlogs() {
  const res = await api().blogs.listByUser({ userId: "self" });
  return (res.data.items || []).map((b) => ({
    bloggerBlogId: b.id || "",
    name: b.name || "",
    url: b.url || "",
    posts: b.posts?.totalItems ?? 0,
    pages: b.pages?.totalItems ?? 0,
  }));
}

export async function listPosts(blogId: string, maxResults = 50, status?: "LIVE" | "DRAFT" | "SCHEDULED") {
  const params: blogger_v3.Params$Resource$Posts$List = { blogId, maxResults, fetchBodies: true };
  if (status) params.status = [status];
  const res = await api().posts.list(params);
  return (res.data.items || []).map((p) => {
    const content = p.content || "";
    const audit = auditPostContent(content, p.title || "");
    return {
      bloggerPostId: p.id || "",
      title: p.title || "",
      url: p.url || "",
      published: p.published || "",
      updated: p.updated || "",
      labels: p.labels || [],
      content,
      audit,
    };
  });
}

export async function getPost(blogId: string, postId: string) {
  const res = await api().posts.get({ blogId, postId });
  return res.data;
}

/**
 * Inserts a post into Blogger
 */
export async function insertPost(opts: {
  blogId: string;
  title: string;
  contentHtml: string;
  labels?: string[];
  /**
   * Best-effort only: Blogger's API does not document `customMetaData` as the
   * post's search-snippet meta description, and Google's own support forum
   * reports it frequently fails to persist as one. Don't rely on this to set
   * the search description — embed it in the post's JSON-LD `description`
   * instead (see ai/gemini.ts), which is the mechanism search engines read.
   */
  customMetaData?: string;
  isDraft?: boolean;
}) {
  const res = await api().posts.insert({
    blogId: opts.blogId,
    isDraft: opts.isDraft ?? true,
    requestBody: {
      title: opts.title,
      content: opts.contentHtml,
      labels: opts.labels,
      customMetaData: opts.customMetaData,
    },
  });
  return res.data;
}

export async function updatePost(
  blogId: string,
  postId: string,
  patch: { title?: string; content?: string; labels?: string[]; customMetaData?: string }
) {
  const res = await api().posts.patch({ blogId, postId, requestBody: patch });
  return res.data;
}

export async function publishPost(blogId: string, postId: string, publishDate?: string) {
  const res = await api().posts.publish({ blogId, postId, ...(publishDate ? { publishDate } : {}) });
  return res.data;
}

/**
 * List standalone Pages (Privacy, About, Contact, etc.)
 */
export async function listPages(blogId: string) {
  try {
    const res = await api().pages.list({ blogId, fetchBodies: true });
    return (res.data.items || []).map((p) => ({
      pageId: p.id || "",
      title: p.title || "",
      url: p.url || "",
      published: p.published || "",
      updated: p.updated || "",
      status: p.status || "LIVE",
    }));
  } catch (err: any) {
    console.warn("Notice: Pages list warning:", err.message);
    return [];
  }
}

/**
 * Insert a standalone legal or navigation Page (e.g. Privacy Policy, Terms, About Us)
 */
export async function insertPage(opts: {
  blogId: string;
  title: string;
  contentHtml: string;
  isDraft?: boolean;
}) {
  const res = await api().pages.insert({
    blogId: opts.blogId,
    isDraft: opts.isDraft ?? false,
    requestBody: {
      title: opts.title,
      content: opts.contentHtml,
    },
  });
  return res.data;
}

/**
 * Update an existing standalone Page
 */
export async function updatePage(
  blogId: string,
  pageId: string,
  patch: { title?: string; content?: string }
) {
  const res = await api().pages.patch({ blogId, pageId, requestBody: patch });
  return res.data;
}

/**
 * Deep SEO & Content Quality Audit for a single blog post HTML
 */
export function auditPostContent(contentHtml: string, title: string): PostAuditResult {
  const issues: string[] = [];

  // Plain text conversion for word count
  const cleanText = contentHtml
    .replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, "")
    .replace(/<style[^>]*>([\S\s]*?)<\/style>/gim, "")
    .replace(/<[^>]+>/gm, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleanText ? cleanText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  // Headings analysis
  const h2Matches = contentHtml.match(/<h2[^>]*>/gi) || [];
  const h3Matches = contentHtml.match(/<h3[^>]*>/gi) || [];
  const h2Count = h2Matches.length;
  const h3Count = h3Matches.length;
  const headingsCount = h2Count + h3Count;

  // Image analysis
  const imgMatches = contentHtml.match(/<img[^>]*>/gi) || [];
  const imagesCount = imgMatches.length;
  let missingAltCount = 0;
  for (const img of imgMatches) {
    if (!img.includes('alt="') || img.includes('alt=""')) {
      missingAltCount++;
    }
  }

  // Schema & FAQ detection
  const hasFaqSection =
    contentHtml.toLowerCase().includes("faq") ||
    contentHtml.toLowerCase().includes("frequently asked questions") ||
    contentHtml.toLowerCase().includes("seo-updated-faq");
  const hasSchemaMarkup =
    contentHtml.includes("application/ld+json") ||
    contentHtml.includes("schema.org/FAQPage") ||
    contentHtml.includes("schema.org/BlogPosting");

  // Link counting
  const linkMatches = contentHtml.match(/<a[^>]+href=/gi) || [];
  const internalLinksCount = linkMatches.length;

  // Issues detection
  if (wordCount < 600) {
    issues.push(`Thin Content: Only ${wordCount} words. Google algorithms and AdSense require 800+ words for ranking stability.`);
  } else if (wordCount < 1000) {
    issues.push(`Moderate Depth: ${wordCount} words. Consider expanding with 1-2 practical examples or an FAQ section.`);
  }

  if (h2Count === 0) {
    issues.push("Missing <h2> Subheadings: Search engines cannot parse content hierarchy.");
  }

  if (missingAltCount > 0) {
    issues.push(`${missingAltCount} images lack descriptive SEO 'alt' tags.`);
  }

  if (!hasFaqSection) {
    issues.push("Missing FAQ section: High opportunity to capture Google People Also Ask (PAA) rich snippets.");
  }

  if (!hasSchemaMarkup) {
    issues.push("Missing structured Schema.org JSON-LD markup.");
  }

  // Calculate scores
  let seoScore = 100;
  if (wordCount < 400) seoScore -= 35;
  else if (wordCount < 800) seoScore -= 20;
  else if (wordCount < 1200) seoScore -= 10;

  if (h2Count === 0) seoScore -= 20;
  else if (h2Count < 2) seoScore -= 10;

  if (missingAltCount > 0) seoScore -= Math.min(15, missingAltCount * 5);
  if (!hasFaqSection) seoScore -= 15;
  if (!hasSchemaMarkup) seoScore -= 10;
  if (internalLinksCount === 0) seoScore -= 10;

  seoScore = Math.max(15, Math.min(100, seoScore));

  const readabilityScore = Math.min(
    100,
    Math.max(40, 85 - (wordCount > 2000 ? 5 : 0) + (h2Count >= 3 ? 15 : 0))
  );

  return {
    wordCount,
    headingsCount,
    h2Count,
    h3Count,
    imagesCount,
    missingAltCount,
    hasFaqSection,
    hasSchemaMarkup,
    internalLinksCount,
    readabilityScore,
    seoScore,
    issues,
    autoFixAvailable: issues.length > 0,
  };
}

/** No-auth content inventory via public JSON feed */
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

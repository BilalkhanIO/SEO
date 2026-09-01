import { GoogleGenAI } from "@google/genai";
import { loadConfig } from "../config.js";
import { run, all } from "../store.js";
import * as blogger from "../google/blogger.js";
import * as gsc from "../google/gsc.js";
import * as adsense from "../google/adsense.js";
import * as analytics from "../google/analytics.js";
import {
  generateAutoBlogPost,
  fixAndEnrichBlogPost,
  generatePolicyPage,
} from "../ai/gemini.js";
import { fetchSerp } from "../serp/serp.js";

function getAi() {
  const cfg = loadConfig();
  if (!cfg.geminiApiKey) throw new Error("Gemini API key is required");
  return new GoogleGenAI({ apiKey: cfg.geminiApiKey });
}

export interface AutoPilotLog {
  timestamp: string;
  stage: "INIT" | "ADSENSE" | "CONTENT" | "GSC" | "INDEXING" | "PUBLISH" | "COMPLETE";
  type: "info" | "success" | "warn" | "error";
  message: string;
}

export interface AutoPilot360Result {
  success: boolean;
  blogName: string;
  blogUrl: string;
  logs: AutoPilotLog[];
  metrics: {
    pagesCreated: number;
    postsAudited: number;
    postsEnriched: number;
    sitemapsSubmitted: number;
    urlsIndexed: number;
    newPostPublished?: string;
    adsenseReadinessScore: number;
  };
}

/**
 * Run the Complete 360° Google & Blog Auto-Pilot
 * Synchronizes, audits, and automatically fixes Blogger, AdSense, GSC, and Analytics.
 */
export async function run360AutoPilot(
  blogId: number,
  options: {
    autoFixThinContent?: boolean;
    autoPublishPolicyPages?: boolean;
    autoSubmitSitemaps?: boolean;
    autoIndexUrls?: boolean;
    publishNewArticle?: boolean;
  } = {}
): Promise<AutoPilot360Result> {
  const logs: AutoPilotLog[] = [];
  const pushLog = (
    stage: AutoPilotLog["stage"],
    message: string,
    type: AutoPilotLog["type"] = "info"
  ) => {
    const entry: AutoPilotLog = {
      timestamp: new Date().toLocaleTimeString(),
      stage,
      type,
      message,
    };
    console.log(`[AutoPilot-${stage}] ${message}`);
    logs.push(entry);
  };

  const metrics: AutoPilot360Result["metrics"] = {
    pagesCreated: 0,
    postsAudited: 0,
    postsEnriched: 0,
    sitemapsSubmitted: 0,
    urlsIndexed: 0,
    adsenseReadinessScore: 0,
  };

  // 1. Initialize Blog Data
  pushLog("INIT", "Starting Complete 360° Google & Blog Auto-Pilot Cycle...", "info");
  const [blog] = await all<any>("SELECT * FROM blogs WHERE id = ?", [blogId]);

  if (!blog || !blog.blogger_blog_id) {
    pushLog("INIT", "Error: Blog not found or lacks a linked Blogger ID", "error");
    return {
      success: false,
      blogName: blog?.name || "Unknown",
      blogUrl: blog?.url || "",
      logs,
      metrics,
    };
  }

  const blogName = blog.name;
  const blogUrl = blog.url;
  const niche = blog.niche || "Technology & Digital Solutions";
  pushLog("INIT", `Connected to: "${blogName}" (${blogUrl}) - Niche: ${niche}`, "success");

  try {
    // 2. AdSense Audit & Auto-Fix Mandatory Pages
    pushLog("ADSENSE", "Step 1: Inspecting AdSense Policy Compliance & Mandatory Legal Pages...", "info");
    const existingPages = await blogger.listPages(blog.blogger_blog_id);
    pushLog("ADSENSE", `Found ${existingPages.length} existing standalone pages on Blogger.`, "info");

    const pageTitles = existingPages.map((p) => (p.title || "").toLowerCase());
    const requiredPages: { type: "privacy" | "terms" | "about" | "contact" | "disclaimer"; title: string }[] = [
      { type: "privacy", title: "Privacy Policy" },
      { type: "terms", title: "Terms of Service" },
      { type: "about", title: "About Us" },
      { type: "contact", title: "Contact Us" },
      { type: "disclaimer", title: "Disclaimer" },
    ];

    if (options.autoPublishPolicyPages !== false) {
      for (const req of requiredPages) {
        const isMissing = !pageTitles.some((t) => t.includes(req.type) || t.includes(req.title.toLowerCase()));
        if (isMissing) {
          pushLog("ADSENSE", `Missing ${req.title}. Generating AdSense-compliant legal HTML with Gemini...`, "warn");
          try {
            const pageData = await generatePolicyPage(req.type, blogName, blogUrl);
            await blogger.insertPage({
              blogId: blog.blogger_blog_id,
              title: pageData.title,
              contentHtml: pageData.htmlContent,
              isDraft: false,
            });
            metrics.pagesCreated++;
            pushLog("ADSENSE", `Successfully published "${pageData.title}" directly to Blogger!`, "success");
          } catch (err: any) {
            pushLog("ADSENSE", `Failed to publish ${req.title}: ${err.message}`, "error");
          }
        } else {
          pushLog("ADSENSE", `Pass: "${req.title}" is already present and active.`, "info");
        }
      }
    }

    // 3. Blogger Content Audit & Thin Content Auto-Fixer
    pushLog("CONTENT", "Step 2: Performing Deep Content Quality Audit across recent posts...", "info");
    const posts = await blogger.listPosts(blog.blogger_blog_id, 25, "LIVE");
    metrics.postsAudited = posts.length;
    pushLog("CONTENT", `Auditing ${posts.length} published posts for word count, headings, image ALT tags, and FAQs.`, "info");

    if (options.autoFixThinContent !== false) {
      for (const p of posts) {
        const audit = p.audit;
        if (audit && (audit.wordCount < 800 || audit.h2Count === 0 || !audit.hasFaqSection)) {
          pushLog(
            "CONTENT",
            `Identified content gap in "${p.title}" (Words: ${audit.wordCount}, Headings: ${audit.headingsCount}). Auto-enriching with Gemini 3.1 Pro...`,
            "warn"
          );

          try {
            const postDetail = await blogger.getPost(blog.blogger_blog_id, p.bloggerPostId);
            if (postDetail.content) {
              const enriched = await fixAndEnrichBlogPost(postDetail.content, p.title);
              await blogger.updatePost(blog.blogger_blog_id, p.bloggerPostId, {
                title: enriched.improvedTitle || p.title,
                content: enriched.improvedHtml,
              });

              metrics.postsEnriched++;
              pushLog(
                "CONTENT",
                `Successfully updated & enriched "${p.title}" on Blogger! Changelog: ${enriched.changelog.join(", ")}`,
                "success"
              );

              // Auto-index refreshed post
              if (p.url && options.autoIndexUrls !== false) {
                try {
                  await gsc.requestGoogleIndexing(p.url, "URL_UPDATED");
                  metrics.urlsIndexed++;
                  pushLog("INDEXING", `Notified Google Indexing API for updated URL: ${p.url}`, "success");
                } catch (idxErr: any) {
                  pushLog("INDEXING", `Indexing notice for ${p.url}: ${idxErr.message}`, "warn");
                }
              }

              // Limit auto-enrichment to max 2 posts per cycle to respect rate limits
              if (metrics.postsEnriched >= 2) break;
            }
          } catch (fixErr: any) {
            pushLog("CONTENT", `Could not auto-enrich "${p.title}": ${fixErr.message}`, "error");
          }
        }
      }
    }

    // 4. Google Search Console & Sitemaps Automation
    if (options.autoSubmitSitemaps !== false) {
      pushLog("GSC", "Step 3: Submitting latest XML & Atom Sitemaps to Google Search Console...", "info");
      const cleanSiteUrl = blogUrl.endsWith("/") ? blogUrl : `${blogUrl}/`;
      try {
        const submitted = await gsc.submitDefaultSitemaps(cleanSiteUrl);
        metrics.sitemapsSubmitted = submitted.length;
        pushLog("GSC", `Submitted ${submitted.length} sitemaps: ${submitted.join(", ")}`, "success");
      } catch (smErr: any) {
        pushLog("GSC", `Sitemap submission notice: ${smErr.message}`, "warn");
      }

      // Check striking distance keywords
      try {
        const striking = await gsc.getStrikingDistanceKeywords(cleanSiteUrl);
        if (striking.length > 0) {
          pushLog(
            "GSC",
            `Discovered ${striking.length} Striking-Distance Keywords (Page 1 threshold). Top target: "${striking[0].query}" (Pos ${striking[0].position}, ${striking[0].impressions} impressions)`,
            "info"
          );
        }
      } catch {
        // Continue
      }
    }

    // 5. Automated Fresh Post Discovery & Publishing
    if (options.publishNewArticle !== false) {
      pushLog("PUBLISH", "Step 4: Researching high-demand long-tail keyword for fresh publishing...", "info");
      const ai = getAi();
      const topicPrompt = `Generate exactly ONE highly specific, low-competition, high-search-intent long-tail keyword for a website in the "${niche}" niche.
Return ONLY the raw keyword string, no quotes, no formatting.`;

      const kwRes = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: topicPrompt,
      });

      let targetKeyword = (kwRes.text || "").trim().replace(/['"]/g, "");
      if (!targetKeyword) targetKeyword = `Best ${niche} Strategies for 2026`;

      pushLog("PUBLISH", `Target Keyword selected: "${targetKeyword}"`, "info");

      // Optional SERP research
      try {
        const serp = await fetchSerp(targetKeyword);
        pushLog("PUBLISH", `Pulled live SERP data with ${serp.results.length} competitor articles.`, "info");
      } catch {
        pushLog("PUBLISH", "SERP live data skipped. Proceeding with Gemini 3.1 Pro content synthesis.", "info");
      }

      pushLog("PUBLISH", `Writing 1,500+ word comprehensive article with FAQ Schema and Comparison Table...`, "info");
      const newPostContent = await generateAutoBlogPost(targetKeyword, niche);

      pushLog("PUBLISH", `Generated Title: "${newPostContent.title}". Publishing LIVE to Blogger...`, "info");
      const published = await blogger.insertPost({
        blogId: blog.blogger_blog_id,
        title: newPostContent.title,
        contentHtml: newPostContent.htmlContent,
        labels: newPostContent.tags || [niche],
        isDraft: false,
      });

      const publishedUrl = published.url || "";
      metrics.newPostPublished = publishedUrl;
      pushLog("PUBLISH", `Published LIVE successfully! URL: ${publishedUrl}`, "success");

      // Save to database
      await run(
        `INSERT INTO posts (blog_id, title, url, blogger_post_id, stage, brief_md) VALUES (?, ?, ?, ?, ?, ?)`,
        [blogId, newPostContent.title, publishedUrl, published.id || "", "published", `Auto-published for keyword: ${targetKeyword}`]
      );

      // Instant Indexing
      if (publishedUrl && options.autoIndexUrls !== false) {
        try {
          await gsc.requestGoogleIndexing(publishedUrl, "URL_UPDATED");
          metrics.urlsIndexed++;
          pushLog("INDEXING", `Notified Google Indexing API for new article: ${publishedUrl}`, "success");
        } catch (idxErr: any) {
          pushLog("INDEXING", `Indexing notice for new post: ${idxErr.message}`, "warn");
        }
      }
    }

    // 6. Calculate Final AdSense Readiness
    const updatedPages = await blogger.listPages(blog.blogger_blog_id);
    const updatedPosts = await blogger.listPosts(blog.blogger_blog_id, 30, "LIVE");
    const adsenseAudit = adsense.auditAdSenseReadiness({
      blogUrl,
      postCount: updatedPosts.length,
      pages: updatedPages,
      posts: updatedPosts.map((p) => ({ title: p.title, wordCount: p.audit?.wordCount })),
      hasCustomDomain: blog.is_custom_domain === 1,
    });

    metrics.adsenseReadinessScore = adsenseAudit.readinessScore;
    pushLog(
      "COMPLETE",
      `Auto-Pilot cycle completed successfully! AdSense Readiness Score: ${adsenseAudit.readinessScore}% (Grade: ${adsenseAudit.grade})`,
      "success"
    );

    return {
      success: true,
      blogName,
      blogUrl,
      logs,
      metrics,
    };
  } catch (cycleErr: any) {
    pushLog("COMPLETE", `Auto-Pilot encountered an error: ${cycleErr.message}`, "error");
    return {
      success: false,
      blogName,
      blogUrl,
      logs,
      metrics,
    };
  }
}

export const runAutomationCycle = run360AutoPilot;

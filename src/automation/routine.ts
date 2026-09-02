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
  safeGenerateContent,
} from "../ai/gemini.js";
import { fetchSerp, enrichSerp, competitorContext } from "../serp/serp.js";
import { validatePost, blockingIssues, formatIssues } from "../content/validate.js";

/**
 * Best-effort competitor research for a keyword: fetch + enrich the live SERP so
 * generation can be told what page-1 actually covers (playbook §5). Degrades to
 * undefined (falls back to the fixed default target) on any failure — SERPER_API_KEY
 * may not be configured, or the request may simply fail; this must never block a cycle.
 */
async function researchCompetitors(
  keyword: string,
  pushLog: (stage: AutoPilotLog["stage"], message: string, type?: AutoPilotLog["type"]) => void,
  stage: AutoPilotLog["stage"]
) {
  try {
    const analysis = await enrichSerp(await fetchSerp(keyword), 5);
    pushLog(stage, `Pulled live SERP data with ${analysis.results.length} competitor articles for "${keyword}".`, "info");
    return competitorContext(analysis);
  } catch (err: any) {
    pushLog(stage, `SERP research skipped for "${keyword}": ${err.message}. Using default targets.`, "info");
    return undefined;
  }
}

/** Below this, Blogger/AdSense treat a post as thin content (matches the audit's own "800+ words" guidance). */
export const MIN_WORD_COUNT = 800;
const MAX_GENERATION_ATTEMPTS = 3;

/**
 * Gemini's requested word count ("1,500+ words") isn't enforced by the model — weaker
 * fallback models in particular can return much shorter drafts. Regenerate up to
 * MAX_GENERATION_ATTEMPTS times and keep the longest result, so a thin draft never
 * gets published just because the first attempt came back short.
 */
export async function generateWithMinWordCount<T>(
  generate: () => Promise<T>,
  getHtml: (result: T) => string,
  pushLog: (message: string, type?: AutoPilotLog["type"]) => void,
  label: string
): Promise<{ result: T; wordCount: number }> {
  let best: { result: T; wordCount: number } | null = null;
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generate();
    const wordCount = blogger.auditPostContent(getHtml(result) || "", "").wordCount;
    if (!best || wordCount > best.wordCount) best = { result, wordCount };
    if (wordCount >= MIN_WORD_COUNT) return best;
    pushLog(
      `${label}: attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} produced only ${wordCount} words (need ${MIN_WORD_COUNT}+). Retrying...`,
      "warn"
    );
  }
  return best!;
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
    postsIndexChecked: number;
    postsAlreadyIndexed: number;
    newPostPublished?: string;
    adsenseReadinessScore: number;
  };
}

export interface IndexCheckResult {
  url: string;
  title: string;
  verdict: string;
  coverageState: string;
  action: "already_indexed" | "requested_indexing" | "check_failed";
}

/**
 * Loop over a blog's live posts, check each one's actual GSC index status (not just
 * "did we just publish/edit it"), and request indexing only for the ones genuinely
 * not indexed (playbook §7). Degrades per-post on failure rather than aborting the sweep.
 */
export async function checkAndFixIndexing(
  blogId: number,
  pushLog: (stage: AutoPilotLog["stage"], message: string, type?: AutoPilotLog["type"]) => void = () => {}
): Promise<{ checked: number; alreadyIndexed: number; requested: number; failed: number; results: IndexCheckResult[] }> {
  const [blog] = await all<any>("SELECT * FROM blogs WHERE id = ?", [blogId]);
  if (!blog || !blog.blogger_blog_id) throw new Error("Blog not found or lacks a linked Blogger ID");
  if (!blog.gsc_property) throw new Error("Blog has no GSC property configured — index status can't be checked without it");

  const posts = await blogger.listPosts(blog.blogger_blog_id, 30, "LIVE");
  const results: IndexCheckResult[] = [];
  let alreadyIndexed = 0;
  let requested = 0;
  let failed = 0;

  for (const p of posts) {
    if (!p.url) continue;
    try {
      const inspection = await gsc.inspectUrl(blog.gsc_property, p.url);
      if (inspection.verdict === "PASS") {
        alreadyIndexed++;
        results.push({ url: p.url, title: p.title, verdict: inspection.verdict, coverageState: inspection.coverageState, action: "already_indexed" });
      } else {
        pushLog("INDEXING", `"${p.title}" not indexed (${inspection.coverageState || inspection.verdict}) — requesting indexing.`, "warn");
        try {
          await gsc.requestGoogleIndexing(p.url, "URL_UPDATED");
          requested++;
          results.push({ url: p.url, title: p.title, verdict: inspection.verdict, coverageState: inspection.coverageState, action: "requested_indexing" });
        } catch (idxErr: any) {
          failed++;
          results.push({ url: p.url, title: p.title, verdict: inspection.verdict, coverageState: inspection.coverageState, action: "check_failed" });
          pushLog("INDEXING", `Indexing request for "${p.title}" failed: ${idxErr.message}`, "error");
        }
      }
    } catch (inspectErr: any) {
      failed++;
      results.push({ url: p.url, title: p.title, verdict: "UNKNOWN", coverageState: "unknown", action: "check_failed" });
      pushLog("INDEXING", `Could not inspect index status for "${p.title}": ${inspectErr.message}`, "warn");
    }
    await new Promise((s) => setTimeout(s, 250)); // polite delay — URL Inspection has a daily quota
  }

  return { checked: results.length, alreadyIndexed, requested, failed, results };
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
    /** Override the blog's stored niche for this run only (doesn't persist to the DB row). */
    nicheOverride?: string;
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
    postsIndexChecked: 0,
    postsAlreadyIndexed: 0,
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
  const niche = options.nicheOverride || blog.niche || "Technology & Digital Solutions";
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
    
    // Build context of recent posts for internal linking
    const internalLinksContext = posts.map(p => ({ title: p.title || "", url: p.url || "" })).filter(p => p.url);

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
              // Exclude the post being enriched so it can't be told to link to itself
              const linksForThisPost = internalLinksContext.filter((link) => link.url !== p.url);
              const competitorCtx = await researchCompetitors(p.title, pushLog, "CONTENT");
              const { result: enriched, wordCount: enrichedWordCount } = await generateWithMinWordCount(
                () => fixAndEnrichBlogPost(postDetail.content!, p.title, p.title, linksForThisPost, competitorCtx),
                (r) => r.improvedHtml,
                (msg, type) => pushLog("CONTENT", msg, type),
                `Enriching "${p.title}"`
              );

              if (enrichedWordCount < MIN_WORD_COUNT) {
                pushLog(
                  "CONTENT",
                  `Skipped publishing enrichment for "${p.title}": best attempt still only ${enrichedWordCount} words (need ${MIN_WORD_COUNT}+). Will retry next cycle instead of publishing thin content.`,
                  "error"
                );
                continue;
              }

              // SEO pre-publish gate (playbook §4 stage 5) — this is an already-live post,
              // so on a real failure we skip the update entirely rather than push a
              // non-compliant rewrite live; permalink is excluded since it's fixed already.
              const seoIssues = validatePost({
                title: enriched.improvedTitle || p.title,
                html: enriched.improvedHtml,
                searchDescription: enriched.searchDescription,
                keyword: p.title,
                siteUrl: blogUrl,
                permalinkSet: true,
              });
              const blocking = blockingIssues(seoIssues);
              if (blocking.length > 0) {
                pushLog(
                  "CONTENT",
                  `Skipped publishing enrichment for "${p.title}": failed the SEO gate.\n${formatIssues(blocking)}`,
                  "error"
                );
                continue;
              }

              await blogger.updatePost(blog.blogger_blog_id, p.bloggerPostId, {
                title: enriched.improvedTitle || p.title,
                content: enriched.improvedHtml,
                customMetaData: enriched.searchDescription,
              });

              metrics.postsEnriched++;
              pushLog(
                "CONTENT",
                `Successfully updated & enriched "${p.title}" on Blogger (${enrichedWordCount} words; search description embedded in JSON-LD structured data). Changelog: ${enriched.changelog.join(", ")}`,
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

      // Check each live post's actual index status and request indexing only for the
      // ones genuinely not indexed (playbook §7) — not just "we just edited it."
      if (options.autoIndexUrls !== false) {
        if (blog.gsc_property) {
          try {
            const sweep = await checkAndFixIndexing(blogId, pushLog);
            metrics.postsIndexChecked = sweep.checked;
            metrics.postsAlreadyIndexed = sweep.alreadyIndexed;
            metrics.urlsIndexed += sweep.requested;
            pushLog(
              "INDEXING",
              `Index sweep: ${sweep.checked} posts checked, ${sweep.alreadyIndexed} already indexed, ${sweep.requested} indexing requests sent${sweep.failed > 0 ? `, ${sweep.failed} checks failed` : ""}. Note: Google's Indexing API is officially only for Job/Event content — for regular posts, sitemap submission and internal links (already done above) remain the primary indexing signal.`,
              "info"
            );
          } catch (sweepErr: any) {
            pushLog("INDEXING", `Index sweep skipped: ${sweepErr.message}`, "warn");
          }
        } else {
          pushLog("INDEXING", "Index sweep skipped: no GSC property configured for this blog.", "info");
        }
      }
    }

    // 5. Automated Fresh Post Discovery & Publishing
    if (options.publishNewArticle !== false) {
      pushLog("PUBLISH", "Step 4: Researching high-demand long-tail keyword for fresh publishing...", "info");
      
      let topAnalyticsTopics: string[] = [];
      if (blog.ga4_property) {
        pushLog("PUBLISH", `Analyzing Google Analytics top pages to guide topic generation...`, "info");
        try {
          const topPages = await analytics.getGa4TopPages(blog.ga4_property, 10);
          topAnalyticsTopics = topPages.map(p => p.pageTitle).filter(Boolean).slice(0, 5);
          if (topAnalyticsTopics.length > 0) {
            pushLog("PUBLISH", `Found ${topAnalyticsTopics.length} top topics from GA4 for topic context.`, "info");
          }
        } catch (err: any) {
          pushLog("PUBLISH", `Skipping GA4 topic context: ${err.message}`, "info");
        }
      }

      const topicPrompt = `Generate exactly ONE highly specific, low-competition, high-search-intent long-tail keyword for a website in the "${niche}" niche.
${topAnalyticsTopics.length > 0 ? `To align with proven high-traffic content, consider relating the keyword to these current top topics: ${topAnalyticsTopics.join(", ")}.` : ""}
Return ONLY the raw keyword string, no quotes, no formatting.`;

      const kwRes = await safeGenerateContent({
        preferredModel: "gemini-2.5-flash",
        contents: topicPrompt,
      });

      let targetKeyword = (kwRes.text || "").trim().replace(/['"]/g, "");
      if (!targetKeyword) targetKeyword = `Best ${niche} Strategies for 2026`;

      pushLog("PUBLISH", `Target Keyword selected: "${targetKeyword}"`, "info");

      const competitorCtx = await researchCompetitors(targetKeyword, pushLog, "PUBLISH");

      pushLog(
        "PUBLISH",
        `Writing ${competitorCtx?.targetWordCount ?? 1500}+ word comprehensive article with FAQ Schema, Comparison Table, and Internal Links...`,
        "info"
      );
      const { result: newPostContent, wordCount: newPostWordCount } = await generateWithMinWordCount(
        () => generateAutoBlogPost(targetKeyword, niche, internalLinksContext, topAnalyticsTopics, competitorCtx),
        (r) => r.htmlContent,
        (msg, type) => pushLog("PUBLISH", msg, type),
        `New article ("${targetKeyword}")`
      );

      if (newPostWordCount < MIN_WORD_COUNT) {
        pushLog(
          "PUBLISH",
          `Skipped publishing: best attempt for "${targetKeyword}" still only ${newPostWordCount} words (need ${MIN_WORD_COUNT}+). Not publishing thin content — try again next cycle.`,
          "error"
        );
      } else {
        // SEO pre-publish gate (playbook §4 stage 5). Blogger's API has no way to set a
        // custom permalink, so that one rule can never be satisfied by an unattended
        // flow — publish as a DRAFT instead of live when anything else fails, so a human
        // reviews it rather than either blocking forever or shipping non-compliant content.
        const seoIssues = validatePost({
          title: newPostContent.title,
          html: newPostContent.htmlContent,
          searchDescription: newPostContent.searchDescription,
          keyword: targetKeyword,
          siteUrl: blogUrl,
        });
        const blocking = blockingIssues(seoIssues);
        const publishLive = blocking.length === 0;

        if (!publishLive) {
          pushLog("PUBLISH", `SEO gate found issues — publishing as DRAFT for review instead of live.\n${formatIssues(blocking)}`, "warn");
        }

        pushLog(
          "PUBLISH",
          `Generated Title: "${newPostContent.title}" (${newPostWordCount} words). Publishing ${publishLive ? "LIVE" : "as DRAFT"} to Blogger...`,
          "info"
        );
        const published = await blogger.insertPost({
          blogId: blog.blogger_blog_id,
          title: newPostContent.title,
          contentHtml: newPostContent.htmlContent,
          labels: newPostContent.tags || [niche],
          customMetaData: newPostContent.searchDescription,
          isDraft: !publishLive,
        });

        const publishedUrl = published.url || "";
        metrics.newPostPublished = publishedUrl;
        pushLog(
          "PUBLISH",
          publishLive ? `Published LIVE successfully! URL: ${publishedUrl}` : `Saved as DRAFT for manual review (post id ${published.id}).`,
          "success"
        );

        // Save to database
        await run(
          `INSERT INTO posts (blog_id, title, url, blogger_post_id, stage, brief_md) VALUES (?, ?, ?, ?, ?, ?)`,
          [blogId, newPostContent.title, publishedUrl, published.id || "", publishLive ? "published" : "drafted", `Auto-published for keyword: ${targetKeyword}`]
        );

        // Instant Indexing (only meaningful for a live URL)
        if (publishLive && publishedUrl && options.autoIndexUrls !== false) {
          try {
            await gsc.requestGoogleIndexing(publishedUrl, "URL_UPDATED");
            metrics.urlsIndexed++;
            pushLog("INDEXING", `Notified Google Indexing API for new article: ${publishedUrl}`, "success");
          } catch (idxErr: any) {
            pushLog("INDEXING", `Indexing notice for new post: ${idxErr.message}`, "warn");
          }
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

import express from "express";
import path from "path";
import { migrate, all, run } from "./src/store.js";
import { hasCredentials, getOAuthClient, storeTokens, SCOPES } from "./src/google/auth.js";
import * as gsc from "./src/google/gsc.js";
import * as blogger from "./src/google/blogger.js";
import { runPageSpeed } from "./src/google/pagespeed.js";
import { harvest, suggest } from "./src/keywords/autocomplete.js";
import { fetchSerp, enrichSerp, briefFromSerp, extractPage } from "./src/serp/serp.js";
import { validatePost, formatIssues } from "./src/content/validate.js";
import { articleSchema, faqSchema, howToSchema } from "./src/content/schema.js";
import { runRecipes, saveAlerts } from "./src/tracking/recipes.js";
import * as outreach from "./src/outreach/outreach.js";
import { loadConfig } from "./src/config.js";
import * as adsense from "./src/google/adsense.js";
import * as analytics from "./src/google/analytics.js";
import { runAutomationCycle, run360AutoPilot } from "./src/automation/routine.js";
import {
  generateSeoBriefWithGemini,
  generateSeoMetadataWithGemini,
  expandKeywordsWithGemini,
  generateAutoBlogPost,
  fixAndEnrichBlogPost,
  generatePolicyPage,
} from "./src/ai/gemini.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "10mb" }));

  // Auto-run migrations lazily
  let migrated = false;
  app.use(async (req, res, next) => {
    if (!migrated) {
      migrated = true;
      try {
        await migrate();
      } catch (err) {
        console.warn("Database initialization warning:", err);
      }
    }
    next();
  });

  /* ------------------- API ROUTES ------------------- */

  app.post("/api/automation/run", async (req, res) => {
    try {
      const { blogId, niche } = req.body;
      if (!blogId || !niche) return res.status(400).json({ error: "blogId and niche required" });
      const result = await runAutomationCycle(blogId, niche);
      res.json(result);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message, log: ["Fatal error occurred", err.message] });
    }
  });

  
  // Auth Flows
  app.get("/api/auth/url", (req, res) => {
    try {
      const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
      const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
      const redirectUri = `${proto}://${host}/api/auth/google/callback`;
      const client = getOAuthClient(redirectUri);
      const url = client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
      });
      res.json({ url, redirectUri });
    } catch (err: any) {
      console.error("Auth URL generation error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get(["/api/auth/google/callback", "/api/auth/google/callback/"], async (req, res) => {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.status(400).send("No code provided.");
      }
      const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
      const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
      const redirectUri = `${proto}://${host}/api/auth/google/callback`;
      const client = getOAuthClient(redirectUri);
      const { tokens } = await client.getToken(code);
      storeTokens(tokens);

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p style="font-family: sans-serif; padding: 24px; text-align: center;">Authentication successful! You can close this window.</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("OAuth callback error:", err);
      res.status(500).send("Authentication error: " + err.message);
    }
  });

  // System & Auth Status
  app.get("/api/status", async (req, res) => {
    try {
      const cfg = loadConfig();
      const auth = hasCredentials();
      const blogs = await all("SELECT COUNT(*) as count FROM blogs").catch(() => [{ count: 0 }]);
      const keywords = await all("SELECT COUNT(*) as count FROM keywords").catch(() => [{ count: 0 }]);
      const prospects = await all("SELECT COUNT(*) as count FROM prospects").catch(() => [{ count: 0 }]);
      const alerts = await all("SELECT COUNT(*) as count FROM alerts WHERE status = 'open'").catch(() => [{ count: 0 }]);

      res.json({
        authReady: auth,
        hasSerper: !!cfg.serperApiKey,
        hasPageSpeed: !!cfg.pagespeedApiKey,
        hasGemini: !!cfg.geminiApiKey,
        counts: {
          blogs: (blogs[0] as any)?.count || 0,
          keywords: (keywords[0] as any)?.count || 0,
          prospects: (prospects[0] as any)?.count || 0,
          alerts: (alerts[0] as any)?.count || 0,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch status" });
    }
  });

  // Blogs Management
  app.get("/api/blogs", async (req, res) => {
    try {
      const rows = await all("SELECT * FROM blogs ORDER BY id ASC");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/blogs", async (req, res) => {
    try {
      const { name, url, gscProperty, niche } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      const isCustom = url.includes("blogspot.com") ? 0 : 1;
      const id = await run(
        `INSERT INTO blogs (name, url, gsc_property, is_custom_domain, niche)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(url) DO UPDATE SET name = excluded.name, gsc_property = COALESCE(excluded.gsc_property, blogs.gsc_property), niche = COALESCE(excluded.niche, blogs.niche)`,
        [name || url, url, gscProperty || null, isCustom, niche || null]
      );
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/blogs/sync", async (req, res) => {
    try {
      if (!hasCredentials()) {
        return res.status(400).json({ error: "Google OAuth credentials not configured yet. Run OAuth setup or configure refresh token in .env." });
      }
      const mine = await blogger.listBlogs();
      const sites = await gsc.listSites().catch(() => [] as string[]);
      const synced = [];

      for (const b of mine) {
        const host = new URL(b.url).host;
        const gscProp = sites.find((s) => s.includes(host) || (s.startsWith("sc-domain:") && host.endsWith(s.slice(10)))) || null;
        await run(
          `INSERT INTO blogs (name, url, blogger_blog_id, gsc_property, is_custom_domain)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(url) DO UPDATE SET blogger_blog_id = excluded.blogger_blog_id, gsc_property = COALESCE(excluded.gsc_property, blogs.gsc_property)`,
          [b.name, b.url, b.bloggerBlogId, gscProp, host.endsWith("blogspot.com") ? 0 : 1]
        );
        synced.push({ name: b.name, url: b.url, bloggerBlogId: b.bloggerBlogId, gscProperty: gscProp });
      }
      res.json({ success: true, count: synced.length, blogs: synced });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Keywords
  app.get("/api/keywords", async (req, res) => {
    try {
      const blogId = req.query.blogId ? parseInt(req.query.blogId as string) : undefined;
      const status = req.query.status as string | undefined;
      let sql = "SELECT * FROM keywords";
      const args: (number | string)[] = [];
      const clauses: string[] = [];

      if (blogId) {
        clauses.push("blog_id = ?");
        args.push(blogId);
      }
      if (status && status !== "all") {
        clauses.push("status = ?");
        args.push(status);
      }
      if (clauses.length > 0) {
        sql += ` WHERE ${clauses.join(" AND ")}`;
      }
      sql += " ORDER BY score_total DESC NULLS LAST, id DESC LIMIT 200";

      const rows = await all(sql, args);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/keywords/harvest", async (req, res) => {
    try {
      const { seed, blogId, gl = "us", hl = "en", alphabet = true, questions = true, modifiers = true, recursive = false } = req.body;
      if (!seed) return res.status(400).json({ error: "Seed query is required" });

      const found = await harvest(seed, {
        gl,
        hl,
        alphabet: !!alphabet,
        questions: !!questions,
        modifiers: !!modifiers,
        recursive: !!recursive,
        delayMs: 200,
      });

      let stored = 0;
      if (blogId) {
        for (const k of found) {
          const r = await run(
            "INSERT INTO keywords (blog_id, keyword, source, status) VALUES (?, ?, 'autocomplete', 'idea') ON CONFLICT(blog_id, keyword) DO NOTHING",
            [blogId, k]
          );
          if (r !== undefined) stored++;
        }
      }

      res.json({ count: found.length, stored, keywords: found });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/keywords/suggest-fast", async (req, res) => {
    try {
      const { query, gl = "us", hl = "en" } = req.body;
      if (!query) return res.json([]);
      const results = await suggest(query, { gl, hl });
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/keywords/mine", async (req, res) => {
    try {
      const { blogId, days = 90, minImpressions = 50 } = req.body;
      if (!blogId) return res.status(400).json({ error: "Blog ID is required" });

      const [blog] = await all<any>("SELECT * FROM blogs WHERE id = ?", [blogId]);
      if (!blog || !blog.gsc_property) {
        return res.status(400).json({ error: "Blog has no GSC property configured" });
      }

      const end = new Date();
      end.setDate(end.getDate() - 2);
      const start = new Date(end);
      start.setDate(start.getDate() - parseInt(String(days)));

      const rows = await gsc.queryAnalytics({
        siteUrl: blog.gsc_property,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        dimensions: ["query"],
        rowLimit: 5000,
      });

      const candidates = rows
        .filter((r) => r.impressions >= parseInt(String(minImpressions)) && r.position > 8)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 100);

      let stored = 0;
      for (const c of candidates) {
        const r = await run(
          "INSERT INTO keywords (blog_id, keyword, source, status) VALUES (?, ?, 'gsc', 'idea') ON CONFLICT(blog_id, keyword) DO NOTHING",
          [blogId, c.keys[0]]
        );
        if (r !== undefined) stored++;
      }

      res.json({ count: candidates.length, stored, candidates });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/keywords/serp", async (req, res) => {
    try {
      const { keywordId, keyword, gl = "us" } = req.body;
      let kw = keyword;
      let kRecord: any = null;

      if (keywordId) {
        const [k] = await all<any>("SELECT * FROM keywords WHERE id = ?", [keywordId]);
        if (!k) return res.status(404).json({ error: "Keyword ID not found" });
        kw = k.keyword;
        kRecord = k;
      }

      if (!kw) return res.status(400).json({ error: "Keyword is required" });

      const analysis = await enrichSerp(await fetchSerp(kw, { gl }), 5);
      const brief = briefFromSerp(analysis);

      if (kRecord) {
        await run("UPDATE keywords SET serp_json = ? WHERE id = ?", [JSON.stringify(analysis), kRecord.id]);
      }

      res.json({ analysis, brief });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/keywords/score", async (req, res) => {
    try {
      const { keywordId, relevance, intentFit, winnable, traffic, value, intent, notes } = req.body;
      if (!keywordId) return res.status(400).json({ error: "Keyword ID required" });

      const scores = [relevance, intentFit, winnable, traffic, value].map((x) => Math.max(0, Math.min(2, parseInt(x || 0))));
      const total = scores.reduce((a, b) => a + b, 0);
      const status = total >= 6 ? "scored" : "archived";

      await run(
        `UPDATE keywords SET score_relevance=?, score_intent=?, score_winnable=?, score_traffic=?, score_value=?, score_total=?,
         intent = COALESCE(?, intent), notes = COALESCE(?, notes), status = ? WHERE id = ?`,
        [...scores, total, intent || null, notes || null, status, keywordId]
      );

      res.json({ success: true, total, status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Content Pipeline & Posts
  app.get("/api/posts", async (req, res) => {
    try {
      const blogId = req.query.blogId ? parseInt(req.query.blogId as string) : undefined;
      let sql = `
        SELECT p.*, k.keyword, k.score_total as keyword_score, b.name as blog_name
        FROM posts p
        LEFT JOIN keywords k ON p.keyword_id = k.id
        LEFT JOIN blogs b ON p.blog_id = b.id
      `;
      const args: (number | string)[] = [];
      if (blogId) {
        sql += " WHERE p.blog_id = ?";
        args.push(blogId);
      }
      sql += " ORDER BY p.id DESC";
      const rows = await all(sql, args);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const { blogId, keywordId, title, stage = "idea", briefMd, url, permalink } = req.body;
      if (!blogId || !title) return res.status(400).json({ error: "Blog ID and Title are required" });

      const id = await run(
        `INSERT INTO posts (blog_id, keyword_id, title, stage, brief_md, url, permalink)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [blogId, keywordId || null, title, stage, briefMd || null, url || null, permalink || null]
      );

      if (keywordId) {
        await run("UPDATE keywords SET status = 'briefed' WHERE id = ?", [keywordId]);
      }

      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { stage, title, briefMd, url, permalink, bloggerPostId } = req.body;

      await run(
        `UPDATE posts SET
          stage = COALESCE(?, stage),
          title = COALESCE(?, title),
          brief_md = COALESCE(?, brief_md),
          url = COALESCE(?, url),
          permalink = COALESCE(?, permalink),
          blogger_post_id = COALESCE(?, blogger_post_id)
         WHERE id = ?`,
        [stage ?? null, title ?? null, briefMd ?? null, url ?? null, permalink ?? null, bloggerPostId ?? null, id]
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts/validate", (req, res) => {
    try {
      const { title, html, searchDescription, keyword, permalinkSet } = req.body;
      if (!title || !html) return res.status(400).json({ error: "Title and HTML content are required" });

      const issues = validatePost({
        title,
        html,
        searchDescription,
        keyword,
        permalinkSet: !!permalinkSet,
      });

      const formatted = formatIssues(issues);
      const passed = !issues.some((i) => i.level === "error");

      res.json({ passed, issues, formatted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts/publish", async (req, res) => {
    try {
      const { blogId, title, html, labels, isDraft = true } = req.body;
      const [blog] = await all<any>("SELECT * FROM blogs WHERE id = ?", [blogId]);
      if (!blog || !blog.blogger_blog_id) {
        return res.status(400).json({ error: "Blog has no Blogger ID linked" });
      }

      const result = await blogger.insertPost({
        blogId: blog.blogger_blog_id,
        title,
        contentHtml: html,
        labels: Array.isArray(labels) ? labels : labels ? String(labels).split(",").map((s) => s.trim()) : [],
        isDraft,
      });

      res.json({ success: true, post: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts/schema", (req, res) => {
    try {
      const { type, data } = req.body;
      if (type === "faq") {
        return res.json({ schema: faqSchema(data.qa || []) });
      } else if (type === "howto") {
        return res.json({ schema: howToSchema(data.name || "", data.steps || []) });
      } else {
        return res.json({
          schema: articleSchema({
            headline: data.headline || data.title,
            url: data.url,
            authorName: data.authorName || "Author",
            authorUrl: data.authorUrl,
            description: data.description,
            imageUrl: data.imageUrl,
            datePublished: data.datePublished || new Date().toISOString(),
            dateModified: data.dateModified,
          }),
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/posts/inventory", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).json({ error: "URL parameter required" });
      const inventory = await blogger.feedInventory(url, 200);
      res.json(inventory);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Tracking & Alerts
  app.get("/api/tracking/snapshots", async (req, res) => {
    try {
      const blogId = req.query.blogId ? parseInt(req.query.blogId as string) : undefined;
      if (!blogId) return res.status(400).json({ error: "blogId is required" });

      const snapshots = await all(
        "SELECT * FROM gsc_snapshots WHERE blog_id = ? ORDER BY clicks DESC LIMIT 100",
        [blogId]
      );
      res.json(snapshots);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/tracking/sync", async (req, res) => {
    try {
      const { blogId, days = 28 } = req.body;
      const [blog] = await all<any>("SELECT * FROM blogs WHERE id = ?", [blogId]);
      if (!blog || !blog.gsc_property) return res.status(400).json({ error: "No GSC property linked" });

      const end = new Date();
      end.setDate(end.getDate() - 2);
      const start = new Date(end);
      start.setDate(start.getDate() - parseInt(String(days)));
      const endS = end.toISOString().slice(0, 10);

      const rows = await gsc.queryAnalytics({
        siteUrl: blog.gsc_property,
        startDate: start.toISOString().slice(0, 10),
        endDate: endS,
        dimensions: ["page", "query"],
        rowLimit: 25000,
      });

      await run("DELETE FROM gsc_snapshots WHERE blog_id = ? AND date = ? AND days = ?", [blog.id, endS, parseInt(String(days))]);
      for (const r of rows) {
        await run(
          "INSERT INTO gsc_snapshots (blog_id, date, days, page, query, clicks, impressions, ctr, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [blog.id, endS, parseInt(String(days)), r.keys[0], r.keys[1], r.clicks, r.impressions, r.ctr, r.position]
        );
      }

      res.json({ success: true, count: rows.length, date: endS });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/tracking/recipes", async (req, res) => {
    try {
      const blogId = req.query.blogId ? parseInt(req.query.blogId as string) : undefined;
      if (!blogId) return res.status(400).json({ error: "blogId is required" });

      const hits = await runRecipes(blogId);
      const savedCount = await saveAlerts(blogId, hits);

      res.json({ hits, savedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/alerts", async (req, res) => {
    try {
      const blogId = req.query.blogId ? parseInt(req.query.blogId as string) : undefined;
      const status = (req.query.status as string) || "open";
      let sql = "SELECT a.*, b.name as blog_name FROM alerts a LEFT JOIN blogs b ON a.blog_id = b.id";
      const args: (number | string)[] = [];
      const clauses: string[] = [];

      if (blogId) {
        clauses.push("a.blog_id = ?");
        args.push(blogId);
      }
      if (status !== "all") {
        clauses.push("a.status = ?");
        args.push(status);
      }
      if (clauses.length) sql += ` WHERE ${clauses.join(" AND ")}`;
      sql += " ORDER BY a.id DESC LIMIT 100";

      const rows = await all(sql, args);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/alerts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status = "done" } = req.body;
      await run("UPDATE alerts SET status = ? WHERE id = ?", [status, id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Health & PageSpeed
  app.post("/api/health/speed", async (req, res) => {
    try {
      const { url, strategy = "mobile" } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      const result = await runPageSpeed(url, strategy);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/health/inspect", async (req, res) => {
    try {
      const { blogId, url } = req.body;
      const [blog] = await all<any>("SELECT * FROM blogs WHERE id = ?", [blogId]);
      if (!blog || !blog.gsc_property) return res.status(400).json({ error: "No GSC property linked" });

      const result = await gsc.inspectUrl(blog.gsc_property, url);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/health/sitemaps", async (req, res) => {
    try {
      const blogId = req.query.blogId ? parseInt(req.query.blogId as string) : undefined;
      if (!blogId) return res.status(400).json({ error: "blogId required" });
      const [blog] = await all<any>("SELECT * FROM blogs WHERE id = ?", [blogId]);
      if (!blog || !blog.gsc_property) return res.status(400).json({ error: "No GSC property linked" });

      const sitemaps = await gsc.listSitemaps(blog.gsc_property);
      res.json(sitemaps);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/health/sitemaps/submit", async (req, res) => {
    try {
      const { blogId } = req.body;
      const [blog] = await all<any>("SELECT * FROM blogs WHERE id = ?", [blogId]);
      if (!blog || !blog.gsc_property) return res.status(400).json({ error: "No GSC property linked" });

      const feed = blog.url.replace(/\/$/, "") + "/sitemap.xml";
      await gsc.submitSitemap(blog.gsc_property, feed);
      res.json({ success: true, feed });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Outreach CRM
  app.get("/api/outreach", async (req, res) => {
    try {
      const blogId = req.query.blogId ? parseInt(req.query.blogId as string) : undefined;
      const status = req.query.status as string | undefined;
      const list = await outreach.listProspects(blogId, status === "all" ? undefined : status);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/outreach/due", async (req, res) => {
    try {
      const blogId = req.query.blogId ? parseInt(req.query.blogId as string) : undefined;
      const due = await outreach.dueToday(blogId);
      res.json(due);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/outreach", async (req, res) => {
    try {
      const { blogId, siteUrl, siteName, niche, authority, contactName, contactEmail, opportunity, notes } = req.body;
      if (!blogId || !siteUrl) return res.status(400).json({ error: "blogId and siteUrl are required" });

      await outreach.addProspect({
        blogId,
        siteUrl,
        siteName,
        niche,
        authority: authority ? parseInt(authority) : undefined,
        contactName,
        contactEmail,
        opportunity,
        notes,
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/outreach/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, publishedUrl, linkRel, note } = req.body;
      await outreach.setStatus(parseInt(id), status as any, { publishedUrl, linkRel, note });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------- GEMINI AI SEO ENGINE ------------------- */

  app.post("/api/ai/brief", async (req, res) => {
    try {
      const { keyword, niche, competitorHeadings } = req.body;
      if (!keyword) return res.status(400).json({ error: "Keyword is required" });
      const brief = await generateSeoBriefWithGemini(keyword, niche, competitorHeadings);
      res.json({ brief });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to generate AI brief" });
    }
  });

  app.post("/api/ai/metadata", async (req, res) => {
    try {
      const { keyword, currentTitle, niche } = req.body;
      if (!keyword) return res.status(400).json({ error: "Keyword is required" });
      const result = await generateSeoMetadataWithGemini(keyword, currentTitle, niche);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to generate AI metadata" });
    }
  });

  app.post("/api/ai/keywords", async (req, res) => {
    try {
      const { seed, niche } = req.body;
      if (!seed) return res.status(400).json({ error: "Seed topic is required" });
      const clusters = await expandKeywordsWithGemini(seed, niche);
      res.json({ clusters });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to expand keywords" });
    }
  });

  app.post("/api/ai/autoblog", async (req, res) => {
    try {
      const { keyword, niche, blogId, isDraft } = req.body;
      if (!keyword || !blogId) return res.status(400).json({ error: "Keyword and blogId are required" });
      
      const blog = db.prepare("SELECT * FROM blogs WHERE id = ?").get(blogId) as any;
      if (!blog || !blog.blogger_blog_id) return res.status(400).json({ error: "Blog not found or lacks a linked Blogger ID" });

      const content = await generateAutoBlogPost(keyword, niche);
      const post = await blogger.insertPost({
        blogId: blog.blogger_blog_id,
        title: content.title,
        contentHtml: content.htmlContent,
        labels: content.tags,
        isDraft: isDraft !== false,
      });

      res.json({
        success: true,
        postUrl: post.url,
        postId: post.id,
        isDraft: post.title ? true : false // just an indicator
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to generate auto blog" });
    }
  });

  /* ------------------- TECH SEO TOOLS ------------------- */

  app.post("/api/tools/index-url", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      
      const response = await gsc.requestGoogleIndexing(url, "URL_UPDATED");
      res.json({ success: true, response });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to index URL" });
    }
  });

  app.post("/api/tools/scrape-url", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const html = await response.text();
      // Dynamically import cheerio so we don't block startup if not strictly needed
      const cheerio = await import("cheerio");
      const $ = cheerio.load(html);

      const title = $("title").text();
      const metaDescription = $("meta[name='description']").attr("content") || "";
      const canonical = $("link[rel='canonical']").attr("href") || "";
      const robots = $("meta[name='robots']").attr("content") || "";
      
      const h1s: string[] = [];
      $("h1").each((_, el) => {
        h1s.push($(el).text().trim());
      });

      const wordCount = $("body").text().replace(/\s+/g, " ").trim().split(" ").length;

      res.json({
        title,
        metaDescription,
        canonical,
        robots,
        h1Count: h1s.length,
        h1s,
        wordCount,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to scrape URL" });
    }
  });

  app.post("/api/tools/audit-robots", async (req, res) => {
    try {
      const { domain } = req.body;
      if (!domain) return res.status(400).json({ error: "Domain is required" });

      const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;
      const robotsUrl = new URL("/robots.txt", baseUrl).toString();
      
      const response = await fetch(robotsUrl);
      if (!response.ok) throw new Error(`Failed to fetch robots.txt (HTTP ${response.status})`);
      
      const robotsTxt = await response.text();
      const hasSitemap = robotsTxt.toLowerCase().includes("sitemap:");
      
      res.json({
        url: robotsUrl,
        content: robotsTxt,
        hasSitemap,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to audit robots.txt" });
    }
  });

  /* ------------------- GOOGLE ADSENSE ROUTES ------------------- */

  app.get("/api/adsense/accounts", async (req, res) => {
    try {
      const accounts = await adsense.listAdSenseAccounts();
      res.json(accounts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/adsense/sites", async (req, res) => {
    try {
      const accountName = req.query.accountName as string;
      if (!accountName) return res.status(400).json({ error: "accountName query param required" });
      const sites = await adsense.listAdSenseSites(accountName);
      res.json(sites);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/adsense/units", async (req, res) => {
    try {
      const accountName = req.query.accountName as string;
      if (!accountName) return res.status(400).json({ error: "accountName query param required" });
      const units = await adsense.listAdUnits(accountName);
      res.json(units);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/adsense/alerts", async (req, res) => {
    try {
      const accountName = req.query.accountName as string;
      if (!accountName) return res.status(400).json({ error: "accountName query param required" });
      const alerts = await adsense.listAdSenseAlerts(accountName);
      res.json(alerts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/adsense/report", async (req, res) => {
    try {
      const accountName = req.query.accountName as string;
      const days = parseInt((req.query.days as string) || "30", 10);
      if (!accountName) return res.status(400).json({ error: "accountName query param required" });
      const report = await adsense.getAdSenseReport(accountName, days);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/adsense/audit", async (req, res) => {
    try {
      const { blogId } = req.body;
      if (!blogId) return res.status(400).json({ error: "blogId required" });
      const [blog] = await all<any>("SELECT * FROM blogs WHERE id = ?", [blogId]);
      if (!blog || !blog.blogger_blog_id) return res.status(404).json({ error: "Linked Blogger blog not found" });

      const pages = await blogger.listPages(blog.blogger_blog_id);
      const posts = await blogger.listPosts(blog.blogger_blog_id, 50, "LIVE");

      const audit = adsense.auditAdSenseReadiness({
        blogUrl: blog.url,
        postCount: posts.length,
        pages,
        posts: posts.map((p) => ({ title: p.title, wordCount: p.audit?.wordCount })),
        hasCustomDomain: blog.is_custom_domain === 1,
      });

      res.json({
        blog: { name: blog.name, url: blog.url },
        pagesCount: pages.length,
        postsCount: posts.length,
        audit,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/adsense/generate-adstxt", (req, res) => {
    try {
      const { publisherId } = req.body;
      if (!publisherId) return res.status(400).json({ error: "publisherId is required" });
      const adsTxt = adsense.generateAdsTxt(publisherId);
      res.json({ adsTxt });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/adsense/autofix-pages", async (req, res) => {
    try {
      const { blogId, pageType } = req.body;
      if (!blogId || !pageType) return res.status(400).json({ error: "blogId and pageType required" });
      const [blog] = await all<any>("SELECT * FROM blogs WHERE id = ?", [blogId]);
      if (!blog || !blog.blogger_blog_id) return res.status(404).json({ error: "Blog not found" });

      const pageData = await generatePolicyPage(pageType, blog.name, blog.url);
      const inserted = await blogger.insertPage({
        blogId: blog.blogger_blog_id,
        title: pageData.title,
        contentHtml: pageData.htmlContent,
        isDraft: false,
      });

      res.json({ success: true, page: inserted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------- GOOGLE ANALYTICS (GA4) ROUTES ------------------- */

  app.get("/api/analytics/properties", async (req, res) => {
    try {
      const properties = await analytics.listGa4Properties();
      res.json(properties);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/analytics/report", async (req, res) => {
    try {
      const propertyId = req.query.propertyId as string;
      const days = parseInt((req.query.days as string) || "30", 10);
      if (!propertyId) return res.status(400).json({ error: "propertyId required" });
      const report = await analytics.getGa4TrafficSummary(propertyId, days);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/analytics/top-pages", async (req, res) => {
    try {
      const propertyId = req.query.propertyId as string;
      if (!propertyId) return res.status(400).json({ error: "propertyId required" });
      const topPages = await analytics.getGa4TopPages(propertyId);
      res.json(topPages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------- GSC STRIKING DISTANCE & SITEMAPS ------------------- */

  app.get("/api/gsc/striking-distance", async (req, res) => {
    try {
      const siteUrl = req.query.siteUrl as string;
      if (!siteUrl) return res.status(400).json({ error: "siteUrl required" });
      const items = await gsc.getStrikingDistanceKeywords(siteUrl);
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/gsc/submit-sitemaps", async (req, res) => {
    try {
      const { siteUrl } = req.body;
      if (!siteUrl) return res.status(400).json({ error: "siteUrl required" });
      const submitted = await gsc.submitDefaultSitemaps(siteUrl);
      res.json({ success: true, submitted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------- BLOGGER PAGES & DEEP AUDITS ------------------- */

  app.get("/api/blogger/pages", async (req, res) => {
    try {
      const blogId = req.query.blogId as string;
      if (!blogId) return res.status(400).json({ error: "blogId required" });
      const pages = await blogger.listPages(blogId);
      res.json(pages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/blogger/audit-posts", async (req, res) => {
    try {
      const blogId = req.query.blogId as string;
      if (!blogId) return res.status(400).json({ error: "blogId required" });
      const posts = await blogger.listPosts(blogId, 50, "LIVE");
      res.json(posts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/blogger/autofix-post", async (req, res) => {
    try {
      const { bloggerBlogId, bloggerPostId, title, keyword } = req.body;
      if (!bloggerBlogId || !bloggerPostId) return res.status(400).json({ error: "bloggerBlogId and bloggerPostId required" });

      const postData = await blogger.getPost(bloggerBlogId, bloggerPostId);
      if (!postData.content) return res.status(400).json({ error: "Post has no content to fix" });

      const fixed = await fixAndEnrichBlogPost(postData.content, title || postData.title || "Blog Post", keyword);
      const updated = await blogger.updatePost(bloggerBlogId, bloggerPostId, {
        title: fixed.improvedTitle,
        content: fixed.improvedHtml,
      });

      // Notify Indexing API if live
      if (postData.url) {
        try {
          await gsc.requestGoogleIndexing(postData.url, "URL_UPDATED");
        } catch {}
      }

      res.json({ success: true, updated, changelog: fixed.changelog });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------- 360° COMPLETE AUTO-PILOT ENGINE ------------------- */

  app.post("/api/autopilot/run-360", async (req, res) => {
    try {
      const { blogId, options } = req.body;
      if (!blogId) return res.status(400).json({ error: "blogId required" });
      const result = await run360AutoPilot(blogId, options || {});
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

export async function startServer() {
  const app = createApp();
  const PORT = 3000;

  /* ------------------- FRONTEND / VITE ------------------- */

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Blogger SEO Command Center server running at http://0.0.0.0:${PORT}`);
  });
}

// Only auto-start if run directly
if (process.env.VERCEL !== "1" && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer().catch(console.error);
}

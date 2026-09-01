#!/usr/bin/env node
/**
 * seo — Blogger SEO Command Center CLI.
 * Terminal-first: designed to be driven by hand or by Claude Code (see .claude/skills/).
 */
import { Command } from "commander";
import fs from "node:fs";
import { migrate, all, run } from "./store.js";
import { login, exchangeCode, hasCredentials } from "./google/auth.js";
import * as gsc from "./google/gsc.js";
import * as blogger from "./google/blogger.js";
import { runPageSpeed } from "./google/pagespeed.js";
import { harvest } from "./keywords/autocomplete.js";
import { fetchSerp, enrichSerp, briefFromSerp } from "./serp/serp.js";
import { validatePost, formatIssues } from "./content/validate.js";
import { articleSchema, faqSchema } from "./content/schema.js";
import { runRecipes, saveAlerts } from "./tracking/recipes.js";
import * as outreach from "./outreach/outreach.js";

const program = new Command();
program.name("seo").description("Blogger SEO Command Center — keyword research, content pipeline, tracking, outreach").version("0.1.0");

const table = (rows: Record<string, unknown>[]) => {
  if (rows.length === 0) return console.log("(none)");
  console.table(rows);
};

async function requireBlog(idOrUrl?: string): Promise<{ id: number; name: string; url: string; blogger_blog_id: string | null; gsc_property: string | null }> {
  await migrate();
  type B = { id: number; name: string; url: string; blogger_blog_id: string | null; gsc_property: string | null };
  const blogs = await all<B>("SELECT id, name, url, blogger_blog_id, gsc_property FROM blogs ORDER BY id");
  if (blogs.length === 0) throw new Error("No blogs registered. Run: seo blogs sync   (or: seo blogs add <url> --name <name>)");
  if (!idOrUrl) {
    if (blogs.length === 1) return blogs[0];
    throw new Error(`Multiple blogs — pass --blog <id|url>. Registered:\n${blogs.map((b) => `  ${b.id}: ${b.name} (${b.url})`).join("\n")}`);
  }
  const found = blogs.find((b) => String(b.id) === idOrUrl || b.url.includes(idOrUrl));
  if (!found) throw new Error(`Blog "${idOrUrl}" not found.`);
  return found;
}

/* ---------------- init / auth ---------------- */

program.command("init").description("Create the database schema and data directory").action(async () => {
  await migrate();
  console.log("✅ Database ready (data/seo.db). Next: copy .env.example → .env, fill Google keys, run `seo auth login`, then `seo blogs sync`.");
});

const auth = program.command("auth").description("Google authentication");
auth.command("login").description("Interactive OAuth login (opens browser, callback on localhost:8123)").action(async () => { await login(); });
auth.command("code <code>").description("Finish login with a pasted ?code= value").action(async (code: string) => { await exchangeCode(code); });
auth.command("status").description("Show auth status").action(async () => {
  console.log(hasCredentials() ? "✅ Google credentials present." : "❌ Not authenticated. Run: seo auth login");
});

/* ---------------- blogs ---------------- */

const blogs = program.command("blogs").description("Manage blogs (multi-blog)");
blogs.command("sync").description("Import all your Blogger blogs + link GSC properties automatically").action(async () => {
  await migrate();
  const mine = await blogger.listBlogs();
  const sites = hasCredentials() ? await gsc.listSites().catch(() => [] as string[]) : [];
  for (const b of mine) {
    const host = new URL(b.url).host;
    const gscProp = sites.find((s) => s.includes(host) || (s.startsWith("sc-domain:") && host.endsWith(s.slice(10)))) || null;
    await run(
      `INSERT INTO blogs (name, url, blogger_blog_id, gsc_property, is_custom_domain)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(url) DO UPDATE SET blogger_blog_id = excluded.blogger_blog_id, gsc_property = COALESCE(excluded.gsc_property, blogs.gsc_property)`,
      [b.name, b.url, b.bloggerBlogId, gscProp, host.endsWith("blogspot.com") ? 0 : 1]
    );
    console.log(`✅ ${b.name} (${b.url}) ${gscProp ? `→ GSC: ${gscProp}` : "→ ⚠️ no GSC property found (verify it in Search Console)"}`);
  }
});
blogs.command("add <url>").description("Register a blog manually").option("--name <name>").option("--gsc <property>").action(async (url: string, o: { name?: string; gsc?: string }) => {
  await migrate();
  await run("INSERT INTO blogs (name, url, gsc_property, is_custom_domain) VALUES (?, ?, ?, ?) ON CONFLICT(url) DO NOTHING",
    [o.name || url, url, o.gsc || null, url.includes("blogspot.com") ? 0 : 1]);
  console.log("✅ added");
});
blogs.command("list").description("List registered blogs").action(async () => {
  await migrate();
  table(await all("SELECT id, name, url, blogger_blog_id, gsc_property FROM blogs"));
});

/* ---------------- keywords ---------------- */

const kw = program.command("kw").description("Keyword research (playbook §1, §2, §10)");
kw.command("harvest <seed>")
  .description("Expand a seed via Google Autocomplete (alphabet + questions + modifiers)")
  .option("--blog <idOrUrl>")
  .option("--gl <country>", "country code, e.g. us / pk", "us")
  .option("--hl <lang>", "language", "en")
  .option("--recursive", "feed top suggestions back once")
  .option("--dry", "print only, don't store")
  .action(async (seed: string, o: { blog?: string; gl: string; hl: string; recursive?: boolean; dry?: boolean }) => {
    const blog = o.dry ? null : await requireBlog(o.blog);
    console.log(`Harvesting autocomplete for "${seed}" (gl=${o.gl}) — ~45 requests at 1/sec, be patient...`);
    const found = await harvest(seed, {
      gl: o.gl, hl: o.hl, recursive: o.recursive,
      onProgress: (d, t) => { if (d % 10 === 0) console.log(`  ${d}/${t} queries done`); },
    });
    console.log(`\n${found.length} unique keyword candidates:`);
    for (const k of found) console.log("  " + k);
    if (blog) {
      let stored = 0;
      for (const k of found) {
        const r = await run("INSERT INTO keywords (blog_id, keyword, source) VALUES (?, ?, 'autocomplete') ON CONFLICT(blog_id, keyword) DO NOTHING", [blog.id, k]);
        if (r !== undefined) stored++;
      }
      console.log(`\n✅ stored ${stored} new candidates for blog "${blog.name}" (status=idea). Next: seo kw serp / seo kw score`);
    }
  });

kw.command("mine")
  .description("Mine your own GSC data for keyword opportunities (playbook §9 recipe 3: query gaps)")
  .option("--blog <idOrUrl>")
  .option("--days <n>", "lookback window", "90")
  .option("--min-impressions <n>", "impression floor", "50")
  .action(async (o: { blog?: string; days: string; minImpressions: string }) => {
    const blog = await requireBlog(o.blog);
    if (!blog.gsc_property) throw new Error("Blog has no GSC property linked — run `seo blogs sync` or `seo blogs add --gsc`.");
    const end = new Date(); end.setDate(end.getDate() - 2);
    const start = new Date(end); start.setDate(start.getDate() - parseInt(o.days));
    const rows = await gsc.queryAnalytics({
      siteUrl: blog.gsc_property,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      dimensions: ["query"], rowLimit: 5000,
    });
    const candidates = rows
      .filter((r) => r.impressions >= parseInt(o.minImpressions) && r.position > 8)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 100);
    console.log(`${candidates.length} queries you're visible for (pos>8, impressions≥${o.minImpressions}) — pre-validated demand:`);
    for (const c of candidates) {
      console.log(`  [pos ${c.position.toFixed(1).padStart(5)}] ${Math.round(c.impressions).toString().padStart(6)} imp  ${c.keys[0]}`);
      await run("INSERT INTO keywords (blog_id, keyword, source) VALUES (?, ?, 'gsc') ON CONFLICT(blog_id, keyword) DO NOTHING", [blog.id, c.keys[0]]);
    }
    console.log("✅ stored as candidates (source=gsc).");
  });

kw.command("list").description("List keyword candidates").option("--blog <idOrUrl>").option("--status <s>", "idea|scored|briefed|assigned|archived").action(async (o: { blog?: string; status?: string }) => {
  const blog = await requireBlog(o.blog);
  const args: (number | string)[] = [blog.id];
  let sql = "SELECT id, keyword, source, intent, status, score_total FROM keywords WHERE blog_id = ?";
  if (o.status) { sql += " AND status = ?"; args.push(o.status); }
  sql += " ORDER BY score_total DESC NULLS LAST, id DESC LIMIT 100";
  table(await all(sql, args));
});

kw.command("serp <keywordId>")
  .description("Fetch + cache SERP analysis (top 10, PAA, related, competitor headings) for a stored keyword")
  .option("--gl <country>", "country", "us")
  .action(async (keywordId: string, o: { gl: string }) => {
    await migrate();
    const [k] = await all<{ id: number; keyword: string }>("SELECT id, keyword FROM keywords WHERE id = ?", [parseInt(keywordId)]);
    if (!k) throw new Error("keyword id not found");
    console.log(`Fetching SERP for "${k.keyword}"...`);
    const analysis = await enrichSerp(await fetchSerp(k.keyword, { gl: o.gl }), 5);
    await run("UPDATE keywords SET serp_json = ? WHERE id = ?", [JSON.stringify(analysis), k.id]);
    console.log(briefFromSerp(analysis));
    console.log("\n✅ SERP cached. Score it with: seo kw score " + k.id + " --relevance 2 --intent 2 --winnable 1 --traffic 2 --value 2");
  });

kw.command("score <keywordId>")
  .description("Score a keyword through the 5-gate funnel (0-2 each; playbook §2)")
  .requiredOption("--relevance <n>").requiredOption("--intent-fit <n>").requiredOption("--winnable <n>")
  .requiredOption("--traffic <n>").requiredOption("--value <n>")
  .option("--intent <type>", "informational|commercial|transactional|navigational")
  .option("--notes <text>")
  .action(async (keywordId: string, o: { relevance: string; intentFit: string; winnable: string; traffic: string; value: string; intent?: string; notes?: string }) => {
    await migrate();
    const raw = [o.relevance, o.intentFit, o.winnable, o.traffic, o.value];
    if (raw.some((x) => Number.isNaN(parseInt(x)))) {
      throw new Error("--relevance, --intent-fit, --winnable, --traffic and --value must all be numbers 0-2");
    }
    const s = raw.map((x) => Math.max(0, Math.min(2, parseInt(x))));
    const total = s.reduce((a, b) => a + b, 0);
    await run(
      `UPDATE keywords SET score_relevance=?, score_intent=?, score_winnable=?, score_traffic=?, score_value=?, score_total=?,
       intent = COALESCE(?, intent), notes = COALESCE(?, notes), status = 'scored' WHERE id = ?`,
      [...s, total, o.intent ?? null, o.notes ?? null, parseInt(keywordId)]
    );
    console.log(`Score: ${total}/10 — ${total >= 8 ? "🎯 write it" : total >= 6 ? "🟡 backlog" : "❌ archive it"}`);
    if (total < 6) await run("UPDATE keywords SET status = 'archived' WHERE id = ?", [parseInt(keywordId)]);
  });

/* ---------------- posts pipeline ---------------- */

const post = program.command("post").description("Content pipeline (playbook §4)");
post.command("brief <keywordId>").description("Create a post in the pipeline from a scored keyword + its cached SERP brief").action(async (keywordId: string) => {
  await migrate();
  const [k] = await all<{ id: number; blog_id: number; keyword: string; serp_json: string | null; score_total: number | null }>(
    "SELECT id, blog_id, keyword, serp_json, score_total FROM keywords WHERE id = ?", [parseInt(keywordId)]);
  if (!k) throw new Error("keyword id not found");
  if ((k.score_total ?? 0) < 6) console.warn("⚠️ score < 6 — playbook says don't write this. Continuing anyway.");
  const brief = k.serp_json ? briefFromSerp(JSON.parse(k.serp_json)) : `# Content brief: ${k.keyword}\n\n(no SERP cached — run seo kw serp first for a real brief)`;
  const id = await run(
    "INSERT INTO posts (blog_id, keyword_id, title, stage, brief_md) VALUES (?, ?, ?, 'briefed', ?)",
    [k.blog_id, k.id, k.keyword, brief]);
  await run("UPDATE keywords SET status = 'briefed' WHERE id = ?", [k.id]);
  const file = `data/brief-${id}.md`;
  fs.writeFileSync(file, brief);
  console.log(`✅ post #${id} created (stage=briefed). Brief written to ${file} — draft against it, then: seo post validate`);
});

post.command("validate <htmlFile>")
  .description("Run the pre-publish gate on a draft HTML file")
  .requiredOption("--title <title>")
  .option("--description <desc>", "the Blogger Search Description you'll paste")
  .option("--keyword <kw>")
  .option("--permalink-set", "confirm the custom permalink is set in the Blogger editor")
  .action(async (htmlFile: string, o: { title: string; description?: string; keyword?: string; permalinkSet?: boolean }) => {
    const html = fs.readFileSync(htmlFile, "utf8");
    const issues = validatePost({ title: o.title, html, searchDescription: o.description, keyword: o.keyword, permalinkSet: !!o.permalinkSet });
    console.log(formatIssues(issues));
    process.exitCode = issues.some((i) => i.level === "error") ? 1 : 0;
  });

post.command("publish <htmlFile>")
  .description("Insert a validated draft into Blogger (as DRAFT — set permalink + description in the editor, then publish there)")
  .requiredOption("--title <title>")
  .option("--blog <idOrUrl>")
  .option("--labels <labels>", "comma-separated")
  .option("--live", "publish immediately instead of draft (only if permalink already set)")
  .action(async (htmlFile: string, o: { title: string; blog?: string; labels?: string; live?: boolean }) => {
    const blog = await requireBlog(o.blog);
    if (!blog.blogger_blog_id) throw new Error("Blog has no Blogger ID — run `seo blogs sync`.");
    const html = fs.readFileSync(htmlFile, "utf8");
    const res = await blogger.insertPost({
      blogId: blog.blogger_blog_id, title: o.title, contentHtml: html,
      labels: o.labels?.split(",").map((s) => s.trim()), isDraft: !o.live,
    });
    console.log(`✅ ${o.live ? "PUBLISHED" : "draft created"}: ${res.url || "(draft — open Blogger editor)"} (post id ${res.id})`);
    if (!o.live) console.log("Next in the Blogger editor: set custom permalink + Search Description, add images, then Publish.");
  });

post.command("schema").description("Generate JSON-LD (Article/FAQ) to paste into the post HTML")
  .requiredOption("--title <t>").requiredOption("--url <u>").requiredOption("--author <a>")
  .option("--description <d>").option("--image <i>").option("--published <iso>", "ISO date", new Date().toISOString())
  .option("--publisher <name>", "blog/site name for the required Article publisher field")
  .option("--logo <url>", "publisher logo image URL")
  .option("--faq <file>", "JSON file: [{question, answer}]")
  .action((o: { title: string; url: string; author: string; description?: string; image?: string; published: string; publisher?: string; logo?: string; faq?: string }) => {
    console.log(articleSchema({
      headline: o.title, url: o.url, authorName: o.author,
      description: o.description, imageUrl: o.image, datePublished: o.published,
      publisherName: o.publisher, publisherLogoUrl: o.logo,
    }));
    if (o.faq) console.log("\n" + faqSchema(JSON.parse(fs.readFileSync(o.faq, "utf8"))));
  });

post.command("inventory").description("List all posts of a blog from its public feed (no auth needed)").option("--blog <idOrUrl>").option("--url <blogUrl>", "any Blogger blog URL (e.g. a competitor)").action(async (o: { blog?: string; url?: string }) => {
  const url = o.url || (await requireBlog(o.blog)).url;
  const inv = await blogger.feedInventory(url);
  console.log(`${inv.length} posts on ${url}:`);
  for (const p of inv) console.log(`  ${p.published.slice(0, 10)}  ${p.title}  [${p.labels.join(", ")}]  ${p.url}`);
});

/* ---------------- tracking ---------------- */

const track = program.command("track").description("Rank & performance tracking (playbook §9)");
track.command("sync").description("Pull a GSC snapshot (page+query) into the local DB").option("--blog <idOrUrl>").option("--days <n>", "period length", "28").action(async (o: { blog?: string; days: string }) => {
  const blog = await requireBlog(o.blog);
  if (!blog.gsc_property) throw new Error("No GSC property linked for this blog.");
  const end = new Date(); end.setDate(end.getDate() - 2);
  const start = new Date(end); start.setDate(start.getDate() - parseInt(o.days));
  const endS = end.toISOString().slice(0, 10);
  const rows = await gsc.queryAnalytics({
    siteUrl: blog.gsc_property, startDate: start.toISOString().slice(0, 10), endDate: endS,
    dimensions: ["page", "query"], rowLimit: 25000,
  });
  await run("DELETE FROM gsc_snapshots WHERE blog_id = ? AND date = ? AND days = ?", [blog.id, endS, parseInt(o.days)]);
  for (const r of rows) {
    await run(
      "INSERT INTO gsc_snapshots (blog_id, date, days, page, query, clicks, impressions, ctr, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [blog.id, endS, parseInt(o.days), r.keys[0], r.keys[1], r.clicks, r.impressions, r.ctr, r.position]);
  }
  console.log(`✅ stored ${rows.length} rows (period ending ${endS}, ${o.days} days) for "${blog.name}".`);
});

track.command("recipes").description("Run the money recipes (striking distance, CTR fixers, second-page, decay) and save alerts").option("--blog <idOrUrl>").action(async (o: { blog?: string }) => {
  const blog = await requireBlog(o.blog);
  const hits = await runRecipes(blog.id);
  if (hits.length === 0) return console.log("No opportunities found in the latest snapshot.");
  const byType = new Map<string, typeof hits>();
  for (const h of hits) { if (!byType.has(h.type)) byType.set(h.type, []); byType.get(h.type)!.push(h); }
  for (const [type, list] of byType) {
    console.log(`\n═══ ${type.toUpperCase().replace("_", " ")} (${list.length}) ═══`);
    for (const h of list.slice(0, 15)) console.log(`• ${h.page}\n  ${h.message}`);
  }
  const saved = await saveAlerts(blog.id, hits);
  console.log(`\n✅ ${saved} new alert(s) saved. See: seo track alerts`);
});

track.command("alerts").description("List open alerts").option("--blog <idOrUrl>").action(async (o: { blog?: string }) => {
  const blog = await requireBlog(o.blog);
  table(await all("SELECT id, type, post_url, message FROM alerts WHERE blog_id = ? AND status = 'open' ORDER BY id DESC LIMIT 50", [blog.id]));
});
track.command("done <alertId>").description("Mark an alert handled").action(async (id: string) => {
  await migrate();
  await run("UPDATE alerts SET status = 'done' WHERE id = ?", [parseInt(id)]);
  console.log("✅");
});

/* ---------------- health ---------------- */

const health = program.command("health").description("Site health (playbook §7)");
health.command("speed <url>").description("PageSpeed / Core Web Vitals audit").option("--desktop").action(async (url: string, o: { desktop?: boolean }) => {
  const r = await runPageSpeed(url, o.desktop ? "desktop" : "mobile");
  console.log(`Performance: ${r.performance ?? "?"}/100 · SEO: ${r.seo ?? "?"}/100 (${r.strategy}, ${r.fieldData ? "has field data" : "lab only"})`);
  console.log(`LCP ${r.lcpMs ? Math.round(r.lcpMs) + "ms" : "?"} · CLS ${r.cls?.toFixed(3) ?? "?"} · TBT ${r.tbtMs ? Math.round(r.tbtMs) + "ms" : "?"}`);
  if (r.topOpportunities.length) { console.log("Top fixes:"); for (const t of r.topOpportunities) console.log("  • " + t); }
});
health.command("index <url>").description("Check index status of a URL (GSC URL Inspection)").option("--blog <idOrUrl>").action(async (url: string, o: { blog?: string }) => {
  const blog = await requireBlog(o.blog);
  if (!blog.gsc_property) throw new Error("No GSC property linked.");
  const r = await gsc.inspectUrl(blog.gsc_property, url);
  console.log(r);
  if (r.coverageState.includes("Discovered")) console.log("→ Fix: add 2–3 internal links from strong posts, improve content, request indexing in GSC UI.");
  if (r.coverageState.includes("Crawled")) console.log("→ Fix: quality problem — add information gain (§4 stage 4), then re-request indexing.");
});
health.command("sitemaps").description("List sitemap status in GSC").option("--blog <idOrUrl>").action(async (o: { blog?: string }) => {
  const blog = await requireBlog(o.blog);
  if (!blog.gsc_property) throw new Error("No GSC property linked.");
  table(await gsc.listSitemaps(blog.gsc_property) as Record<string, unknown>[]);
});
health.command("submit-sitemap").description("Submit sitemap.xml to GSC").option("--blog <idOrUrl>").action(async (o: { blog?: string }) => {
  const blog = await requireBlog(o.blog);
  if (!blog.gsc_property) throw new Error("No GSC property linked.");
  const feed = blog.url.replace(/\/$/, "") + "/sitemap.xml";
  await gsc.submitSitemap(blog.gsc_property, feed);
  console.log(`✅ submitted ${feed}`);
});

/* ---------------- outreach ---------------- */

const out = program.command("outreach").description("Outreach CRM (playbook §11)");
out.command("add <siteUrl>").description("Add a prospect")
  .option("--blog <idOrUrl>").option("--name <siteName>").option("--niche <niche>")
  .option("--authority <dr>").option("--contact <name>").option("--email <email>")
  .option("--type <opportunity>", "guest_post|link_insert|resource_page|collab|journalist", "guest_post")
  .option("--notes <text>")
  .action(async (siteUrl: string, o: { blog?: string; name?: string; niche?: string; authority?: string; contact?: string; email?: string; type: string; notes?: string }) => {
    const blog = await requireBlog(o.blog);
    await outreach.addProspect({
      blogId: blog.id, siteUrl, siteName: o.name, niche: o.niche,
      authority: o.authority ? parseInt(o.authority) : undefined,
      contactName: o.contact, contactEmail: o.email, opportunity: o.type, notes: o.notes,
    });
    console.log("✅ prospect added (status=found). Qualify it, then: seo outreach status <id> qualified");
  });
out.command("list").description("List prospects").option("--blog <idOrUrl>").option("--status <s>").action(async (o: { blog?: string; status?: string }) => {
  const blog = await requireBlog(o.blog);
  table(await outreach.listProspects(blog.id, o.status));
});
out.command("status <id> <status>").description(`Move a prospect (${outreach.PIPELINE.join("|")})`)
  .option("--published-url <url>").option("--rel <rel>", "dofollow|nofollow|sponsored").option("--note <text>")
  .action(async (id: string, status: string, o: { publishedUrl?: string; rel?: string; note?: string }) => {
    await migrate();
    await outreach.setStatus(parseInt(id), status as (typeof outreach.PIPELINE)[number], { publishedUrl: o.publishedUrl, linkRel: o.rel, note: o.note });
    console.log("✅ updated (next action date auto-computed).");
  });
out.command("next").description("What's due today (follow-ups etc.)").option("--blog <idOrUrl>").action(async (o: { blog?: string }) => {
  const blog = await requireBlog(o.blog);
  const due = await outreach.dueToday(blog.id);
  if (due.length === 0) return console.log("Nothing due. 🎉");
  console.log(`${due.length} action(s) due:`);
  table(due);
});

program.parseAsync().catch((e: Error) => {
  console.error("Error:", e.message);
  process.exit(1);
});

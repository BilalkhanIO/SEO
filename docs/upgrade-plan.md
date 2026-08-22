# From `blogger-auto-pilot` to the Blogger SEO Command Center

Review of the existing prototype ([BilalkhanIO/blogger-auto-pilot](https://github.com/BilalkhanIO/blogger-auto-pilot)) and the plan to grow it into the full tool. Target shape per the owner: **runs inside Claude Code (CLI/skills) AND has a web dashboard.**

## What the prototype already has (keep it)

| Piece | State | Verdict |
|---|---|---|
| Google OAuth (Blogger + AdSense + Search Console + Analytics scopes) | Working, tokens in signed cookie | ✅ Keep flow; move tokens to server-side storage so background jobs can run without the browser |
| Blogger API: list blogs/posts, insert post (draft/publish) | Working | ✅ Keep; add update/patch + scheduled publish + custom permalink support |
| Gemini: idea generation + full post generation | Working but **naive** — generates ideas from the blog name alone, writes posts with zero research | ⚠️ Rebuild on top of the playbook pipeline (keywords → SERP research → brief → draft) |
| GSC: list sites, submit sitemap, URL Inspection on last 5 posts | Working | ✅ Keep; extend to Search Analytics queries (the core data) |
| GA4: 7-day visitors + bounce rate | Working (first property found) | ✅ Keep; extend to per-post engagement |
| React UI: dashboard / planner / generator / seo tabs | Working prototype | ✅ Keep as the base of the web dashboard |
| Persistence | **None** — no database at all | ❌ Biggest gap: nothing is tracked over time |

## The gaps (what makes it "auto-pilot" in name only)

1. **No keyword research** — ideas come from Gemini's imagination, not from search demand. → Implement §1/§2/§10 of the playbook: autocomplete harvesting, GSC mining, the 5-gate selection funnel.
2. **No SERP/competitor analysis** — posts are written blind. → Implement §5: fetch top-10, extract headings, find the gap, generate a brief; Gemini drafts FROM the brief.
3. **No memory** — every screen re-fetches; no history, no tracking, no pipeline states. → Add a database (SQLite locally / file-backed JSON for the Claude Code side): keywords table, posts pipeline table, daily GSC snapshots, prospects table.
4. **No tracking loop** — publishes and forgets. → Nightly GSC sync + the 6 recipes (striking distance, CTR fixers, decay...) + 7/30/90-day checkpoints.
5. **No pre-publish gate** — AI HTML goes straight to Blogger. → Implement the stage-5 checklist as a blocking validation (title length, permalink set, search description, internal links, schema JSON-LD).
6. **No outreach module** — → prospects pipeline + follow-up dates (Gmail API optional later).
7. **AdSense is display-only** — → earnings per day joined with traffic data.

## Target architecture

```
repo: BilalkhanIO/SEO
├── core/            TypeScript library — all logic, no UI
│   ├── keywords/    autocomplete harvest, GSC mining, scoring funnel
│   ├── serp/        top-10 fetch, heading extraction, gap analysis, briefs
│   ├── content/     Gemini briefs/drafts, on-page validator, schema generator
│   ├── blogger/     posts CRUD, scheduling, feeds inventory
│   ├── tracking/    GSC/GA4 sync, 6 recipes, alerts, checkpoints
│   ├── health/      PageSpeed, URL inspection sweeps, link checker
│   ├── outreach/    prospects, pipeline states, follow-up dates
│   └── store/       SQLite via better-sqlite3 (single file, zero setup)
├── cli/             command per workflow step → runnable by Claude Code
│   (seo keywords harvest "seed" · seo keywords score · seo serp analyze ·
│    seo brief · seo validate · seo publish · seo track sync · seo track alerts ·
│    seo health audit · seo outreach next ...)
├── web/             the upgraded blogger-auto-pilot React app reading the same DB
├── .claude/skills/  Claude Code skills wrapping the CLI workflows
│   (keyword-research, write-post, pre-publish-check, weekly-review, outreach)
└── docs/            research + playbook (this folder)
```

**Why this split:** the same `core/` powers both faces. In Claude Code, Claude runs the CLI (and skills guide the workflow conversationally — "let's research keywords for X" → Claude runs harvest, scores candidates, discusses picks with you). The web app is for daily glancing: dashboard, pipeline board, alerts, outreach reminders.

## Build order

1. **M1 — Foundations:** repo scaffold, SQLite store, config (blog URL, GSC property, keys), OAuth token storage reusable by CLI.
2. **M2 — Keywords:** autocomplete harvester + GSC query mining + scoring funnel + `keywords` pipeline table.
3. **M3 — Research & briefs:** SERP fetch + heading extraction + PAA + brief generator (Gemini).
4. **M4 — Content & publish:** draft assist, on-page validator (blocking gate), schema generator, Blogger publish/schedule.
5. **M5 — Tracking:** nightly GSC/GA4 sync, the 6 recipes, alert list, 7/30/90 checkpoints.
6. **M6 — Health:** PageSpeed sweeps, index-status sweeps, issue→fix recommendations.
7. **M7 — Outreach:** prospect CRM + follow-up engine.
8. **M8 — Web dashboard:** port blogger-auto-pilot UI onto the new core/DB.

Each milestone is usable on its own from Claude Code before the web UI exists.

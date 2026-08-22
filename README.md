# Blogger SEO Command Center

An automation tool for Google Blogger blogs that connects the free Google SEO tools (Search Console, Analytics, Blogger API, PageSpeed) and other free SEO tools into one dashboard — covering the full loop: **research → write → optimize → publish → track → refresh**, plus an outreach tracker for contacting other blogs.

> **Status:** Research phase complete (August 2026). See [`docs/research/`](docs/research/) for the full findings. Build phase pending decisions in [Open Questions](#open-questions).

---

## Why this exists

- Blogger has no plugin ecosystem (unlike WordPress), so there is no Yoast/RankMath equivalent — schema generation, on-page checklists, and tracking must come from an external tool.
- All the data needed is available **free** through official APIs: Search Console (real ranking data), GA4 (engagement), Blogger API v3 (post automation), PageSpeed Insights (Core Web Vitals), Bing Webmaster (keyword volumes + URL submission), Gemini free tier (AI assistance).
- No free outreach CRM exists anymore (Streak dropped free pipelines; BuzzStream starts at $49/mo) — a simple pipeline + follow-up reminder system fills a real gap.

## Research summary (what we learned)

| Doc | Contents |
|---|---|
| [01-google-tools-apis.md](docs/research/01-google-tools-apis.md) | Every free Google tool, its API, auth, and quota. Verdict: GSC API is the backbone; Custom Search API is dying (Jan 2027); Indexing API is off-limits for blogs. |
| [02-free-seo-tools-apis.md](docs/research/02-free-seo-tools-apis.md) | Third-party free tiers: SERP APIs (Serper 2,500 free credits), Bing Webmaster API (free exact keyword volumes), Ahrefs Webmaster Tools (free backlinks, no API), autocomplete endpoint, Gemini free tier. |
| [03-content-writing-process.md](docs/research/03-content-writing-process.md) | The 8-phase, 36-step workflow for content that ranks in 2025–2026: keyword research → SERP analysis → brief → write (information gain, E-E-A-T) → on-page checklist → publish/index → 7/30/90-day tracking → refresh cycle. Includes Blogger-specific settings and pitfalls. |
| [04-outreach-and-social.md](docs/research/04-outreach-and-social.md) | Blogger outreach: prospect → qualify → contact → follow up (2–3 max, 3–7 days apart) → track links live. Free tools (Hunter 50/mo, Verifalia 25/day, Gmail API), deliverability and CAN-SPAM rules, social APIs for reach/follows. |

## Proposed architecture

```
┌────────────────────────────────────────────────────────────┐
│                      Web Dashboard (UI)                     │
│  Keyword Research · Content Pipeline · Post Tracker ·       │
│  Site Health · Outreach CRM · Alerts                        │
├────────────────────────────────────────────────────────────┤
│                     App server + database                   │
│  per-post state machine, KPI snapshots, alert rules,        │
│  outreach pipeline, scheduled sync jobs                     │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Google APIs  │  Bing API    │ Free add-ons │  AI assist    │
│ GSC Search   │ QueryStats   │ Serper/PAA   │  Gemini Flash │
│ Analytics    │ RelatedKw    │ Moz DA       │  (briefs,     │
│ URL Inspect  │ SubmitUrl    │ autocomplete │  titles,      │
│ GA4 Data     │ UrlLinks     │ UptimeRobot  │  schema)      │
│ Blogger v3   │              │              │               │
│ PageSpeed    │              │              │               │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

### Core modules

1. **Keyword Research** — seed → autocomplete expansion (a–z, question words) → Bing volumes → intent classification → difficulty proxies → topic clusters. GSC query mining for "striking distance" opportunities (position 4–15, high impressions).
2. **Content Pipeline** — per-post state machine: `Idea → Researched → Briefed → Drafted → Optimized → Published → Indexed → Tracking → Refresh`. SERP/PAA analysis feeds an auto-generated content brief; a pre-publish checklist gate enforces the on-page rules (title 40–60 chars, custom permalink BEFORE publish, search description, internal links, JSON-LD schema snippet).
3. **Publisher** — Blogger API v3: create drafts, schedule, publish, update labels/permalinks; feed-based content inventory; posts at human-safe rates (per-blog daily cap exists).
4. **Rank & Performance Tracker** — nightly GSC sync (clicks/impressions/CTR/position per post and query), GA4 engagement, 7/30/90-day checkpoints, trend arrows, alert rules (CTR below position benchmark → rewrite title; two-period decline → refresh).
5. **Site Health** — scheduled PageSpeed/Lighthouse audits, URL Inspection index status, sitemap checks, custom lightweight crawler (broken links, missing alt text, H1 issues).
6. **Outreach CRM** — prospect pipeline (`Found → Qualified → Contacted → Followed Up → Replied → Published → Link Live`), auto-computed next-action dates, Gmail API reply detection, link-live + rel-attribute verification, CAN-SPAM-safe defaults.
7. **Refresh Engine** — quarterly triage queue: update / rewrite / redirect decisions driven by tracked KPIs.

### Data sources — all free tiers

| API | Used for | Free limit | Auth |
|---|---|---|---|
| GSC Search Analytics | rankings, queries, CTR | 1,200 QPM | OAuth |
| GSC URL Inspection | index status, rich results | 2,000/day | OAuth |
| GA4 Data API | engagement per post | 200k tokens/day | OAuth |
| Blogger API v3 | post CRUD, scheduling | ~10k/day | OAuth |
| PageSpeed Insights | Core Web Vitals | 25k/day | API key |
| Bing Webmaster | Bing data, keyword volumes, URL submit | generous | API key |
| Google autocomplete | keyword expansion | unofficial, throttled | none |
| Gemini Flash | briefs, titles, schema | ~1,500 req/day | API key |
| Serper.dev (optional) | exact SERP positions, PAA | 2,500 one-time | API key |
| Gmail API (outreach) | send + reply detection | 500 recipients/day (account limit) | OAuth |

### Deliberately excluded (research verdict)

- **Google Custom Search JSON API** — closed to new users, shuts down Jan 1, 2027.
- **Google Indexing API** — officially JobPosting/Broadcast only; abuse risks penalties.
- **pytrends / Google Trends scraping** — dead/ToS-violating; official Trends API is application-gated alpha (worth applying, not a dependency).
- **X/Twitter API** — no free tier for new developers since Feb 2026; manual entry fallback instead.

## Open questions

1. **Blog details** — custom domain or `.blogspot.com`? One blog or several? (Research says custom domain matters a lot for ranking.)
2. **"Contact" scope** — is the outreach CRM (contacting other blogs for guest posts/backlinks) in scope for v1, or content-only first?
3. **Hosting** — where should this run? Options: (a) free-tier cloud host (e.g. Cloudflare Workers/Pages, Railway, Render) with a small DB, (b) Google Apps Script + Google Sheets (zero hosting cost, native Google auth, but limited UI), (c) local desktop app.
4. **Stack preference** — Node/TypeScript, Python, or Apps Script? (Recommendation: Node/TypeScript web app, or Apps Script if you want zero-cost + Sheets as the DB.)
5. **AI writing** — should the tool draft content with Gemini, or only generate briefs/outlines/titles and leave writing to you? (Research warning: scaled AI content is what Google demotes; briefs + human writing is the safe pattern.)

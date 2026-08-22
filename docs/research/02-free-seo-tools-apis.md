# Free & Free-Tier Third-Party SEO Tools/APIs for a Blogger Automation Dashboard

**Research date: August 2026.** For each tool: what it does, API availability, verified free-tier limits, and integration difficulty (Easy = REST + key, Moderate = OAuth or quirks, Hard = no API / scraping required).

---

## 1. Rank Tracking

### Google Search Console API — **the recommended primary rank source**
- **What**: Official Google data — queries, clicks, impressions, average position per page/query/country/device for your verified property. Blogger blogs verify trivially — built-in GSC linkage under Blogger Settings.
- **API**: Yes — Search Analytics API (REST, OAuth 2.0 or service account).
- **Free limits**: Entirely free. Up to 50,000 rows/day per search type per property; 1,200 QPM; data lags 2–3 days.
- **Caveat vs SERP APIs**: GSC only shows *average* position for queries that actually got impressions — no arbitrary-keyword tracking, no competitor tracking, no real-time SERP position. GSC should be the backbone; a SERP API free tier fills the "track these exact keywords daily" gap.
- **Integration**: Moderate (OAuth flow), then easy. Best free option, period.

### SERP API providers (free tiers, verified)
| Provider | Free tier | Paid after | Notes |
|---|---|---|---|
| **Serper.dev** | **2,500 free credits, one-time** (no card) | Prepaid packs from $50 = 50k credits; credits expire in 6 months | Cheapest mainstream option; 1 credit = up to 10 results, 2 credits for 11–100 results. Fast JSON, simple REST. **Easy** |
| **SerpApi** | ~100 searches/month recurring | $25/mo for 1,000 searches | Richest parsing (PAA, related searches, autocomplete). Most expensive per search. Currently being sued by Google. **Easy** |
| **DataForSEO** | $1 trial credit (no recurring free tier) | Pay-as-you-go, $50 min deposit; SERPs $0.60/1k standard | Best value at scale; also keyword data, backlinks, on-page APIs. **Easy–Moderate** |
| **Zenserp** | 50 searches/month recurring | From ~$50/mo | Small but genuinely recurring free tier. **Easy** |
| **ValueSERP / Scale SERP** | Trial only | From ~$50/mo | Merged into trajectdata.com. **Easy** |

**Practical free strategy**: GSC API for real ranking data + Serper's 2,500 credits (or Zenserp's 50/mo) for a small set of "money keywords" checked weekly. 20 keywords × weekly × num=100 ≈ 160 Serper credits/month — the one-time 2,500 lasts over a year.

### Legality / ToS
- Scraping Google directly (or via any SERP API) violates Google's ToS. Risk = IP blocks, not realistically lawsuits, but not "clean."
- 2026 development: Google sued SerpApi; in July 2026 a US federal court dismissed Google's DMCA claim, but the case continues. GSC + Bing Webmaster APIs are the only fully sanctioned rank sources.

---

## 2. Keyword Research

- **Google autocomplete endpoint (`suggestqueries.google.com/complete/search?client=firefox&q=...`)** — still works in 2026, undocumented. Free, no key, JSON suggestions. Must be called server-side (no CORS); throttle or get blocked. Same trick for YouTube (`ds=yt`). **Easy**, zero cost — the best free keyword-expansion primitive (append a–z, prefixes, question words to a seed).
- **Bing Webmaster Tools Keyword Research** — see §6; free **exact** volumes, question filter, API method (`GetRelatedKeywords`). Best legitimate free keyword-volume API.
- **Google Keyword Planner** — bucketed ranges without ad spend; API requires developer token + approval — **Hard**, generally not worth it.
- **Keyword Surfer** (Chrome extension) — free, actively updated; volumes/CPC in SERPs. **No API** — companion tool only.
- **Ubersuggest free** — 3 searches/day web, 1 project, 25 tracked keywords. Paid API only. Companion status.
- **WordStream Free Keyword Tool** — free web tool, no API. Companion only.
- **Keyword Sheeter** — free UI over the same autocomplete endpoint you can call yourself.
- **AnswerThePublic** — free: 3 searches/day, no volume data on free. No API. Companion only.
- **AlsoAsked** — PAA tree visualizer. Free: 3 searches/day; API on paid plans only ($12/mo+). Companion only.
- **People Also Ask programmatically** — best sourced from SERP API calls: SerpApi, Serper, DataForSEO all return PAA boxes + related searches inside normal responses — rank-check calls double as PAA harvesting. **Easy.**

---

## 3. Backlink Data

- **Ahrefs Webmaster Tools (AWT)** — free forever for **verified** sites: backlink profile, Site Audit, keyword rankings, Domain Rating. **Works with Blogger**: GSC-import and meta-tag verification both work on blogspot.com. **No API on free tier** — manual CSV exports or link out. **Hard** to integrate, but the best free backlink *data*.
- **Moz Link Explorer / Links API** — free account: ~10 queries/month web; **Links API has a tiny genuinely free tier** (~25 queries/50 rows per month, 1 req/10s). Paid API from $20/mo. **Easy** for a monthly "DA + top links" snapshot.
- **OpenLinkProfiler** — alive in 2026; free, no signup; up to 200k links viewable, CSV of 100k. No API; smaller index. Manual supplement.
- **Majestic** — free tier minimal; API only on $99.99/mo plan. Skip.
- **DataForSEO Backlinks API** — no free tier beyond $1 trial, but ~$0.05 per 1,000 backlink rows means $50 covers a year of monthly pulls. **Easy**, best "nearly free" programmatic backlink source.
- Also free: **GSC Links report** (manual export only, no API) and **Bing Webmaster `GetUrlLinks`** — free and programmatic.

---

## 4. On-Page / Technical SEO

- **Google PageSpeed Insights API** — free, **25,000 requests/day** with API key. Lighthouse scores + CrUX Core Web Vitals. **Easy** — must-have integration.
- **Screaming Frog SEO Spider** — free: **500 URLs per crawl** (covers a typical Blogger blog). Desktop only, CLI in paid version. **Hard** to integrate into a hosted dashboard; operator tool.
- **Custom crawler** — Blogger's HTML is predictable; a lightweight crawler (sitemap.xml → fetch pages → check titles/meta/headings/alt text/broken links) is very feasible and free. Plus GSC **URL Inspection API** (2,000/day) for index status per URL.
- **Readability**: use an open-source library (`textstat` in Python, `text-readability` in JS) for Flesch-Kincaid etc. Free, offline, **Easy**.
- **Schema generators**: generating JSON-LD (Article, BreadcrumbList, FAQ) is templateable in your own code; validate manually via Rich Results Test web UI (no API).

---

## 5. Content Optimization

- **Genuinely free**: Hemingway Editor web app (no API — replicate core checks with open-source libs); Semrush SEO Writing Assistant (free Google Docs add-on); Keyword Surfer extension.
- **NeuronWriter** — limited free plan (1 project, ~3 analyses/month). No public API on free tier. Companion only.
- **Frase** — trial only now, no free tier. Skip.
- **LSIGraph** — 3 searches/day; LSI is largely debunked; autocomplete + PAA give better related terms free.
- **Honest assessment**: no free tool replicates SurferSEO. The free-dashboard approach: pull top-10 competitors from SERP API, extract headings/entities yourself, add readability scoring + Gemini free tier for suggestions ≈ 70% of Surfer for $0.

---

## 6. Bing Webmaster Tools — underrated free pillar

- Free with any verified site (meta tag works on Blogger; or **one-click import from GSC**).
- **Real, free API** (API key, no OAuth): `GetQueryStats` (Bing clicks/impressions/position), `GetPageStats`, `GetRankAndTrafficStats`, **`GetRelatedKeywords`** (exact Bing volumes by country/language/date), `GetUrlLinks` (inbound links), `SubmitUrlBatch` (up to 10,000 URLs/day for established sites; supports IndexNow), crawl stats. Endpoint style: `https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=...&apikey=...`.
- Bing volume ≈ 3–10% of Google's, but relative data and question sets transfer well; the only fully sanctioned free keyword-volume API. **Easy — strongly recommend integrating.**

---

## 7. Uptime / Engagement Monitoring

- **UptimeRobot** — free: 50 monitors, 5-min checks, free REST API. **Easy.** (Alternatives: exit1.dev, StatusCake, Freshping.)
- **Microsoft Clarity** — free forever, no traffic limits: session recordings, heatmaps, rage/dead-click detection. Works on Blogger via `<head>` script. Data Export API (project-level, last 3 days). **Easy–Moderate.**
- **Google Analytics 4** — free; native Blogger field; Data API free. **Moderate** (OAuth). Pairs with GSC for a "CTR opportunities" view.

---

## 8. AI APIs

- **Gemini API free tier** (Google AI Studio key, no card): ≈ Gemini Flash 1,500 requests/day free (Pro ~25–100/day). Resets midnight Pacific. Free-tier data may be used for training — fine for SEO suggestions. **Easy** — natural fit for title/meta suggestions, content briefs from PAA data, outline generation.

---

## Recommended $0 architecture

**Core APIs (all free, all sanctioned)**: Blogger API v3 (posts) + GSC Search Analytics API (rankings/CTR) + URL Inspection API (index status) + Bing Webmaster API (Bing rankings, keyword volumes, URL submission) + PageSpeed Insights API (CWV) + GA4 Data API (engagement) + Gemini Flash free tier (AI assist) + UptimeRobot API (uptime) + suggestqueries autocomplete (keyword expansion, server-side, throttled).

**Near-free add-ons**: Serper 2,500 one-time credits or Zenserp 50/mo (exact SERP positions + PAA), Moz free API (monthly DA check), DataForSEO $50 deposit (backlinks at ~$0.05/1k rows).

**Companion tools (no API, link out)**: Ahrefs Webmaster Tools, Screaming Frog free, AnswerThePublic/AlsoAsked, Hemingway, Microsoft Clarity dashboard.

## Sources

- https://costbench.com/software/web-scraping/serpapi/free-plan/
- https://apiserpent.com/blog/serpapi-pricing-explained
- https://coldiq.com/blog/serper-pricing
- https://apiserpent.com/blog/serper-pricing-credits-explained
- https://dataforseo.com/apis/serp-api/pricing
- https://dataforseo.com/pricing/backlinks/backlinks
- https://coldiq.com/tools/zenserp
- https://www.searchcans.com/blog/google-search-console-api-limits-explained/
- https://www.seroundtable.com/google-sues-serpapi-40631.html
- https://almcorp.com/blog/serpapi-google-lawsuit-motion-dismiss-web-scraping-dmca/
- https://www.fullstackoptimization.com/a/google-autocomplete-google-suggest-unofficial-full-specification
- https://ubersuggest.zendesk.com/hc/en-us/articles/9704437892635-Free-Account-Key-Features-and-Limits
- https://answerthepublic.zendesk.com/hc/en-us/articles/22617503900187-AnswerThePublic-Free-Plan-Features-Limits-Upgrade-Guide
- https://alsoasked.com/pricing
- https://ahrefs.com/webmaster-tools
- https://help.ahrefs.com/en/articles/3275938-verifying-ownership-of-your-project-or-website
- https://busyless.space/seo-apis/moz
- https://thatmarketingbuddy.com/pricing/screaming-frog
- https://www.debugbear.com/blog/pagespeed-insights-api
- https://bing-webmaster-api.analyticsedge.com/getquerystats/
- https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getrelatedkeywords?view=bing-webmaster-dotnet
- https://hemingwayapp.com/help/support-articles/billing-faqs
- https://growthlane.marketing/blog/free-surferseo-alternatives-best-free-content-optimization-tools-2026
- https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan
- https://clarity.microsoft.com/
- https://aipromptshub.co/blog/gemini-api-free-tier-rate-limits

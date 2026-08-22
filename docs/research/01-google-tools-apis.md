# Free Google Tools for Blogger SEO Automation — Programmatic Access Research (August 2026)

**Context:** Findings for building an automation tool around a Google Blogger (blogspot.com or custom-domain) blog. Ratings at the end of each section: usefulness for (a) rank tracking, (b) keyword research, (c) content performance, (d) technical SEO.

---

## 1. Google Search Console (GSC) — ⭐ The backbone of the tool

**What it does:** Reports how Google Search sees the site: queries, clicks, impressions, CTR, average position (16 months of data), index coverage, sitemaps, mobile usability, rich result status, manual actions.

**Works with Blogger?** Yes, fully. A blogspot.com subdomain can be added as a URL-prefix property (`https://yourblog.blogspot.com/`), and Blogger blogs owned by the same Google account are typically auto-verified. Blogger auto-generates `sitemap.xml` (paginated per 500 posts) and `sitemap-pages.xml`, which can be submitted via API.

**API surface** (`searchconsole.googleapis.com` / Webmasters API v3):
- **Search Analytics** (`searchanalytics.query`): clicks/impressions/CTR/position by query, page, country, device, date, search appearance; filters and regex supported; up to **25,000 rows per request**, ~50,000 rows/day/property practical export ceiling.
- **URL Inspection API** (`urlInspection.index.inspect`): index status, canonical, last crawl, mobile usability, **rich results/structured data verdicts**, AMP status — for URLs in a verified property.
- **Sitemaps API**: list, get, submit, delete sitemaps.
- **Sites API**: list/add/remove properties.
- Not exposed via API: Core Web Vitals report, full Page Indexing (coverage) report, Discover data (Discover *is* in Search Analytics with `type=discover`), manual actions detail.

**Auth:** OAuth 2.0 (scopes `webmasters` or `webmasters.readonly`) or a service account added as a user on the property. API key alone is not enough.

**Quotas (free, official):**
- Search Analytics: per-site and per-user **1,200 QPM**; also short-term (10-min) and daily load quotas.
- **URL Inspection: 2,000 queries/day per property** (shared by all users/tools inspecting that property) + 600 QPM.
- All quotas are free; no paid tier exists.

**Usefulness:** (a) Rank tracking: **excellent** — real average positions per query/page (the only legitimate free source of Google ranking data, though it's averaged, not live SERP snapshots). (b) Keyword research: **very good** — reveals actual queries the blog already ranks for, impression opportunities, low-CTR targets. (c) Content performance: **excellent** (search-side). (d) Technical SEO: **very good** — indexing status per URL, sitemap health.

---

## 2. Google Analytics 4 (GA4)

**Blogger integration:** Native. Blogger Settings → Basic → "Google Analytics Measurement ID" — paste the `G-XXXXXXX` ID and Blogger injects the Google tag on all pages. No template editing needed (works even on classic themes; for heavily customized themes the gtag can be added manually).

**API surface:**
- **Data API v1** (`analyticsdata.googleapis.com`): `runReport`, `runRealtimeReport`, `batchRunReports`, funnel/pivot reports. Dimensions/metrics that matter for a blog: `pagePath`, `sessionDefaultChannelGroup` (Organic Search), `sessionSource/Medium`, `landingPage`, metrics: `screenPageViews`, `sessions`, `engagedSessions`, `engagementRate`, `averageSessionDuration`, `userEngagementDuration`, `totalUsers`, `newUsers`, event counts (scroll, outbound clicks).
- **Admin API v1**: property/stream management.

**Auth:** OAuth 2.0 (`analytics.readonly`) or service account added as a viewer on the GA4 property.

**Free quotas (Data API, standard property — token-based):**
- **200,000 tokens/day** and **40,000 tokens/hour per property** (raised 8× from the old 25k/5k limits); ~10 concurrent requests; realtime has a separate bucket. Most simple reports cost <10 tokens, so this is ample for a single blog. Project-level: 50,000 requests/day, 10 QPS/IP.

**Usefulness:** (a) Rank tracking: none. (b) Keyword research: minimal (query data lives in GSC). (c) Content performance: **excellent** — engagement, traffic sources, per-post behavior. (d) Technical SEO: minor.

---

## 3. Blogger API v3 + Blogger Feeds

**API v3 capabilities** (`blogger.googleapis.com`):
- **Blogs:** get by ID/URL, listByUser.
- **Posts:** list, get, getByPath, search, **insert, update, patch, delete, publish, revert (to draft)**. `insert` supports `isDraft`; `publish` accepts an optional `publishDate` for **scheduling**. Posts carry title, HTML content, labels, custom permalink, location.
- **Pages:** list, get, insert, update, patch, delete.
- **Comments:** list, get, approve, delete, markAsSpam, removeContent (moderation — **no comment creation** via API).
- **Users:** get, PostUserInfos.

**Auth model:** API key suffices for **read-only public data**; OAuth 2.0 (`https://www.googleapis.com/auth/blogger`) required for any write and for drafts/scheduled posts. Note community reports that listing scheduled/draft posts via API is flaky.

**Quotas:** Default ~**10,000 requests/day per project**. Separately there is an **undocumented per-blog daily post-creation cap** (~50/day territory) — bulk-creating posts trips 403 "Rate Limit Exceeded" even with API quota remaining, plus spam/CAPTCHA gates. Design the tool to post at human-like rates.

**Known limitations:** **No media/image upload endpoint** — images must be hosted elsewhere and referenced by URL in post HTML; no template/theme editing; no site-settings endpoints; no analytics data.

**Feeds (no-auth data source):** Every blog exposes Atom/RSS feeds — `/feeds/posts/default` (Atom), `?alt=rss`, `?alt=json` for JSON; also `/feeds/comments/default`, per-post comment feeds, and label feeds (`/feeds/posts/default/-/LabelName`). Parameters: `max-results` (1–500, default 25), `start-index`, `published-min/max`, `updated-min/max`, `orderby`. Response capped ~512 KB. Ideal for zero-auth content inventory, freshness audits, and internal-link analysis.

**Usefulness:** (a)/(b): none. (c) Content performance: indirect (content inventory to join against GSC/GA4 data — the glue of the whole tool). (d) Technical SEO: good — audit titles, labels, permalinks, publish cadence; automate content workflow (draft → schedule → publish).

---

## 4. Google Trends

**Official API status:** Google announced the **Google Trends API (alpha)** on July 24, 2025. As of mid-2026 it is **still an application-gated alpha**. What it offers: consistently scaled search-interest data, **5 years (1,800 days)** of history, daily/weekly/monthly/yearly aggregation, region/sub-region breakdowns. Worth applying, but do not build the tool's critical path on it.

**pytrends:** effectively **dead** — repo archived April 17, 2025; fresh installs throw 429 errors. All scraping-based options violate Google ToS and are fragile.

**Practical free alternatives:** Trends CSV export / RSS of trending searches (manual), the Trends website embed widgets, or keyword signal from GSC impressions instead.

---

## 5. PageSpeed Insights API / Lighthouse

**What it does:** Runs Lighthouse (lab data: performance/accessibility/SEO/best-practices scores, LCP, CLS, TBT, diagnostics) and returns **CrUX field data** (real-user Core Web Vitals) when available.

**API:** `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=...&strategy=mobile` — REST, returns full Lighthouse JSON + CrUX data.

**Auth:** **API key only** (no OAuth); completely free, no billing account required.

**Quotas:** **25,000 queries/day**, 400 queries/100 seconds with an API key.

**Caveat for Blogger:** low-traffic blogspot subdomains often have **no CrUX field data** — you'll get lab data only.

**Usefulness:** (d) Technical SEO: **excellent** — automated Core Web Vitals monitoring per post URL, plus Lighthouse's SEO audit category.

---

## 6. Google Keyword Planner (via Google Ads API)

**Reality check:** There is **no standalone Keyword Planner API**. Access is through the **Google Ads API** `KeywordPlanIdeaService` (`GenerateKeywordIdeas`, `GenerateKeywordHistoricalMetrics`).

**Requirements chain (all free but heavy):** Google Ads manager account → developer token → apply for Basic access → OAuth 2.0 against a real Google Ads client account. No ad spend is required, but accounts with little/no spend get **search-volume ranges instead of precise volumes**.

**Rate limits:** ~1 QPS / 60 requests per minute for keyword-planning services.

**Verdict:** Feasible but the highest-friction integration in this list. Alternative: mine GSC queries + Google Autocomplete for zero-cost keyword ideas.

---

## 7. Custom Search JSON API — ⚠️ Dying

Google **closed the Custom Search JSON API to new customers in 2025** and will **shut it down January 1, 2027**. New projects cannot sign up. Even when alive, its rankings never matched real google.com SERPs. **Do not build rank checking on this.** Use GSC average position instead.

---

## 8. Indexing API — ⚠️ Not for blogs

Official scope: only `JobPosting` and `BroadcastEvent` pages. Google added spam warnings, runs spam detection on submissions, and abuse risks revoked access. **Recommendation: exclude from the tool.** Use sitemaps + Bing URL Submission instead.

---

## 9. Rich Results Test / Schema Validation

**No public API.** Programmatic options:
1. **URL Inspection API (GSC)** — returns `richResultsResult` verdicts for indexed URLs in a verified property. The official programmatic path (within the 2,000/day quota).
2. Local validation: parse JSON-LD yourself (Blogger themes emit `BlogPosting` markup).

---

## 10. Bonus: Bing Webmaster Tools, IndexNow

**Bing Webmaster Tools API:** Free and notably easy: **API key** (no OAuth) covering all verified sites. Endpoints include `GetQueryStats`, `GetRankAndTrafficStats`, crawl stats, `SubmitUrlBatch` (~1,000 URLs/day), `GetUrlSubmissionQuota`. Blogspot blogs verify via meta tag or GSC import. A genuinely useful free secondary data source.

**IndexNow + Blogger:** No native Blogger support; the key-file requirement is the blocker on blogspot.com. On a custom domain behind Cloudflare it works. On plain blogspot.com the practical choice is the **Bing URL Submission API**.

**Google Business Profile API:** application-gated, irrelevant for a typical Blogger blog — skip.

---

## Summary matrix

| Tool | API? | Auth | Free quota | Rank track | KW research | Content perf | Tech SEO |
|---|---|---|---|---|---|---|---|
| Search Console | Yes | OAuth / service acct | 1,200 QPM; URL inspect 2,000/day | ★★★ | ★★☆ | ★★★ | ★★★ |
| GA4 Data API | Yes | OAuth / service acct | 200k tokens/day | — | ★☆☆ | ★★★ | ★☆☆ |
| Blogger API v3 | Yes (posts CRUD) | API key (read) / OAuth (write) | ~10k req/day + per-blog post cap | — | — | ★★☆ (glue) | ★★☆ |
| Blogger feeds | Atom/RSS/JSON | none | unmetered | — | — | ★★☆ | ★★☆ |
| Google Trends | Alpha, gated | application | unknown | — | ★★☆ if admitted | — | — |
| PageSpeed Insights | Yes | API key | 25,000/day | — | — | ★☆☆ | ★★★ |
| Keyword Planner | Via Google Ads API | Dev token + OAuth | 15k ops/day | — | ★★☆ (ranges) | — | — |
| Custom Search JSON | Dies 2027-01-01 | — | closed | ✗ avoid | — | — | — |
| Indexing API | JobPosting only | Service acct | 200/day | — | — | — | ✗ policy risk |
| Bing Webmaster | Yes | Simple API key | ~1k URL/day | ★☆☆ (Bing) | ★☆☆ | ★☆☆ | ★★☆ |

**Recommended architecture:** GSC Search Analytics + URL Inspection as the SEO data core; GA4 Data API for engagement; Blogger API v3 + feeds for content workflow/inventory; PageSpeed Insights API for scheduled CWV audits; Bing Webmaster API as free secondary source; apply for Trends alpha opportunistically; skip Custom Search, Indexing API, and GBP.

## Sources

- https://developers.google.com/webmaster-tools/limits
- https://www.searchcans.com/blog/google-search-console-api-limits-explained/
- https://www.incremys.com/en/resources/blog/google-search-console-quota
- https://developers.google.com/analytics/devguides/limits-and-quotas
- https://upbuild.app/blog/ga4-api-quota-limits
- https://scandiweb.com/blog/ga4-api-quota-apocalypse-and-how-to-survive-it/
- https://support.google.com/analytics/answer/14854594
- https://developers.google.com/blogger
- https://support.google.com/blogger/thread/124619366/blogger-api-v3-quota-limits
- https://github.com/googleapis/google-api-nodejs-client/issues/2354
- https://xmlexpr.blogspot.com/2025/03/blogger-feed-api-summary.html
- https://www.danpros.com/post/blogger-json-feed-api
- https://developers.google.com/search/blog/2025/07/trends-api
- https://scrapebadger.com/blog/does-google-trends-have-an-api-what-to-use-in-2026
- https://github.com/GeneralMills/pytrends/issues/602
- https://unlighthouse.dev/learn-lighthouse/pagespeed-insights-api
- https://www.debugbear.com/blog/pagespeed-insights-api
- https://developers.google.com/google-ads/api/docs/keyword-planning/overview
- https://developers.google.com/google-ads/api/docs/api-policy/access-levels
- https://developers.google.com/custom-search/v1/overview
- https://brave.com/learn/google-api-shutdown/
- https://developers.google.com/search/apis/indexing-api/v3/quickstart
- https://www.searchenginejournal.com/google-adds-spam-warning-to-indexing-api-documentation/526839/
- https://www.schemacheck.dev/comparisons/google-rich-results-test-alternative
- https://blogs.bing.com/webmaster/november-2019/Accessing-Bing-webmaster-tools-api-using-cURL
- https://www.bing.com/indexnow/getstarted
- https://www.narendradwivedi.org/2025/09/how-to-use-indexnow-on-blogger.html
- https://bloggertipandtrick.net/submit-blogger-sitemap-google-search-console/

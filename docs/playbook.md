# The Blogger SEO Playbook

A practical, step-by-step guide answering: where keywords come from, how to select them, what intent is, the full content lifecycle, how to learn from first-page competitors, free backlinks, indexing and fixing issues, growing earnings, mining your own Search Console data, autocomplete harvesting, and outreach. This is the manual the tool automates.

---

## 1. Where keywords come from (7 free sources)

Ranked by value for a small blog:

| # | Source | What you get | How |
|---|---|---|---|
| 1 | **Your own Search Console** | Queries where Google *already* shows your blog — the easiest wins that exist | GSC → Performance → Queries (or the API). See §9 for exact recipes. |
| 2 | **Google Autocomplete** | Real phrases people type, including long-tails no tool shows | See §10 — the a–z / question-word method. |
| 3 | **People Also Ask (PAA)** | The exact questions searchers ask around a topic | Search the keyword, expand PAA boxes (each click loads more); or automatically via a SERP API. |
| 4 | **First-page competitors** | Every keyword their ranking posts target | See §5 — extract their titles, headings, and topics. |
| 5 | **Bing Webmaster Keyword Tool** | Exact search volumes free (Google only gives ranges without ad spend) | Verify your site in Bing WMT (one-click import from GSC) → Keyword Research. Bing volume ≈ 3–10% of Google, but *relative* popularity transfers. |
| 6 | **Reddit / Quora / Facebook groups in your niche** | Questions real people ask that have no good answer yet — zero-competition topics | Search `site:reddit.com your topic`; sort niche subreddits by top posts. |
| 7 | **Related Searches** (bottom of Google results) | The searcher's "next question" — good for cluster posts and internal links | Bottom of any SERP; also returned by SERP APIs. |

**Rule:** never start from "what do I want to write" — always start from "what are people already searching for."

---

## 2. How to select which keywords to target (the funnel)

Run every candidate keyword through this 5-gate funnel. A keyword must pass ALL gates:

### Gate 1 — Relevance
Can you write this post honestly, and does it fit your blog's niche? Off-niche posts hurt the whole site under Google's Helpful Content system (it's a site-wide signal).

### Gate 2 — Intent match (see §3)
Google the keyword. Look at what type of pages rank. If the first page is all product pages and you want to write a blog article — skip it. Blog posts win informational SERPs, not transactional ones.

### Gate 3 — Difficulty (can a small blog actually win?)
You don't need a paid tool. Google the keyword and check the first page for these **green lights**:
- ✅ Reddit, Quora, or forum threads ranking in the top 10
- ✅ Pages that only partially answer the query (intent mismatch)
- ✅ Thin content (< 800 words) or old dates (2+ years, outdated info)
- ✅ Small/unknown sites ranking (if one small blog ranks, yours can too)
- ✅ No exact-title match — nobody wrote *this exact* article yet

**Red lights** (skip the keyword for now):
- ❌ Top 10 is all big brands (Wikipedia, Forbes, WebMD, big publishers)
- ❌ Every result is a comprehensive, recent, well-made page
- ❌ SERP is dominated by videos, shopping results, or tools when you're writing text

### Gate 4 — Traffic potential
Prefer keywords that are the "head" of a family: one post can rank for the main phrase plus dozens of long-tail variants. Check autocomplete — if a keyword has many suggested variations, the family is big. Don't obsess over exact volume; a "0 volume" long-tail often brings hundreds of visits because tools can't measure long-tails well.

### Gate 5 — Value to you
Will this traffic do anything — earn (high-RPM topic, affiliate potential), build authority in your cluster, or attract links? Prioritize keywords that serve the blog's goal, not vanity traffic.

### The scoring shortcut the tool implements
For each keyword score 0–2 on: Relevance, Intent-fit, Winnability, Traffic potential, Value → 0–10 total.
**Target 8+ first. Never write for anything under 6.**

**Long-tail first strategy for a new blog:** target 4+ word phrases ("best budget gaming laptop under 50000 in pakistan" not "gaming laptop"). Long-tails are ~92% of all searches, far easier to win, and after ~20 interlinked posts on one topic you start ranking for the bigger head terms automatically (topical authority).

---

## 3. What is search intent (and why it decides everything)

Intent = **why** the person typed the query. Four types:

| Intent | The searcher wants... | Query clues | Content that ranks |
|---|---|---|---|
| **Informational** | to learn something | how, what, why, guide, tutorial, meaning, ideas | Blog post, guide, tutorial ← **your main territory** |
| **Commercial** | to compare before buying | best, top, review, vs, comparison, cheap | Listicle, review, comparison post ← **your money territory** |
| **Transactional** | to buy/do now | buy, price, discount, download, near me | Product/store pages — blogs rarely win these |
| **Navigational** | a specific site | brand names, login, "youtube" | The brand's own site — never target |

**How to detect intent: just Google it.** Whatever page type fills the first page IS the intent, as Google measured it from billions of clicks. Don't argue with the SERP.

**Why it decides everything:** intent determines format (guide vs listicle vs review), angle, length, and even whether to write the post at all. The #1 reason a well-written post never ranks is intent mismatch.

---

## 4. The full content lifecycle (idea → earnings)

Every post moves through 9 stages. This is the tool's pipeline:

```
IDEA → RESEARCHED → BRIEFED → DRAFTED → OPTIMIZED → PUBLISHED → INDEXED → TRACKING → REFRESHED
```

### Stage 1 — IDEA
Keyword arrives from any §1 source. Log it with: keyword, source, guessed intent.

### Stage 2 — RESEARCHED (30–45 min, the tool automates most of it)
1. Run the §2 funnel — score it. Below 6 → archive, move on.
2. Full SERP analysis (§5): top 10 formats, lengths, angles, dates.
3. Collect all PAA questions + related searches + autocomplete variants.
4. Gather raw information: official sources, data, Reddit threads with real experiences, YouTube comments (people say what articles didn't answer), your own experience/tests/photos.

### Stage 3 — BRIEFED
Produce a one-page brief: target keyword + 3–8 secondary keywords · intent · format · working title · H2/H3 outline (PAA questions as H2s) · target length (SERP median ±20%) · **the gap**: 2–3 things your post will have that NO current first-page result has · internal links planned (to + from) · schema type.

### Stage 4 — DRAFTED
- Answer the query directly in the first 100 words (keyword appears naturally).
- Follow the outline. Short paragraphs (2–4 lines), lists, tables.
- Include the gap items — your original experience, data, photos, examples. This "information gain" is the strongest quality signal in 2026 and the only thing AI Overviews can't replace.
- Write like a person who did the thing, not an encyclopedia. First person is good.
- FAQ section at the end from remaining PAA questions.

### Stage 5 — OPTIMIZED (the pre-publish gate — the tool blocks publishing until all pass)
- [ ] Title 40–60 characters, keyword near the front, one CTR device (number, bracket, year, benefit)
- [ ] Search Description filled (~150 chars, keyword + benefit) — Blogger's per-post box
- [ ] **Custom permalink set BEFORE publishing** (Blogger cannot change it after!) — short, keyword-only
- [ ] One H1 only (post title); H2/H3 hierarchy correct
- [ ] 3–6 internal links per 1,000 words to related posts
- [ ] 2–3 older posts edited to link TO this new post
- [ ] 2–5 external links to authoritative sources
- [ ] Images: compressed, descriptive filenames, alt text
- [ ] JSON-LD schema generated (Article + FAQPage if FAQ present)
- [ ] Reading check: no fluff intro, mobile preview OK

### Stage 6 — PUBLISHED
Publish via Blogger (or the API). Same-day: request indexing in GSC (URL Inspection → Request Indexing), confirm the sitemap has the URL, share to your social channels / groups.

### Stage 7 — INDEXED
Check day 2–7 via URL Inspection. If "Discovered – currently not indexed" after 2 weeks → see §7 fixes.

### Stage 8 — TRACKING (see §9)
- **Day 7:** indexed? impressions starting?
- **Day 30:** which queries is it showing for? Average position? Add those exact queries into the post text if missing.
- **Day 90:** full verdict — clicks, CTR vs position benchmark, engagement. Act on alerts (§9).

### Stage 9 — REFRESHED
Every quarter, triage: **Update** (still relevant → refresh data, add new PAA sections, improve title), **Rewrite** (never ranked → new brief, same URL), or **Redirect** (dead/duplicate topic → 301 to the better post via Blogger custom redirects). Updating old posts is the highest-ROI work in blogging: ~76% of traffic comes from existing posts, and refreshes average +106% traffic.

---

## 5. Getting help from first-page competitors

The blogs already on page 1 did your homework for you. Extract it:

### Per-keyword (before writing each post)
1. **Search your keyword** (incognito, or via SERP API for clean results).
2. For each top-10 result record: title pattern · format · word count (rough) · publish/update date · headings (H2/H3) · what they cover · what they miss.
   - Free heading extraction: open the page → right-click → View source → search `<h2` — or the tool fetches and parses automatically.
3. **Build the union of all their headings** → your outline covers everything any of them covers.
4. **Find the gap** → read the Reddit/PAA questions they DON'T answer; check comments on their posts for complaints ("this didn't explain X"). That gap is your angle.
5. **Beat them on one measurable thing**: more recent, more complete, better examples, real photos, a table they don't have, local relevance (e.g. prices in PKR for Pakistani readers if that's your audience).

### Per-competitor (monthly)
1. Identify 3–5 blogs repeatedly ranking in your niche at your size (not Forbes — blogs you can realistically match).
2. Read their sitemap/feed (`site.com/sitemap.xml`, or for Blogger competitors `/feeds/posts/default?alt=json`) → their full topic list = a keyword list someone already validated.
3. Every topic they rank for that you haven't covered = a pre-qualified idea for your pipeline.
4. Their internal-linking structure shows you how they build topic clusters — copy the structure, not the content.
5. Check who links to them (Ahrefs Webmaster Tools free / OpenLinkProfiler) → those sites accept links from blogs like yours = outreach prospects (§11).

**Never copy content.** Copy the *decisions*: topics, formats, structures, sources.

---

## 6. Free backlinks that actually work

*(filled from dedicated research — see docs/research/05-earnings-and-backlinks.md)*

See section 6 of the research doc for the ranked list, what to avoid, and realistic monthly numbers.

---

## 7. Indexing and fixing issues

### How indexing works for a Blogger blog
Google finds URLs via your **sitemap** (`yourblog.com/sitemap.xml` — Blogger auto-generates it; submit once in GSC) and via **links**. New posts on small blogs take days to weeks to index naturally; internal links from already-indexed posts speed it up most.

### The issue → fix table (what the tool checks and recommends)

| GSC status / issue | What it means | Fix |
|---|---|---|
| **Discovered – currently not indexed** | Google knows the URL, hasn't bothered crawling | Add 2–3 internal links from your strongest posts; improve the content; Request Indexing; wait 1–2 weeks |
| **Crawled – currently not indexed** | Google read it and decided it's not worth indexing (quality verdict) | This is a content problem: make it more unique/useful (add the §4 information-gain items), then re-request |
| **Duplicate without user-selected canonical** | Two of your URLs look the same (common with Blogger `?m=1` mobile URLs — usually safe to ignore for those) | For real duplicates: consolidate to one post + custom redirect |
| **Not found (404)** | Deleted post still linked somewhere | Blogger Settings → Errors & redirects → add custom redirect to the closest related post |
| **Redirect error / chains** | Multiple hops | Point every link/redirect directly at the final URL |
| **Soft 404** | Page exists but looks empty/thin to Google | Add real content or redirect it away |
| **Blocked by robots.txt** | Your custom robots.txt blocks it | Fix robots.txt (only archive/search pages should be noindexed) |
| **Page with redirect** | URL redirects (http→https, ?m=1) | Normal — no action |
| **Indexed, though blocked** / warnings | Mixed signals | Align: either index it fully or noindex it fully |
| **Excluded by 'noindex' tag** | Custom robots header tags set wrong | Blogger Settings → Crawlers & indexing: home = all, posts/pages = all, archive/search = noindex |

### Site-level checks (the tool runs monthly)
- Sitemap submitted and error-free
- HTTPS on + redirect on
- No manual actions in GSC
- Core Web Vitals per top post (PageSpeed API) — on Blogger the main fixes are: lighter theme, compress images, remove heavy widgets
- Broken outbound/internal links sweep

---

## 8. Getting more earnings

*(filled from dedicated research — see docs/research/05-earnings-and-backlinks.md)*

See section 8 summary there: AdSense eligibility & realistic RPM math, what raises RPM (niche, geography, placement), and what's realistic beyond AdSense (affiliate, sponsored posts, digital products).

---

## 9. Using your existing Search Console data (the 6 money recipes)

Your GSC already contains a roadmap. These are the exact queries the tool runs nightly:

### Recipe 1 — Striking distance (fastest wins that exist)
**Filter:** position 4–15 AND impressions > 100/month.
These posts are one push from page-1 top-3. **Action:** add the query verbatim to the title/H2 if missing, expand that section, add 2 internal links to the post, refresh the date with real changes.

### Recipe 2 — CTR fixers
**Filter:** position ≤ 10 AND CTR below benchmark for that position (rough benchmarks: pos 1 ≈ 25%+, pos 3 ≈ 10%, pos 5 ≈ 6%, pos 8 ≈ 3%).
Ranking fine but nobody clicks = boring title/description. **Action:** rewrite title with a CTR device (§4 stage 5), rewrite search description. Cheapest traffic increase possible — no new content needed.

### Recipe 3 — Query gaps → new posts
**Filter:** queries with impressions where the ranking page doesn't really answer that query.
Google is *guessing* one of your posts fits. Confirm the demand is real, then **write the dedicated post** and link it from the currently-ranking one. These are pre-validated keyword ideas — Google literally told you people search this and you almost have it.

### Recipe 4 — Second-page keywords per post
For each post, list ALL queries it gets impressions for. Queries at position 11–30 that aren't mentioned in the post text → **add a section covering them**. Post relevance broadens, rankings jump.

### Recipe 5 — Decay detection
**Filter:** posts whose clicks dropped ≥ 25% vs the previous 90 days.
**Action:** refresh (stage 9) before the decline compounds. Catching decay early is much easier than recovering a dead post.

### Recipe 6 — Country & device insights
If a surprising country drives impressions (e.g. US impressions on a PK-focused post), consider a dedicated variant for that audience (affects earnings a lot — see §8: US/UK traffic pays multiples more per view). If mobile CTR ≪ desktop, your titles are being cut — shorten.

---

## 10. Autocomplete keyword harvesting (the exact method)

Google's suggestion endpoint returns real search phrases as JSON, free, no key:

```
https://suggestqueries.google.com/complete/search?client=firefox&q=YOUR+SEED
```

The tool expands each seed keyword with three patterns:

1. **Alphabet soup:** `seed a`, `seed b`, … `seed z` → up to 260 real phrases
2. **Question prefixes:** `how seed`, `what seed`, `why seed`, `can seed`, `is seed`, `best seed`, `seed vs`, `seed for`, `seed without`
3. **Recursive:** feed the best suggestions back in as new seeds (one level deep)

Rules: call it server-side (browser blocks it), throttle to ~1 request/second, cache results. Add `&gl=pk&hl=en` (or your target country/language) for localized suggestions. The same endpoint works for YouTube with `&ds=yt`.

Result: 200–500 real long-tail candidates per seed in under 10 minutes, ready for the §2 funnel. This is what Keyword Sheeter and half the "free keyword tools" sell — it's just this endpoint.

---

## 11. Contacting (outreach — the condensed process)

Full detail in [docs/research/04-outreach-and-social.md](research/04-outreach-and-social.md). The operating loop:

1. **Find** blogs: Google `your niche + "write for us"` / `"guest post"`, plus blogs linking to your competitors (§5), plus blogs you genuinely read.
2. **Qualify:** relevant topic, real traffic, DR/DA 30+ (free Ahrefs/Moz checkers), no "pay for guest post" spam signals. 10 good prospects beat 100 random ones.
3. **Find the contact:** about/contact page → author bio → Hunter.io (50 free/month) → verify with Verifalia (25 free/day) → contact form as last resort.
4. **Send** a short personalized email (< 120 words): one line proving you read their blog, a specific ask with 2–3 proposed topics, your best link, easy out.
5. **Follow up** max 2–3 times, 3–7 days apart, each adding something new. ~42% of replies come from follow-ups — this is why the tool tracks next-action dates.
6. **Track** each prospect through: `Found → Qualified → Contacted → Follow-up → Replied → Agreed → Published → Link live`. Verify the live link stays up and whether it's dofollow/nofollow/sponsored.
7. **Stay safe:** ≤ 50 sends/day, real name + address in signature, "reply no and I won't email again" line, never buy link packages.

Expectation setting: 5–10% reply rate is good; 3–5% of emails become links. 10 quality links from relevant DR 40+ blogs move rankings for a small blog; 100 junk links do nothing or hurt.

---

*This playbook + the research in [docs/research/](research/) define what the tool automates. See the repo README for the module architecture.*

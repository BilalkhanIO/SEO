---
name: seo-weekly-review
description: Weekly SEO review - sync Search Console data, run the money recipes, check index/health, and produce a prioritized action list. Use when the user asks how the blog is doing, for a review/report, or to check rankings/traffic.
---

# Weekly review workflow

Reference: `docs/playbook.md` §7 (indexing fixes) and §9 (the 6 GSC recipes).

## Steps

1. For each blog (`npm run seo -- blogs list`):
2. **Sync fresh data**: `npm run seo -- track sync --blog <id> --days 28`.
3. **Run the recipes**: `npm run seo -- track recipes --blog <id>` — this finds striking-distance queries, CTR fixers, second-page expansions, and decaying posts, and saves them as alerts.
4. **Health spot-checks**:
   - `npm run seo -- health sitemaps --blog <id>` (errors/warnings?)
   - `npm run seo -- health index <url>` for the 2–3 newest posts.
   - `npm run seo -- health speed <url>` for the top-traffic post (monthly is enough).
5. **Outreach due**: `npm run seo -- outreach next --blog <id>`.
6. **Write the review for the user**, prioritized by impact:
   1. CTR fixes (cheapest wins — title/description rewrites; offer to draft the new titles now)
   2. Striking-distance pushes (small edits to near-page-1 posts; offer to draft the edits)
   3. Decay refreshes (schedule; playbook stage 9: update/rewrite/redirect decision)
   4. Index issues (apply the §7 issue→fix table)
   5. Outreach follow-ups due
   Keep it short: what happened, top 5 actions, what you can do right now if they say go.
7. Mark handled alerts: `npm run seo -- track done <alertId>`.

## Rules
- Compare like-for-like periods (the sync stores 28-day windows; decay compares ~90 days back automatically).
- Impressions rising with few clicks on a young post is NORMAL (day-30 checkpoint) — don't alarm the user.
- If nothing needs action, say so plainly and suggest the next keyword from the backlog instead.

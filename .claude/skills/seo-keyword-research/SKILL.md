---
name: seo-keyword-research
description: Find and select keywords for a Blogger blog using the 5-gate funnel. Use when the user wants keyword ideas, wants to know what to write about, or asks to research keywords for a topic/niche.
---

# Keyword research workflow

You are the SEO analyst. The CLI gathers data; YOU do the judgment (intent classification, difficulty assessment, scoring). Reference: `docs/playbook.md` §1–§3, §10.

## Steps

1. **Confirm the blog and seed topic.** `npm run seo -- blogs list`. If the seed is vague, ask which pillar topic this serves.
2. **Harvest candidates** (three sources, run what's available):
   - Autocomplete: `npm run seo -- kw harvest "<seed>" --blog <id> --gl us` (use `--gl pk` etc. if the audience is local; prefer `us` for Tier-1 RPM — see playbook §8).
   - Own GSC data: `npm run seo -- kw mine --blog <id>` (queries with impressions at position >8 = pre-validated demand).
   - If both fail (no auth / blocked), brainstorm long-tails yourself from the seed + question words, and say so.
3. **Shortlist** ~10–15 candidates yourself before any SERP calls: prefer 4+ word phrases, clear informational/commercial intent, obvious fit with the blog. Ignore navigational and giant head terms.
4. **SERP-check the shortlist**: for each stored keyword worth checking, `npm run seo -- kw serp <keywordId>`. Read the output yourself and judge:
   - Intent: what page type dominates?
   - Winnability: forums/thin/old pages in top 10 = winnable; all big brands = skip.
   - Traffic potential: PAA + related searches volume of variants.
5. **Score each through the 5 gates** (0–2 each — YOU decide the numbers, justify briefly):
   `npm run seo -- kw score <id> --relevance 2 --intent-fit 2 --winnable 1 --traffic 2 --value 1 --intent informational --notes "<one-line why>"`
   - 8–10 → write next. 6–7 → backlog. <6 → auto-archived.
6. **Report to the user**: a short table of scored keywords with your recommendation of the top 2–3 to write first and why. Then offer to run the `seo-write-post` skill for the winner.

## Rules
- Never recommend a keyword whose SERP you (or the cached serp_json) haven't looked at.
- Prefer keywords that extend an existing topic cluster on the blog (check `npm run seo -- post inventory --blog <id>`).
- If the blog's audience allows it, prefer English/Tier-1-targeted phrasings — RPM is 10–50x higher (playbook §8).

---
name: seo-write-post
description: Take a scored keyword through brief → draft → pre-publish validation → Blogger draft. Use when the user wants to write a blog post, create content for a keyword, or publish to Blogger.
---

# Write-a-post workflow

Reference: `docs/playbook.md` §4 (lifecycle) and §5 (competitors). YOU are the writer/editor; the CLI provides the brief and the validation gate. In Claude Code, YOU draft (do not call an AI API); the web app uses Gemini for the same step.

## Steps

1. **Pick the keyword**: `npm run seo -- kw list --blog <id> --status scored` — take the highest score (≥8 preferred; warn if <6).
2. **Generate the brief**: `npm run seo -- post brief <keywordId>` → writes `data/brief-<postId>.md`. Read it. If there's no cached SERP, run `npm run seo -- kw serp <keywordId>` first — never write blind.
3. **Fill the brief's blanks WITH the user** (these need human input, ask concisely):
   - THE GAP: what first-hand experience, data, examples, or local angle can the user contribute that no top-10 result has? This is mandatory — a post with zero information gain is what Google demotes.
   - Format + working title (40–60 chars, keyword near front, one CTR device).
4. **Draft the post** as clean Blogger HTML into `data/draft-<postId>.html`:
   - Start at `<h2>` (Blogger's post title is the H1). Answer the query in the first 100 words.
   - Structure from the brief's heading union + PAA questions as H2s. Short paragraphs, lists, tables.
   - Include the gap content prominently. First person where the user has real experience.
   - 3–6 internal links per 1,000 words (get real URLs from `npm run seo -- post inventory --blog <id>`), 2–5 external authority links, FAQ section at the end.
   - Length: SERP median ±20%. Complete, not padded.
5. **Generate schema**: `npm run seo -- post schema --title "..." --url "<planned url>" --author "<name>" --faq data/faq-<postId>.json` — append the output to the draft HTML.
6. **Run the gate**: `npm run seo -- post validate data/draft-<postId>.html --title "..." --description "..." --keyword "..."`
   Fix every error. `--permalink-set` only after the user confirms they set the custom permalink in the Blogger editor (or you accept publishing as draft first — recommended).
7. **Push to Blogger as draft**: `npm run seo -- post publish data/draft-<postId>.html --title "..." --blog <id> --labels "label1,label2"`.
   Tell the user the manual finishing steps in the Blogger editor: set custom permalink (BEFORE publishing — cannot change after), paste Search Description, add/verify images, then Publish.
8. **After they publish**: remind them to request indexing (GSC → URL Inspection) and to add links FROM 2–3 older posts to the new one. Then `npm run seo -- track sync` in ~7 days.

## Rules
- Never publish live (`--live`) without explicit user confirmation.
- Never fabricate first-hand experience, test results, or data. If the user has none, the gap must come from better structure/completeness/local relevance instead — say so honestly.
- Match the language/region the keyword targets.

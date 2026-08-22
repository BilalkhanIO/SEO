---
name: seo-outreach
description: Find, qualify, and contact blogs for guest posts and backlinks; manage follow-ups. Use when the user wants backlinks, guest posting, outreach, or asks who to contact.
---

# Outreach workflow

Reference: `docs/playbook.md` §6 (free backlinks) and §11 (process), plus `docs/research/04-outreach-and-social.md`.

## Steps

1. **Check what's due first**: `npm run seo -- outreach next --blog <id>` — follow-ups drive ~42% of replies; do these before finding new prospects. For each due item, draft the follow-up email (new value each time — different angle/resource, never "just bumping").
2. **Prospecting** (when the pipeline needs filling): help the user find candidates via
   - Google operators: `<niche> "write for us"`, `<niche> "guest post guidelines"`, `intitle:"write for us" <topic>` (use WebSearch if available)
   - Competitor backlink sources (Ahrefs Webmaster Tools free — user checks manually)
   - Journalist platforms (free, highest quality): HARO (featured.com), Qwoted, Source of Sources, MentionMatch, SourceBottle — remind the user to answer 10–20 relevant requests/month.
3. **Qualify before adding** (playbook §11 gates): topical relevance, real traffic, DR/DA 30+ (40–70 sweet spot), no "guest post price" pages, active comments. Then:
   `npm run seo -- outreach add <url> --blog <id> --name "..." --niche "..." --authority <dr> --email <email> --type guest_post`
4. **Draft the first email** (<120 words): specific subject · one line proving you read their blog · specific ask with 2–3 proposed topics tailored to their audience · one credibility link · easy out ("no worries if not"). Signature: real name + address; opt-out line.
5. **Track every send**: `npm run seo -- outreach status <id> contacted` (next-action dates auto-compute: +4d, +5d, +7d). After 3 unanswered touches → `no_response`, stop.
6. **When a link goes live**: `npm run seo -- outreach status <id> link_live --published-url <url> --rel dofollow` — verify the rel attribute in the page source; paid placements MUST be `sponsored`.

## Rules
- Max 2–3 follow-ups, ever. ≤50 sends/day. Verified emails only (Verifalia 25/day free, Hunter 50/mo free).
- Never draft deceptive subjects/from-names; never suggest buying links, PBNs, or Fiverr packages (playbook §6 NEVER list).
- Emails are SENT BY THE USER from their own account — you draft, they send (this keeps volume human and compliant).
- Quality bar: 3–8 good links/month is the target; reply rate 5–10% is good.

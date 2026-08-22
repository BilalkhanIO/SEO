# Blogger SEO Command Center — notes for Claude

Multi-blog SEO automation for Google Blogger. Terminal-first (this repo's CLI + skills), with a web dashboard (Vercel + Gemini) planned on the same core.

## Ground rules
- The knowledge base is `docs/playbook.md` (operational how-to) and `docs/research/` (sourced findings, Aug 2026). Follow the playbook's numbers (title 40–60 chars, 2–3 follow-ups max, score gate ≥6, etc.) — don't improvise different thresholds.
- In Claude Code, YOU are the AI layer: intent classification, difficulty judgment, scoring, drafting. The CLI (`npm run seo -- <cmd>`) only gathers data and enforces gates. Don't call external AI APIs from here; Gemini is for the web app.
- Never fabricate first-hand experience or data in drafts. Never suggest bought links/PBNs. Blogger permalinks must be set BEFORE publishing.
- Use the skills in `.claude/skills/` for the four main workflows (keyword research, write post, weekly review, outreach).

## Stack
- Node 20+, TypeScript ESM (`type: module`), `tsx` runner. `npm run lint` = `tsc --noEmit` (keep it clean).
- DB: libSQL — local file `data/seo.db` (gitignored), Turso URL in production. Schema in `src/store.ts` (`migrate()` is idempotent; every command calls it via `requireBlog`/`init`).
- Google APIs via `googleapis` with OAuth tokens in `data/google-tokens.json` or `GOOGLE_REFRESH_TOKEN` env (headless).
- `src/cli.ts` is the command surface; modules: `google/` (auth, gsc, blogger, pagespeed), `keywords/`, `serp/`, `content/`, `tracking/`, `outreach/`.

## Environment quirks
- `suggestqueries.google.com` (autocomplete) is blocked by some sandboxes/proxies — code returns [] gracefully; it works on user machines/Vercel.
- SERP analysis needs `SERPER_API_KEY` (2,500 free credits at serper.dev); without it, do SERP judgment from manual searches.

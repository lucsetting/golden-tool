# Golden Tool (app)

Spending-control web app. Vite + React + TypeScript + Tailwind v4 + zustand, Supabase for accounts and sync. Pushing to `main` deploys to app.thegoldentool.us.

- Check before every commit: `npx tsx scripts/check.ts && npm run lint && npm run build`
- This repository is public. Never commit credentials, review-account details or business notes.

## Agent skills

### Issue tracker

Specs and tickets are local markdown files under `.scratch/` (git-ignored). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

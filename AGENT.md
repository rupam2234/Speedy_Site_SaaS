# AGENT.md: Speedy Site Engineering Rules

> Read this file fully before writing any code in this repository.
> It applies to every agent, contributor, and reviewer working on speedy.site.

---

## Mission (read this first)

Speedy Site is a **WordPress performance optimization service powered by real user data**.

The product loop:

1. Customer installs our **single WordPress plugin**.
2. The plugin **validates the site** (ownership, environment, compatibility).
3. Once validated, the plugin **installs our RUM (Real User Monitoring) script**
   and starts collecting real user performance data.
4. Real user data plus **WordPress backend tests** surface real performance issues
   automatically, with pre-diagnosed context ("baked reasons").
5. Detected issues feed our **service channel**, where experts use the baked
   reasons to fix real issues faster.

Everything we build must serve this loop. Before implementing anything, read
**`docs/GOALS.md`** and any design doc in `docs/` covering the area you touch.

---

## Code Rules

### 1. Comments: key functions only, 3 lines max

- Comment only **key functions**, and only what the code cannot express (the *why*).
- A comment must never exceed **3 lines**.
- Never keep commented-out code or stale TODO-only comments; delete dead code instead.

### 2. Clean code and reuse

- Reuse existing components, hooks, helpers, and patterns before creating new ones.
- No duplication: shared logic goes into `src/lib` or shared components.
- Follow existing naming and file conventions (e.g. route handlers in `src/app/api/**/route.ts`).
- Keep diffs minimal and focused: do not refactor unrelated code in the same change.

### 3. Scalable code

- Design for growth: batched DB queries (no N+1), pagination on list endpoints,
  stateless API routes, small single-responsibility modules.
- New tables must follow existing Supabase patterns (types in `db.types.ts`, RLS policies).
- Prefer configuration over hardcoding; assume every constant will change.

### 4. Always read the goals and docs before implementing

- Read `docs/GOALS.md` before writing any feature.
- Check `docs/` for an existing design doc (`DESIGN-*.md`, `RESTRUCTURE-PLAN.md`) for
  the area you touch and follow it.
- If the docs and the code disagree, stop and flag it. Do not silently code around it.
- If no doc exists for a significant feature, write a short one in `docs/` first.

### 5. Performance is our priority: always pick the optimal solution

- We sell performance; our own code must demonstrate it.
- Frontend: prefer server components, lazy-load heavy charts/animations, keep client
  JS and bundles small, avoid unnecessary re-renders.
- Backend: index-aware queries, caching (Upstash/Redis, CDN, `revalidate`), no
  unbounded scans, stream when possible.
- RUM pipeline: the collector must stay tiny and non-blocking; ingestion must batch.
- Always measure before claiming a win.

### 6. Writing style: no em-dashes

- Never use the em-dash character "—" in code, comments, docs, or UI copy.
- Rewrite with a comma, colon, semicolon, parentheses, or split the sentence.
- Arrows (→) in diagrams and "·" separators are fine; the em-dash is not.

---

## Stack quick reference

| Layer | Technology |
|---|---|
| App | Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 |
| DB / Auth | Supabase (Postgres + Auth); generated types in `db.types.ts` |
| Edge | Cloudflare Workers (`cloudflare-workers/`: RUM ingestion, event buffer, analytics cron) |
| Billing | Stripe |
| Email | Resend |
| Cache | Upstash Redis |
| RUM script | `scripts/extended-rum.js` → built to `public/rum.js` (`npm run build:extended-vitals`) |

## Commands

```bash
npm run dev                     # local dev server
npm run build                   # production build
npm run lint                    # eslint
npm run build:extended-vitals   # build the RUM collector script
```

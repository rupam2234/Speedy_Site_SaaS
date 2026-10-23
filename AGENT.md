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

### 1. Environment variables and secrets

- Never hardcode secrets or credentials; always read from environment variables.
- Use `.env.example` as the single reference for required keys.
- Never commit `.env` files; only `.env.example` (with placeholder values) is tracked.

### 2. Comments: key functions only, 3 lines max

- Comment only **key functions**, and only what the code cannot express (the *why*).
- Use only `//` comments; a comment must never exceed **3 lines**.
- No decorative comment borders or banners.
- Never keep commented-out code or stale TODO-only comments; delete dead code instead.

### 3. Clean code and reuse

- Reuse existing components, hooks, helpers, and patterns before creating new ones.
- No duplication: shared logic goes into `src/lib` or shared components.
- Follow existing naming and file conventions (e.g. route handlers in `src/app/api/**/route.ts`).
- Keep diffs minimal and focused: do not refactor unrelated code in the same change.

### 4. Scalable code

- Design for growth: batched DB queries (no N+1), pagination on list endpoints,
  stateless API routes, small single-responsibility modules.
- New tables must follow existing Supabase patterns (types in `src/lib/db/database.types.ts`, RLS policies).
- Prefer configuration over hardcoding; assume every constant will change.

### 5. Always read the goals and docs before implementing

- Read `docs/GOALS.md` before writing any feature.
- Check `docs/` for an existing design doc (`DESIGN-*.md`, `RESTRUCTURE-PLAN.md`) for
  the area you touch and follow it.
- **Migration & Service Model**: When touching billing, auth gates, telemetry workers, or database
  schemas, review `docs/migration/README.md`. Follow the Safe De-integration Pattern and update the
  relevant phase doc upon completing changes.
- If the docs and the code disagree, stop and flag it. Do not silently code around it.
- If no doc exists for a significant feature, write a short one in `docs/` first.

### 6. Performance is our priority: always pick the optimal solution

- We sell performance; our own code must demonstrate it.
- Frontend: prefer server components, lazy-load heavy charts/animations, keep client
  JS and bundles small, avoid unnecessary re-renders.
- Backend: index-aware queries, caching (Upstash/Redis, CDN, `revalidate`), no
  unbounded scans, stream when possible.
- RUM pipeline: the collector must stay tiny and non-blocking; ingestion must batch.
- Always measure before claiming a win.

### 7. Writing style: no em-dashes

- Never use the em-dash character "—" in code, comments, docs, or UI copy.
- Rewrite with a comma, colon, semicolon, parentheses, or split the sentence.
- Arrows (→) in diagrams and "·" separators are fine; the em-dash is not.

### 8. Record major impactful changes in docs/IMPACT-LOG.md

- After any major impactful change (cost, security, performance, reliability,
  product), add a short entry to `docs/IMPACT-LOG.md`: problem, changes,
  before/after impact, where to verify, and a one-line interview summary.
- Only major, measurable changes; link to the design doc or files for detail.

### 9. Never push directly to protected branches

- Never push directly to `main` or `dev`; all changes must go through a PR from a feature branch.
- Use `git commit --amend` / `git rebase` to clean history before opening a PR.
- CI must pass (typecheck, lint, build) before merge.

### 10. Error handling and logging

- Never silently swallow errors; always log or propagate them.
- Use structured error responses in API routes (consistent shape with `error` and `message` fields).
- In Cloudflare Workers, keep error paths lightweight; log enough context to debug without leaking secrets.

### 11. Testing

- New API routes and critical business logic should include tests.
- CI must pass all tests before merge; do not merge with known test failures.

---

## Stack quick reference

| Layer | Technology |
|---|---|
| App | Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 |
| DB / Auth | Supabase (Postgres + Auth); generated types in `src/lib/db/database.types.ts` |
| Edge | Cloudflare Workers (`cloudflare-workers/`: RUM ingestion, event buffer, analytics cron) |
| Billing | Stripe |
| Email | Resend |
| Cache | Upstash Redis |
| RUM script | `scripts/extended-rum.js` → built to `public/rum.js` (`pnpm run build:extended-vitals`) |

## Commands

```bash
pnpm dev                     # local dev server
pnpm build                   # production build
pnpm lint                    # eslint
pnpm run build:extended-vitals   # build the RUM collector script
```

# Speedy Site SaaS: Workspace Rules

Stack: Next.js 15 (App Router) / TypeScript / Tailwind CSS 4 / Supabase / Cloudflare Workers

## Mission (Read First)
Speedy Site is a **WordPress performance optimization service powered by real user data**.
1. Customer installs our **single WordPress plugin**.
2. The plugin **validates the site** (ownership, environment, compatibility).
3. Once validated, the plugin **installs our RUM (Real User Monitoring) script** and collects real user performance data.
4. Real user data plus **WordPress backend tests** surface performance issues automatically with pre-diagnosed context ("baked reasons").
5. Detected issues feed our **service channel**, where experts fix real issues faster.

---

## 1. Subsystem Boundaries & Verification
Use root automation to execute standard quality gates across subsystems:
- **Quality Check**: Run `make check` (runs frontend linter).
- **Generated Types Are Read-Only**: Never edit `src/types/database.types.ts` directly. Update schemas/migrations and run `make types`.
- **Environment & Secrets**: Never hardcode secrets or credentials; always read from environment variables. Never commit `.env` files. Reference `.env.example`.
- **Protected Branches**: Never push directly to `main`. Push changes through a feature branch and merge cleanly.

## 2. Code Rules & Style Invariants
- **No Em-Dashes**: Never use the em-dash character in code, comments, docs, or UI copy. Use commas, colons, semicolons, parentheses, or split sentences.
- **Comments**: Key functions only, 3 lines maximum, only `//` comments explaining the *why*. Delete dead code.
- **Performance First**: Server components preferred, batched queries (no N+1), index-aware DB queries, lightweight error paths in Cloudflare Workers. Keep bundle sizes minimal.
- **Clean Code & Reuse**: Reuse existing components, hooks, and helpers before creating new ones. Shared logic belongs in `src/lib`. Follow standard Next.js route conventions.
- **Error Handling & Logging**: Never silently swallow errors; log or propagate with structured responses (`error` and `message` fields).
- **Impact Log**: Record major impactful architectural changes in `docs/IMPACT-LOG.md`.

## 3. Documentation Guidelines
- **Doc-First Discovery**: Before analyzing code or wandering through files, inspect documentation first (`docs/`). They contain curated architectural context, schema summaries, and file responsibilities.
- **Macro Dossiers (`docs/systems/*.md`)**: High-level component topologies, service routes, and system architecture.
- **Developmental Plans & Roadmaps (`docs/plans/`)**: Feature overhauls, milestones, and architectural phases must be planned in `docs/plans/`. Plan filenames MUST be prefixed with their creation timestamp (`YYYY-MM-DD_HHMMSS_<slug>.md`). Keep `docs/plans/README.md` synchronized.
- **Migration & Service Model**: When modifying billing, auth gates, telemetry workers, or database schemas, review `docs/migration/README.md` and follow the safe de-integration pattern.

## 4. Ongoing Documentation Maintenance Protocol (Agent Operational Rules)
When implementing features or refactoring code during conversation turns, follow this maintenance lifecycle:
1. **On Milestone & Phase Progress (`docs/plans/`)**:
   - Check off completed deliverables in the active plan (`- [ ]` -> `- [x]`).
   - Sync progress with `python ~/.gemini/config/plugins/workspace-docs/skills/workspace-docs/scripts/manage_plans.py update <plan_name> --status completed`.
2. **On Architectural Shifts (`docs/systems/`, `docs/protocols/`)**:
   - Update `docs/systems/*.md` or `docs/protocols/*.md` when changing system topologies, introducing services, or altering wire formats.

---

## 5. Technology Stack Quick Reference

| Layer | Technology |
| :--- | :--- |
| **App** | Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 |
| **DB & Auth** | Supabase (Postgres + Auth); generated types in `src/types/database.types.ts` |
| **Edge** | Cloudflare Workers (`cloudflare-workers/`: RUM ingestion, event buffer, analytics cron) |
| **Billing** | Stripe |
| **Email** | Resend |
| **Cache** | Upstash Redis |
| **Collector** | `scripts/extended-rum.js` -> built to `public/rum.js` (`pnpm run build:extended-vitals`) |

---

## Documentation Layer Separation & Conversation-Time Arbitration

This workspace maintains potentially overlapping documentation types. To prevent drift, circular debates, and redundant writes during conversations, adhere to these pre-compiled arbitration gotchas:

### • Arbitration: Architecture Decision Records (ADRs) <-> Chronological Developmental Plans
- **⚠️ The Gotcha**: When the user asks to 'plan an architectural change', the agent might dump decision trade-offs inside `docs/plans/` without creating an ADR, or insert task checkboxes into `docs/adr/`.
- **👑 Precedence / Authority**: `docs/adr/` is the SOLE authority for WHY an architectural choice was made (immutable). `docs/plans/` is the SOLE authority for HOW and WHEN it is executed (living). If a plan contradicts an accepted ADR, the ADR wins until formally superseded.
- **📐 Invariant**: ADRs (`docs/adr/`) record immutable architectural decisions. Plans (`docs/plans/`) record timestamped execution phases. Plans cross-link to ADR IDs (`> **Related ADR:** [ADR-XXXX](...)`) rather than duplicating decision rationales.
- **🤖 Conversation-Time Action**: At conversation time: If user request involves architectural design choices, split the output: author the ADR first (`docs/adr/NNNN-*.md`), then author the timestamped plan (`docs/plans/YYYY-MM-DD_*.md`) cross-linking the ADR ID. Never add checklist checkboxes to an ADR.

### • Arbitration: Macro System Dossiers <-> Protocol & Wire Specifications
- **⚠️ The Gotcha**: When asked to document an endpoint or service interaction, the agent pastes binary byte schemas, magic headers, or hex dumps directly into high-level system dossiers.
- **👑 Precedence / Authority**: `docs/protocols/` is the SOLE authority for byte layouts, packet framing, and wire dumps. `docs/systems/` is authoritative ONLY for high-level endpoints and service routing.
- **📐 Invariant**: Protocol Specifications (`docs/protocols/`) exclusively document wire packet bytes, binary layouts, command codes, and socket frames. Systems Dossiers (`docs/systems/`) document high-level protocol names and abstract communication routes.
- **🤖 Conversation-Time Action**: At conversation time: Keep `docs/systems/` high-level. Place packet diagrams and bit-level layouts strictly in `docs/protocols/`. In systems docs, reference `[Protocol Spec](docs/protocols/<spec>.md)`.

### • Arbitration: Operational Runbooks & Incident Response <-> Contributor & Local Onboarding Guides
- **⚠️ The Gotcha**: The agent mixes local workstation commands (`pnpm install`, local mocks) with live production deployment or failover procedures in the same file.
- **👑 Precedence / Authority**: `docs/setup.md` / `CONTRIBUTING.md` is strictly for local developer workstation bootstrap. `docs/runbooks/` is strictly for production infrastructure, failovers, and live incident mitigation.
- **📐 Invariant**: Onboarding (`docs/setup.md`) covers developer environment initialization. Runbooks (`docs/runbooks/`) cover live production deployments, database migrations, secret rotation, and incident disaster recovery.
- **🤖 Conversation-Time Action**: At conversation time: If the user asks 'how do I deploy or run this?', disambiguate immediately: for local dev, update or consult `docs/setup.md`; for production release or rollback, update or consult `docs/runbooks/`.

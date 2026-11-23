# Speedy Site SaaS Documentation

Welcome to the Speedy Site SaaS platform documentation repository. This directory houses architectural specifications, operational plans, system designs, protocols, and runbooks for the workspace.

---

## 📚 Documentation Sections

| Section | Description | Key Documents |
| :--- | :--- | :--- |
| [**`systems/`**](systems/README.md) | **System Architecture & Workflows**<br>Comprehensive technical macro-dossier covering services, subsystem layers, database & storage, and deployment topology. | • [`README.md`](systems/README.md)<br>• Subsystem architecture guides |
| [**`plans/`**](plans/README.md) | **Implementation & Verification Plans**<br>Step-by-step engineering plans, checkpoints, and verification audits for completed features and platform milestones. | • [`README.md`](plans/README.md)<br>• Active and completed plans |
| [**`adr/`**](adr/README.md) | **Architecture Decision Records**<br>Authoritative and immutable records of key architectural decisions and rationale. | • [`README.md`](adr/README.md)<br>• ADR log |
| [**`protocols/`**](protocols/README.md) | **Protocol & Wire Specifications**<br>Wire specifications, packet layouts, and low-level protocol formats. | • [`README.md`](protocols/README.md)<br>• Protocol specs |
| [**`runbooks/`**](runbooks/README.md) | **Operational Runbooks**<br>Production operations, migrations, incident responses, and rollback procedures. | • [`README.md`](runbooks/README.md)<br>• Runbook index |
| [**`setup.md`**](setup.md) | **Developer Onboarding**<br>Local developer workstation initialization, environment configuration, and bootstrap commands. | • [`setup.md`](setup.md) |

---

## 🛠️ Workspace Automation & Quality Gates

The workspace includes automated scripts and quality gates to verify code quality and database health:

| Command | Description |
| :--- | :--- |
| `make check` | Run frontend linter quality gate (`next lint`) |
| `make build` | Build production Next.js bundle |
| `make types` | Regenerate Supabase TypeScript definitions |
| `make migrate-status` | Display status of applied and pending SQL migrations |
| `make dev` | Start dev server locally |

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

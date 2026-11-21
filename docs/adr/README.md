# Architecture Decision Records (ADRs) (`docs/adr/`)

This directory maintains immutable records of architectural and technical decisions made for **Speedy Site Saas**.

---

## 🗺️ Master Decision Log

| ADR # | Date | Title | Status | Chosen Option |
| :--- | :--- | :--- | :--- | :--- |
| **0001** | 2026-11-21 | [Initial System Architecture](0001-initial-architecture.md) | 🟢 Accepted | Standardized Modular Tiering |

---

## 📖 ADR Operating Guidelines

1. **Why Over How**: ADRs preserve *why* a technology, framework, or architectural pattern was chosen over alternatives to prevent circular debates. Step-by-step implementation tasks belong in `docs/plans/`.
2. **Immutability**: Once an ADR is marked `Accepted`, its historical text is never edited. If the decision changes, author a new ADR that explicitly marks the earlier one as `Superseded`.
3. **Numbering**: Files are strictly four-digit sequential: `NNNN-short-slug.md`.

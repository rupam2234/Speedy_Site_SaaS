# Operational Runbooks & Incident Response (`docs/runbooks/`)

This directory maintains step-by-step operational procedures, disaster recovery guides, live deployment checklists, and incident response playbooks for **Speedy Site Saas**.

---

## 🗺️ Runbooks Catalog

| Runbook ID | Title | Severity / Scope | Key Operation |
| :--- | :--- | :--- | :--- |
| **RB-01** | [Deployment & Rollback](RB-01-deployment-and-rollback.md) | Standard Release | Production zero-downtime release |
| **RB-02** | [Prod Migration Reconciliation](RB-02-prod-migration-reconciliation.md) | P1 / Database | Production database migration alignment & index reconciliation |

---

## 🛠️ Boundary Invariants

- **Production Operations Only**: `docs/runbooks/` is strictly for operational infrastructure, production deploys, and disaster recovery.
- **Local Dev Separation**: Local development environment setup instructions belong strictly in `docs/setup.md` / `CONTRIBUTING.md`.

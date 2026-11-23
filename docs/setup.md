# Developer Setup & Local Environment (`docs/setup.md`)

This guide walks new developers and agents through configuring a pristine local development environment for **Speedy Site SaaS**.

---

## 💻 Prerequisites & Toolchains

Ensure the following runtimes and tools are installed on your workstation:
- **Node.js** (v20+ or latest LTS)
- **pnpm** (v9+)
- **Docker & Docker Compose** (for local Postgres/Supabase and dev stack)
- **Supabase CLI** (for local database migrations and typegen)
- **Python 3** (for migration and doc automation scripts)

---

## 🚀 Quickstart Walkthrough

1. **Clone & Install Dependencies**:
   ```bash
   git clone <repo-url>
   cd Speedy_Site_SaaS
   pnpm install
   ```
2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Inspect .env and fill in required local credentials
   ```
3. **Database Initialization**:
   ```bash
   make db-setup
   ```
4. **Build Collector Script & Verify Quality Gates**:
   ```bash
   pnpm run build:extended-vitals
   make check
   ```
5. **Start Local Development Server**:
   ```bash
   make dev
   # Or rootless multi-container docker dev stack:
   # make docker-dev
   ```

---

## 🛠️ Boundary Invariants

- **Local Setup Only**: This document is strictly for developer workstation bootstrap. Production operations, deployments, and disaster recovery procedures belong in `docs/runbooks/`.

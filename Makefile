# ==============================================================================
# speedy-site: Task Automation Makefile (Frontend / Edge)
# ==============================================================================

.PHONY: help check lint build \
        db-setup db-reset db-dump db-dump-schema db-dump-data \
        migrate migrate-status types deploy-functions deploy-functions-status \
        dev docker-dev docker-prod

.DEFAULT_GOAL := help

help:
	@echo "speedy-site Development Commands:"
	@echo "  make check                    Run frontend linter"
	@echo "  make lint                     Run linter on the frontend source"
	@echo "  make build                    Build production bundle"
	@echo ""
	@echo "Supabase & Database Commands:"
	@echo "  make db-setup                 Initialize database (applies migrations & regen types)"
	@echo "  make db-reset                 Full destructive teardown, re-migration & setup"
	@echo "  make db-dump-schema           Dump DDL schema (supabase/schemas/)"
	@echo "  make db-dump-data             Dump table data into supabase/seed.sql"
	@echo "  make db-dump                  Dump both schema and data"
	@echo "  make migrate-status           Display status of applied and pending SQL migrations"
	@echo "  make migrate                  Apply unapplied migrations via Supabase CLI"
	@echo "  make types                    Regenerate TypeScript types via Supabase CLI"
	@echo "  make deploy-functions         Deploy modified Supabase Edge Functions"
	@echo "  make deploy-functions-status  Check diff status of Supabase Edge Functions"
	@echo ""
	@echo "Local Development:"
	@echo "  make dev                      Start dev server locally (no Docker)"
	@echo "  make docker-dev               Start rootless multi-container dev stack (live reload)"
	@echo "  make docker-prod              Build and start production container stack"

# ------------------------------------------------------------------------------
# Quality Gates & Linting
# ------------------------------------------------------------------------------
check: lint

lint:
	pnpm run lint

build:
	pnpm run build

# ------------------------------------------------------------------------------
# Database & Supabase CLI
# ------------------------------------------------------------------------------
db-setup:
	python scripts/migrate.py -y

db-reset:
	npx --yes supabase db reset
	python scripts/migrate.py -y

db-dump-schema:
	python scripts/db_dump.py --schema-only $(if $(DIR),-d $(DIR),) $(if $(SCHEMA),-s $(SCHEMA),) $(if $(FILE),-f $(FILE),) $(ARGS)

db-dump-data:
	python scripts/db_dump.py --data-only $(if $(DIR),-d $(DIR),) $(if $(SCHEMA),-s $(SCHEMA),) $(if $(FILE),-f $(FILE),) $(ARGS)

db-dump:
	python scripts/db_dump.py --both $(if $(DIR),-d $(DIR),) $(if $(SCHEMA),-s $(SCHEMA),) $(if $(FILE),-f $(FILE),) $(ARGS)

migrate-status:
	python scripts/migrate.py --status

migrate:
	python scripts/migrate.py

types:
	npx --yes supabase gen types typescript --local > src/types/database.types.ts 2>/dev/null || npx --yes supabase gen types typescript --local > src/lib/supabase/database.types.ts

deploy-functions:
	python scripts/deploy_edge_functions.py

deploy-functions-status:
	python scripts/deploy_edge_functions.py --status

# ------------------------------------------------------------------------------
# Local Development & Orchestration
# ------------------------------------------------------------------------------
dev:
	pnpm run dev

docker-dev:
	docker compose -f docker-compose.dev.yml up --build

docker-prod:
	docker compose up --build -d

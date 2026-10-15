# Tencent Cloud Container Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the existing ecommerce demo as a three-container Compose application ready to upload to one Tencent Cloud Linux server.

**Architecture:** A Caddy container serves the Vite build and proxies `/api/*` to an internal Node.js API container. An internal MySQL 8.4 container stores data in a named volume. The same deployment supports `http://<IP>` now and a domain with automatic HTTPS later.

**Tech Stack:** Docker, Docker Compose, Caddy, Node.js 24, React/Vite, MySQL 8.4.

**Spec:** `docs/superpowers/specs/2026-10-15-container-deployment-design.md`

## Global Constraints

- Frontend, backend, and MySQL must each run in a container.
- Only Caddy publishes host ports; the API and MySQL stay on the Compose network.
- The MySQL named volume survives image updates and container restarts.
- Never run `db:reset` during deployment or updates.
- Do not commit real credentials, SSH keys, or server-specific addresses.
- Keep the existing local development `compose.yaml` working.
- No interface or UI automation suite is part of this work.

## Review Focus

- Direct navigation to `/orders` must serve the React app, not return 404; verify via HTTP smoke check in Task 2.
- `/api/docs/` assets and `/api/openapi.json` must work through Caddy without stripping `/api`; verify in Task 2.
- Missing required secrets must stop Compose interpolation before containers launch; verify in Task 2.
- Repeating seed must preserve existing orders and stock; verify in Task 3 using the running stack.
- Restarting the stack must preserve an order in the MySQL volume; verify in Task 3.

## File Map

- `apps/api/Dockerfile`: build TypeScript and package runtime dependencies, compiled code, and SQL schema.
- `apps/web/Dockerfile`: build Vite assets and package them with Caddy.
- `apps/web/Caddyfile`: configurable site address, API reverse proxy, SPA fallback.
- `.dockerignore`: exclude host dependencies, builds, credentials, and Git metadata from image contexts.
- `compose.prod.yaml`: production services, internal connectivity, health checks, restart policy, volume, and only 80/443 published.
- `.env.production.example`: documented non-secret variable names and empty secret values.
- `.gitignore`: exclude `.env.production`.
- `README.md`: exact build, seed, start, update, stop, log, and verification steps.

---

### Task 1: Build production images and web routing

**Files:** Create `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/web/Caddyfile`, `.dockerignore`.

**Interfaces:** Build context is the repository root. API image runs from `apps/api` and exposes port 3001 internally; `node dist/seed.js` is callable inside the image. Web image reads `SITE_ADDRESS` at runtime and serves static assets from Caddy.

- [ ] **Step 1: Confirm the precondition fails.** Run `docker build -f apps/api/Dockerfile .` and `docker build -f apps/web/Dockerfile .`; both must fail because the Dockerfiles do not yet exist.
- [ ] **Step 2: Add Dockerfiles, Caddy routing, and context exclusions.** Use multi-stage builds. Copy workspace manifests and lockfile before `npm ci`; compile only the relevant workspace. Runtime API image includes production Node dependencies, `dist`, and `apps/api/sql/schema.sql`; runtime web image includes built `dist` and the Caddyfile. Caddy routes `/api/*` unchanged to `api:3001` and serves all other routes from `/srv` with `index.html` fallback. Exclude `.env*` except examples, `node_modules`, `dist`, `.git`, and `.DS_Store` from build context.
- [ ] **Step 3: Verify both builds.** Run `docker build -f apps/api/Dockerfile -t s-mall-api:local .` and `docker build -f apps/web/Dockerfile -t s-mall-web:local .`. Confirm API image contains both `dist/server.js` and `dist/seed.js`, plus schema SQL.
- [ ] **Step 4: Commit** only the four files with `feat: package frontend and API as containers`.

### Task 2: Wire the production stack

**Files:** Create `compose.prod.yaml`, `.env.production.example`; modify `.gitignore`.

**Interfaces:** `docker compose --env-file .env.production -f compose.prod.yaml ...` is the deployment command. `SITE_ADDRESS` is `http://<public-IP>` without a domain or a bare domain name with HTTPS. Required variables are `SITE_ADDRESS`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `JWT_SECRET`. Compose service names are `web`, `api`, and `mysql`.

- [ ] **Step 1: Confirm production Compose is absent.** Run `docker compose -f compose.prod.yaml config`; it must fail before implementation.
- [ ] **Step 2: Add configuration.** Compose builds both app images from the repository root, sets `DB_HOST=mysql`, `DB_PORT=3306`, and `API_PORT=3001`, waits for MySQL health, and publishes only web ports 80/443. Use a persistent MySQL volume and Caddy data/config volumes for certificates. Use required Compose interpolation for secrets and site address. Provide an env example with blank secret fields; ignore the real file.
- [ ] **Step 3: Verify interpolation and routing.** With temporary non-demo values in a local untracked env file, run `docker compose --env-file .env.production -f compose.prod.yaml config` and confirm only `web` has host ports. With a required secret omitted, confirm config fails. Start the stack and verify `/`, `/orders`, `/api/health`, `/api/docs/`, and `/api/openapi.json` over the configured local HTTP address; inspect Caddy and API logs if any fail.
- [ ] **Step 4: Commit** only the three configuration files with `feat: add production Compose configuration`.

### Task 3: Document first deployment and data-safe updates

**Files:** Modify `README.md`.

**Interfaces:** The documented first-run command uses `docker compose ... run --rm api node dist/seed.js` after MySQL is healthy. Updates rebuild and restart without `down -v` or `db:reset`.

- [ ] **Step 1: Check the current README.** Confirm it lacks remote Compose first-run and update commands.
- [ ] **Step 2: Document the deployment flow.** Cover copying files by SSH/rsync, creating `.env.production` from the example, building, starting MySQL, running one-time seed, starting the stack, site-address choice, Tencent Cloud 80/443 firewall rules, logs, updating, stopping, and the required non-destructive commands. Explain that the API and MySQL ports are internal.
- [ ] **Step 3: Verify data persistence.** In a disposable local deployment, seed twice, create an order using the demo API, restart the stack, and confirm the order and stock remain. Run `npm run build`, `docker compose --env-file .env.production -f compose.prod.yaml config`, and `git diff --check`. Do not run `down -v` on a non-disposable volume.
- [ ] **Step 4: Commit** the README with `docs: explain container deployment and safe updates`.

### Task 4: Deploy when server access is available

**Files:** No repository changes expected; keep `.env.production` only on the server.

**Interfaces:** Requires instance type, Linux version, public IP, SSH username/login method, and optional domain. Do not copy private key material into the repository or server upload archive.

- [ ] **Step 1: Inspect server readiness.** Confirm SSH access, Docker Engine/Compose availability, disk space, existing services on 80/443, and Tencent Cloud firewall/security-group rules. Resolve conflicts before changing running services.
- [ ] **Step 2: Upload and start.** Transfer tracked project files, create server-only `.env.production` with unique secrets, build images, start MySQL, run idempotent seed, and start `api` and `web`. If a domain exists, confirm DNS points to the instance before relying on Caddy HTTPS.
- [ ] **Step 3: Verify remote behavior.** Check home, direct `/orders`, health, Swagger UI, login, product list, cart, and demo order. Restart containers and confirm order persistence. Report the final URL and container status to the user.

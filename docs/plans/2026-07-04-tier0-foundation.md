# Tier 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a deployed, styled, tested Next.js skeleton on Neon EU so the four Tier-0 domains (`auth-identity`, `forum-core`, `ai-answers`, UI screens) have a working foundation to build on.

**Architecture:** Single Next.js App Router (RSC) app with a hard `core/` ↔ `config/`/`theme/` boundary from commit #1. Postgres via Drizzle on Neon (EU/fra1). Design system on Radix + shadcn/ui (copy-in, owned) + Tailwind, dark-first. Serverless-only — no daemons. Deploy via Vercel git-integration to `community.sip-protocol.org` as a walking skeleton.

**Tech Stack:** pnpm · Next.js (App Router) · TypeScript · Tailwind CSS + shadcn/ui + Radix + Lucide · Drizzle ORM + `@neondatabase/serverless` · Vitest + Testing Library + Playwright · GitHub Actions CI + GitLab mirror · Vercel.

**Source specs:** [`MASTER-PRD`](../specs/MASTER-PRD.md), [`SPEC-ui`](../specs/SPEC-ui.md).

## Global Constraints

Every task's requirements implicitly include these (copied from the specs / house rules):

- **Package manager:** `pnpm` only.
- **TypeScript style:** 2-space indent, **no semicolons**, single quotes, explicit types on public APIs, validate inputs at boundaries (zod).
- **Testing:** tests mandatory for new functions/components; **80%+ coverage on new code**; run the suite after changes.
- **Neon region:** **EU (fra1)** — no other region.
- **Icons:** **Lucide only**; never Unicode emoji as UI icons.
- **Seam:** `core/` is generic (no SIP specifics); SIP branding/copy/config live in `config/` + `theme/`.
- **Privacy:** no third-party trackers/analytics/ad-tech in the app.
- **Commits:** GPG-signed (auto, key `BF47B9DC1FA320FA`); **one commit per task**; work on `dev`; **no AI attribution** anywhere (write as a human dev).
- **Deploy target:** `community.sip-protocol.org` (Vercel).
- **Version note:** where a tool has a CLI initializer (`create-next-app`, `shadcn`, `better-auth`), use `@latest` and verify current API against Context7 at build — do not pin to remembered versions.

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json`, `pnpm-lock.yaml` | deps + scripts (`dev`, `build`, `lint`, `typecheck`, `test`, `test:run`, `e2e`, `db:generate`, `db:migrate`) |
| `.prettierrc`, `eslint.config.mjs` | house style (no semi, 2-space) enforcement |
| `next.config.ts`, `tsconfig.json` | Next + TS config; `@/*` path alias |
| `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` | root layout, home, Tailwind `@theme` + dark-first tokens |
| `components.json` | shadcn config (points components at `src/core/ui`) |
| `src/core/ui/` | owned shadcn primitives (generic, no SIP look) — `button.tsx`, `utils.ts` (`cn()`) |
| `src/lib/format.ts` | pure display helpers (`truncateAddress`) — reused by auth-identity |
| `src/theme/sip/tokens.css` | SIP token overrides (CSS variables) — only file with SIP colors |
| `src/components/app-shell.tsx` | header + footer + main shell |
| `src/lib/db/index.ts` | Drizzle client (Neon) |
| `src/lib/db/schema/index.ts` | schema barrel (empty at Foundation; domains append) |
| `drizzle.config.ts` | drizzle-kit config |
| `.env.example`, `.env.local` | env template + local secrets (gitignored) |
| `vitest.config.ts`, `vitest.setup.ts` | unit/component test harness |
| `playwright.config.ts`, `e2e/smoke.spec.ts` | E2E harness + smoke |
| `.github/workflows/ci.yml` | lint + typecheck + test + build |
| `.github/workflows/mirror-gitlab.yml` | force-push mirror to GitLab |

---

## Task 1: Scaffold Next.js + house style

**Files:**
- Create: project scaffold (`package.json`, `next.config.ts`, `tsconfig.json`, `src/app/*`)
- Create: `.prettierrc`

**Interfaces:**
- Produces: a running dev server; `pnpm lint` / `pnpm typecheck` scripts used by every later task and CI.

- [ ] **Step 1: Scaffold** — run in an empty temp dir, then move files into the repo root (repo already has `.git`, `README.md`, `LICENSE`, `docs/`, `.gitignore`):

```bash
pnpm create next-app@latest sip-app --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --use-pnpm
# move generated files into the repo root, preserving existing .git/README/LICENSE/docs/.gitignore
```

Expected: `src/app/layout.tsx`, `src/app/page.tsx`, `next.config.ts`, `tsconfig.json` present at repo root.

- [ ] **Step 2: House-style config** — create `.prettierrc`:

```json
{
  "semi": false,
  "tabWidth": 2,
  "singleQuote": true,
  "trailingComma": "all"
}
```

Add scripts to `package.json`: `"typecheck": "tsc --noEmit"`, `"format": "prettier --write ."`. Run `pnpm format` to normalize the scaffold.

- [ ] **Step 3: Verify dev server** — `pnpm dev`, open `http://localhost:3000`.
Expected: default Next page renders, no console errors. Stop the server.

- [ ] **Step 4: Verify lint + types**

Run: `pnpm lint && pnpm typecheck`
Expected: both pass, zero errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js App Router app with house style"
```

---

## Task 2: Test harness (Vitest + Testing Library + Playwright)

Harness comes first so every later task runs a clean red→green cycle. Proven with one real pure helper (`truncateAddress`, reused later by auth-identity for pseudonymous wallet display).

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`, `e2e/smoke.spec.ts`
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`
- Modify: `package.json` (test scripts)

**Interfaces:**
- Produces: `pnpm test:run` (unit/component, used by CI) and `pnpm e2e`; `truncateAddress(address: string, keep?: number): string` from `@/lib/format`.

- [ ] **Step 1: Install** — `pnpm add -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/jest-dom @playwright/test` then `pnpm exec playwright install --with-deps chromium`.

- [ ] **Step 2: Configure** — `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
```

`vitest.setup.ts`: `import '@testing-library/jest-dom'`. Add scripts: `"test": "vitest"`, `"test:run": "vitest run"`, `"e2e": "playwright test"`. `playwright.config.ts` runs `pnpm dev` as its `webServer` on port 3000.

- [ ] **Step 3: Write failing unit test** — `src/lib/format.test.ts`:

```ts
import { truncateAddress } from '@/lib/format'

test('truncates a Solana address to head…tail', () => {
  expect(truncateAddress('AbcD1234WXYZ5678', 4)).toBe('AbcD…5678')
})

test('returns short strings unchanged', () => {
  expect(truncateAddress('AbcD', 4)).toBe('AbcD')
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test:run src/lib/format.test.ts`
Expected: FAIL — `truncateAddress` is not defined.

- [ ] **Step 5: Implement** — `src/lib/format.ts`:

```ts
export function truncateAddress(address: string, keep = 4): string {
  if (address.length <= keep * 2 + 1) return address
  return `${address.slice(0, keep)}…${address.slice(-keep)}`
}
```

- [ ] **Step 6: Run unit test green**

Run: `pnpm test:run src/lib/format.test.ts`
Expected: PASS (both cases).

- [ ] **Step 7: Minimal E2E smoke** — `e2e/smoke.spec.ts` (asserts only that the app responds; the shell task adds landmark assertions):

```ts
import { test, expect } from '@playwright/test'

test('home responds and renders a body', async ({ page }) => {
  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  await expect(page.locator('body')).toBeVisible()
})
```

Run: `pnpm e2e`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "test: add Vitest + Testing Library + Playwright harness"
```

---

## Task 3: Design system — Tailwind tokens, theme seam, shadcn

**Files:**
- Create: `components.json`, `src/core/ui/utils.ts`, `src/core/ui/button.tsx`, `src/core/ui/button.test.tsx`
- Create: `src/theme/sip/tokens.css`
- Modify: `src/app/globals.css` (dark-first tokens), `src/app/layout.tsx` (import theme, dark default)

**Interfaces:**
- Consumes: the test harness from Task 2.
- Produces: `Button` from `@/core/ui/button`; `cn()` from `@/core/ui/utils`; a CSS-variable token contract that `theme/sip` overrides.

- [ ] **Step 1: Init shadcn** — `pnpm dlx shadcn@latest init` (choose: dark base, CSS variables, components dir → `src/core/ui`). Verify `components.json` sets `"aliases": { "components": "@/core/ui", "utils": "@/core/ui/utils" }`.

- [ ] **Step 2: Dark-first tokens + theme seam** — in `src/app/globals.css`, define neutral semantic tokens under `:root` (dark values) and a `.light` override block; add `@import '../theme/sip/tokens.css'`. In `src/theme/sip/tokens.css`, override the accent variable(s) with the SIP brand hue — the **only** file carrying SIP colors.

- [ ] **Step 3: Dark default** — in `src/app/layout.tsx`, set `<html className="dark">` (SPEC-ui R1).

- [ ] **Step 4: Add Button + write failing test** — `pnpm dlx shadcn@latest add button`, then `src/core/ui/button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/core/ui/button'

test('renders a button with its label', () => {
  render(<Button>Ask</Button>)
  expect(screen.getByRole('button', { name: 'Ask' })).toBeInTheDocument()
})
```

- [ ] **Step 5: Run test to verify it fails** (before `button.tsx` exists / imports resolve)

Run: `pnpm test:run src/core/ui/button.test.tsx`
Expected: FAIL — cannot resolve `@/core/ui/button` (until `shadcn add button` has run in Step 4; if it errors on styling, fix the import path, not the test).

- [ ] **Step 6: Verify green**

Run: `pnpm test:run src/core/ui/button.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: design system with dark-first tokens, theme seam, and Button"
```

---

## Task 4: App shell

**Files:**
- Create: `src/components/app-shell.tsx`
- Modify: `src/app/layout.tsx` (wrap children), `src/app/page.tsx` (placeholder home), `e2e/smoke.spec.ts` (add landmark assertions)

**Interfaces:**
- Consumes: harness (Task 2), design tokens (Task 3).
- Produces: `<AppShell>` wrapping every page; `<header role="banner">` / `<footer role="contentinfo">` landmarks asserted by E2E + future a11y tests.

- [ ] **Step 1: Build the shell** — `src/components/app-shell.tsx` (Lucide icons only):

```tsx
import type { ReactNode } from 'react'
import { MessagesSquare } from 'lucide-react'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header role="banner" className="border-b">
        <div className="mx-auto max-w-3xl flex items-center gap-2 p-4">
          <MessagesSquare className="size-5" aria-hidden />
          <span className="font-semibold">SIP Community</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
      <footer role="contentinfo" className="border-t p-4 text-sm text-muted-foreground">
        <div className="mx-auto max-w-3xl">Async · privacy-respecting · open-source</div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Wire it** — wrap `{children}` in `src/app/layout.tsx` with `<AppShell>`. Set `src/app/page.tsx` body to `<h1>Ask & Answer</h1>` (placeholder).

- [ ] **Step 3: Extend the E2E smoke** — add to `e2e/smoke.spec.ts`:

```ts
test('home renders the app shell landmarks', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ask & Answer' })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})
```

- [ ] **Step 4: Run E2E green**

Run: `pnpm e2e`
Expected: PASS — banner, heading, contentinfo visible; dark theme applied.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: app shell with header, main, and footer landmarks"
```

---

## Task 5: Neon EU + Drizzle wiring

**Files:**
- Create: `src/lib/db/index.ts`, `src/lib/db/schema/index.ts`, `drizzle.config.ts`, `.env.example`, `src/lib/db/db.test.ts`
- Modify: `package.json` (db scripts), `.gitignore` (ensure `.env*.local` ignored)

**Interfaces:**
- Produces: `db` (Drizzle client) from `@/lib/db`; the schema barrel `@/lib/db/schema` every domain plan appends to; `pnpm db:generate` / `pnpm db:migrate`.

> **Human-gated:** create a Neon project in **EU (fra1)**, put its pooled connection string in `.env.local` as `DATABASE_URL`, and add it to CI + Vercel secrets. Steps below assume `DATABASE_URL` is set.

- [ ] **Step 1: Install** — `pnpm add drizzle-orm @neondatabase/serverless` and `pnpm add -D drizzle-kit`.

- [ ] **Step 2: DB client + empty barrel** — `src/lib/db/index.ts`:

```ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

const sql = neon(process.env.DATABASE_URL)
export const db = drizzle(sql, { schema })
```

`src/lib/db/schema/index.ts`: `export {}` (domains append their tables here). `.env.example`: `DATABASE_URL=postgresql://...  # Neon EU (fra1), pooled`.

- [ ] **Step 3: drizzle-kit config** — `drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

Scripts: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`.

- [ ] **Step 4: Write failing connection test** — `src/lib/db/db.test.ts`:

```ts
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

test('connects to Neon and runs a query', async () => {
  const result = await db.execute(sql`select 1 as ok`)
  expect(result.rows[0].ok).toBe(1)
})
```

- [ ] **Step 5: Run test to verify it fails** (before client exists / with no `DATABASE_URL`)

Run: `pnpm test:run src/lib/db/db.test.ts`
Expected: FAIL — throws "DATABASE_URL is not set" or module not found.

- [ ] **Step 6: Set `DATABASE_URL` and verify green**

Run: `pnpm test:run src/lib/db/db.test.ts`
Expected: PASS — `ok === 1` against Neon EU.

- [ ] **Step 7: Verify migration tooling** — `pnpm db:generate`.
Expected: runs clean, creates `drizzle/` meta with no tables (empty schema) — proves the pipeline before domains add tables.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: wire Drizzle client and drizzle-kit against Neon EU"
```

---

## Task 6: CI + GitLab mirror

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/mirror-gitlab.yml`

**Interfaces:**
- Produces: a PR/push gate (lint + typecheck + test + build) and a force-push mirror to GitLab on `main`/`master`.

> **Human-gated:** add repo secrets — `DATABASE_URL` (CI test/build) and `GITLAB_SSH_KEY` (mirror). `sip-protocol` is an approved mirror org.

- [ ] **Step 1: CI workflow** — `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [dev, main]
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:run
      - run: pnpm build
```

- [ ] **Step 2: Mirror workflow** — `.github/workflows/mirror-gitlab.yml`:

```yaml
name: Mirror to GitLab
on:
  push:
    branches: [main, master]
jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pixta-dev/repository-mirroring-action@v1
        with:
          target_repo_url: git@gitlab.com:sip-protocol/sip-community.git
          ssh_private_key: ${{ secrets.GITLAB_SSH_KEY }}
```

- [ ] **Step 3: Verify locally** — mirror exactly what CI runs:

Run: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test:run && pnpm build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "ci: add CI gate and GitLab mirror workflows"
```

---

## Task 7: Deploy walking skeleton to Vercel

**Files:** none (deploy/config only).

**Interfaces:**
- Produces: a live skeleton at `community.sip-protocol.org` — proves build → deploy → DNS before domain logic lands.

> **Human-gated (RECTOR / CIPHER):** create the Vercel project, set env (`DATABASE_URL` = Neon EU), configure the `community.sip-protocol.org` domain + DNS. Needs account access.

- [ ] **Step 1: Link + env** — `pnpm dlx vercel link` (select/create the project); add `DATABASE_URL` in Vercel (Production + Preview) → Neon EU.

- [ ] **Step 2: First deploy** — push `dev`, open a PR to `main` (Vercel builds a preview), or `pnpm dlx vercel --prod` for the initial production deploy.
Expected: build succeeds; the deployment URL renders the dark shell + "Ask & Answer".

- [ ] **Step 3: Domain** — add `community.sip-protocol.org` to the project; set the DNS record; wait for SSL.
Expected: `https://community.sip-protocol.org` serves the skeleton over HTTPS.

- [ ] **Step 4: Smoke the live URL**

Run: `curl -sI https://community.sip-protocol.org`
Expected: `HTTP/2 200`, HTML response.

- [ ] **Step 5: Tag the milestone**

```bash
git tag -a tier0-foundation -m "Tier 0 foundation: deployed skeleton on Neon EU"
```

---

## Self-Review

**Spec coverage (`SPEC-ui` + `MASTER-PRD` §6):**
- Serverless-all-Vercel topology → Tasks 5–7. ✓
- Neon EU + Drizzle → Task 5. ✓
- Radix + shadcn + Tailwind + Lucide, dark-first → Task 3. ✓
- `core/ui` vs `theme/` seam → Task 3 (`components.json` → `src/core/ui`; SIP colors isolated to `theme/sip/tokens.css`). ✓
- App shell + a11y landmarks → Task 4. ✓
- Test harness, 80%+ coverage capability (unit + E2E) → Task 2. ✓
- CI + GitLab mirror (handoff requirement) → Task 6. ✓
- Deploy to `community.sip-protocol.org` → Task 7. ✓
- Correctly deferred to domain plans: Better Auth/SIWS (`auth-identity`), thread/post schema (`forum-core`), pgvector/corpus (`ai-answers`).

**Placeholder scan:** No TBD/TODO. Every code step shows the actual code; every run step shows the exact command + expected result.

**Type consistency:** `truncateAddress` signature (Task 2) matches its later reuse; `db` from `@/lib/db` + barrel `@/lib/db/schema` (Task 5) consistent; `AppShell` landmarks (`banner`/`contentinfo`) match the E2E assertions (Tasks 2→4); `Button` import `@/core/ui/button` matches `components.json` aliases (Task 3).

**Ordering:** harness (Task 2) precedes every task that writes a test, so all red→green cycles are honest. No forward dependencies.

<!-- Satellite context file — extends the global hub (~/.claude/CLAUDE.md | ~/.pi/agent/AGENTS.md). Host-neutral; project-specific only. Do not duplicate hub standards here. -->

# SIP Community

> The open-source, serverless-first, AI-native community platform — SIP's official community home. *Sign in with your wallet. Ask anything. Get an instant answer sourced from SIP's own docs — refined by humans.*

**Ecosystem hub:** See [sip-protocol/sip-protocol/AGENTS.md](https://github.com/sip-protocol/sip-protocol/blob/main/AGENTS.md) for full ecosystem context.

**Status:** 🚧 **Spec / pre-MVP.** No application code yet — this repo currently holds the product design.

- 📄 **Product Requirements:** `docs/superpowers/specs/2026-07-04-sip-community-design.md`

Implementation begins after the PRD is finalized (see the PRD's §12 open decisions).

## Stack (scaffolded)

- Next.js (App Router, `src/app`) + TypeScript
- Drizzle ORM (`drizzle/` + `drizzle.config.ts`) — serverless-first DB
- Tailwind v4 (`postcss.config.mjs`)
- Vitest (`vitest.config.ts` + `vitest.setup.ts`) + Playwright E2E (`playwright.config.ts` + `e2e/`)
- ESLint (`eslint.config.mjs`)
- pnpm workspace (`pnpm-workspace.yaml`)

## Common Commands

```bash
pnpm install
pnpm dev          # dev server
pnpm build
pnpm test         # vitest
pnpm test:e2e     # playwright
pnpm typecheck    # tsc --noEmit
pnpm lint
```

## Notes

- Powered by [SIP Protocol](https://github.com/sip-protocol) — the privacy standard for Web3.
- Wallet sign-in + docs-grounded Q&A are the core product loop; consult the PRD before writing app code.
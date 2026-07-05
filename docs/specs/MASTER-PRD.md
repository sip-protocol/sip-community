# SIP Community — Master PRD

> **Status:** Living document — Tier 0 in design
> **Date:** 2026-07-04
> **Owner:** RECTOR (CIPHER assisting)
> **Repo:** `sip-protocol/sip-community` (primary) → later extraction to `RECTOR-LABS/stoa` (OSS)
> **License:** MIT
> **Related:** `sip-protocol/sip-protocol` (ecosystem), T3 Superteam growth deliverable ("launch a community")

This is the **umbrella document**. It owns the cross-cutting product definition, architecture, decisions, the canonical data model, and the index of domain specs. Each subsystem's deep design lives in its own `SPEC-<domain>.md` — see [§13](#13-spec-index). When a detail is domain-specific, it belongs in that SPEC, not here.

---

## 1. One-line summary

An open-source, **serverless-first, AI-native, privacy-respecting async community platform** — SIP's official community home, replacing the need for Discord — where members sign in with their **Solana wallet** (pseudonymously) and every question gets an **instant AI answer sourced from SIP's own docs/blog/SDK**, refined by humans.

---

## 2. Why this exists (context & goals)

SIP needs a community (a T3 Superteam growth deliverable). Rather than a surveillance-heavy chat platform, SIP dogfoods its own values: a community that is privacy-respecting, self-hosted, and owns its data. Built generic + MIT from commit #1 so the reusable core can later be **extracted** (not moved) into a standalone OSS product (`RECTOR-LABS/stoa`).

**Primary goals**
- **G1** — Ship a real, usable community **in weeks, not months** (fast-MVP).
- **G2** — Serve SIP's **dual audience**: app end-users *and* developers.
- **G3** — Be **useful on day one with zero human posts** (AI-answers-from-corpus solves the forum cold-start problem).
- **G4** — Coherent with SIP's thesis: **privacy-respecting, self-hosted, no third-party surveillance, own-your-data.**
- **G5** — Structured for a clean later **OSS extraction** without a rewrite.

**Success signals (first 90 days)**
- Community live at `community.sip-protocol.org`, indexable, answering questions.
- End-users self-serve support via AI answers + human threads.
- Developers ask/answer SDK/integration questions.
- Satisfies the Superteam "community" deliverable.

---

## 3. Audience & use cases

SIP's community is a **genuine dual audience**. This shapes structure and auth.

| Segment | Who | Auth | Primary needs |
|---|---|---|---|
| **App end-users** | sip-mobile / sip-app users (privacy wallet, private payments, DEX). Non/semi-technical. **Hold a Solana wallet, no GitHub.** | **SIWS (Solana)** | "How do I send a private payment?", troubleshooting, feature requests, announcements |
| **Developers** | SDK / circuits / integration builders | **GitHub OAuth** (optional wallet) | SDK usage, integration Q&A, contributing, deep technical threads |
| **Institutions / DAOs** | Compliance-minded integrators | Either | Compliance/viewing-key questions, evaluation, roadmap |

**Implication:** categories split into a **Users / Support** lane and a **Developers** lane (see `SPEC-forum-core`). The AI corpus must include **user-facing help**, not just SDK docs (see `SPEC-ai-answers`).

---

## 4. Non-goals (explicit scope discipline)

Deliberately **out of MVP** (some future, some never):

- ❌ **Real-time chat** — the community is async-first. (Decision A: async is enough.)
- ❌ **Headless SDK / plugin architecture / multi-package monorepo up front** — earned later when real consumers force the seam, not built on spec.
- ❌ **EVM wallet sign-in (SIWE)** — deferred; near-free to add later (official plugin), but no EVM users *yet*.
- ❌ **Email notifications** — MVP is in-app (+ RSS) only; email = PII + third-party = privacy tension. Opt-in email deferred.
- ❌ **Badges / trust levels / gamification / karma** — not now.
- ❌ **Shielded/encrypted posts** — community content is **public by design** (SEO + AI discoverability). The privacy here is **pseudonymous identity + zero tracking**, NOT hidden posts. Do not confuse with SIP's on-chain transaction privacy.
- ❌ **Native mobile app** — responsive web; sip-mobile deep-links into it.
- ❌ **Multi-tenant / white-label** — that is the `stoa` extraction, later.

---

## 5. Build tiers & roadmap

Build order is **Tier 0 → Tier 1**; **Tier 1 is the public-launch line** (§7, decision 1). Each tier ships and is valuable on its own (skateboard → bicycle → motorcycle).

### Tier 0 — "Ask & Answer" (~1–2 weeks) — internal/soft launch
- Public read (every thread SEO-indexable, no login to browse)
- **SIWS (Solana) sign-in** + **GitHub OAuth** to post
- Threads + markdown replies
- **AI answer from SIP corpus** on every new question, with sources
- Flat list, newest-first (no categories yet)
- Live at `community.sip-protocol.org`

**Tier 0 SPECs:** `SPEC-auth-identity`, `SPEC-forum-core`, `SPEC-ai-answers`, `SPEC-ui`.

### Tier 1 — "Real forum" (~+2 weeks) — PUBLIC LAUNCH
- Categories/tags (Users/Support + Developers lanes)
- Search — Postgres FTS (keyword) **+ pgvector (semantic)**
- Minimal pseudonymous profiles
- In-app notifications (+ RSS)
- Basic moderation (lock/delete/pin, admin/mod-only)

**Tier 1 SPECs (planned):** `SPEC-search`, `SPEC-moderation`, `SPEC-notifications` (+ profile/category depth folded into `forum-core`).

### Tier 2 — "AI-native depth" (post-launch, earned by usage)
- AI thread TL;DR / summaries · duplicate detection on post · title/tag suggestions · AI spam triage · "community knowledge assistant" over accumulated threads · reactions · mentions

---

## 6. Architecture

**All-serverless, all-Vercel — coherent with SIP's existing topology.**

```
Next.js (App Router, RSC)  ──────────────►  Vercel (Fluid Compute)
      │
      ├─ Better Auth (Drizzle adapter)  ── SIWS plugin (custom) + GitHub OAuth
      ├─ Drizzle ORM  ───────────────────  Neon Postgres  + pgvector   [EU / fra1]
      ├─ AI SDK  ─────────────────────────  Vercel AI Gateway (Claude default, provider-agnostic)
      ├─ Vercel Blob  ────────────────────  images/attachments
      └─ Vercel Cron  ────────────────────  corpus re-index (serverless, no daemon)
```

- **Framework:** Next.js App Router (matches SIP stack).
- **DB:** Neon Postgres + `pgvector`; **Drizzle** ORM. **Region: EU (fra1).**
- **Auth:** Better Auth (self-hosted). Detail → `SPEC-auth-identity`.
- **AI:** Vercel AI Gateway + AI SDK (model-agnostic; default strong Claude, cheap model for tags/summaries). Detail → `SPEC-ai-answers`.
- **Jobs:** Vercel Cron (indexing) — no persistent server (serverless-first pillar).
- **Deploy:** Vercel Git-integration auto-deploy → `community.sip-protocol.org`.

### 6.1 Modularization for extraction (design for the seam)

Single Next app, but with a **hard internal boundary** every SPEC must respect:

- **`core/`** — generic engine: schema, forum logic, auth wiring, AI pipeline, search. **No SIP-specific values.**
- **`config/` + `theme/`** — SIP branding, category seeds, corpus sources, copy.

Later extraction = lift `core/` into `RECTOR-LABS/stoa`; SIP keeps `config/`. **We design for the seam without building across it now.** Each SPEC declares its own `core`/`config` split.

The **presentation layer** (design system, app shell, shared components) and the **`theme/` seam** (SIP tokens/branding vs. neutral `core/ui` primitives) are specced in `SPEC-ui`. UI stack: **Tailwind CSS + Radix UI + shadcn/ui (copy-in, owned) + Lucide**, dark-first.

---

## 7. Cross-cutting decisions (resolved)

These bind every SPEC. Domain-local decisions live in the relevant SPEC.

### 7.1 Product shape
- **Async-only** (no real-time chat) — *Decision A*. Real-time is "a room, not the house" for a privacy protocol's community.
- **Path B fast-MVP** — ship in weeks; ruthless scope; no headless/plugin/multi-package architecture up front — earn it later.
- **Reading is public** (SEO + AI discoverability); auth only to post.

### 7.2 Auth — Better Auth, not Clerk (decision record)
1. **Privacy coherence** — Clerk parks members' identities on a third party: the exact "surveillance-ware" critique used to justify replacing Discord, at the login layer. Better Auth keeps identity in SIP's own Neon DB.
2. **OSS self-hostability** — `stoa` is meant to be one-click self-hostable / own-your-data. A proprietary auth SaaS taxes every self-hoster. Self-hosted auth keeps the core truly ownable.
3. **Wallet control** — self-hosted SIWS/SIWE we fully control; Solana especially (Clerk's Web3 is EVM-leaning).

**Cost accepted:** ~1–2 days to author the Solana SIWS plugin (tracked in `SPEC-auth-identity`, not hidden).

### 7.3 §12 defaults — confirmed

| # | Decision | Resolution |
|---|---|---|
| 1 | **Launch tier** | **Tier 1** = public-launch line (build Tier 0 → 1). |
| 2 | **AI answer mode** | **Proactive + clearly labeled + human-deferential.** |
| 3 | **AI model** | **Strong Claude via AI Gateway** for answers (correctness matters on security topics); **cheap model** for tags/summaries. |
| 4 | **Notifications** | **In-app + RSS only** (no email PII) for MVP. |
| 5 | **Categories** | The §6.2 seed set (Users/Support + Developers + General). Detail → `SPEC-forum-core`. |
| 6 | **Analytics** | **None / self-hosted opt-in only** (e.g. sip-umami), never third-party trackers. |
| 7 | **Neon region** | **EU (fra1).** |

### 7.4 Repo model
Y2 **dogfood-first** under `sip-protocol`, MIT + generic core from commit #1, cleanly modularized (`core/` vs `config/`) so the reusable core can later be **extracted** (not moved) into `RECTOR-LABS/stoa`. The name "stoa" belongs to that future OSS repo; this one stays `sip-community`.

---

## 8. Canonical data model

Single source of truth for the shared Neon/Postgres + Drizzle schema. Each SPEC details only **its** slice (columns, indexes, migrations) and must not redefine another domain's tables. Field names are indicative; final types land in the owning SPEC.

| Entity | Key fields | Owning SPEC | Tier |
|---|---|---|---|
| `user` | id, displayName (pseudonym), walletAddress?, githubId?, avatar?, role, createdAt | `auth-identity` | 0 |
| `account` / `session` / `verification` | Better Auth internals | `auth-identity` | 0 |
| `category` | id, lane (`users`\|`devs`\|`general`), slug, name, description, order | `forum-core` | 0¹ |
| `thread` | id, categoryId, authorId, title, body(md), tags[], status (`open`\|`locked`\|`pinned`), viewCount, createdAt, updatedAt | `forum-core` | 0 |
| `post` | id, threadId, authorId, body(md), parentId?, isAi(bool), aiSources(jsonb)?, createdAt, updatedAt, deletedAt? | `forum-core` | 0 |
| `embedding` | id, sourceType (`corpus`\|`thread`\|`post`), sourceUrl, chunk(text), vector(pgvector), updatedAt | `ai-answers` | 0 |
| `notification` | id, userId, type, refId, read, createdAt | `notifications` | 1 |
| `reaction` | postId, userId, type | `forum-core` (Tier 2) | 2 |

¹ The `category` table exists from Tier 0 (single "General" seed) but the dual-lane category UX is Tier 1.

**Extraction seam:** entities + logic live in `core/`; **category seed data** and **corpus sources** live in `config/`.

---

## 9. Non-functional requirements

Bind every SPEC unless a SPEC tightens them further.

- **Privacy:** no third-party trackers/ad-tech; minimal PII; pseudonymous; self-hosted data. Public content is intentional (SEO/AI), identity is protected.
- **Performance:** serverless cold-start-aware (Fluid Compute); server-render threads for SEO; paginate.
- **SEO / AI discoverability:** SSR + structured data (JSON-LD Q&A), sitemap, RSS — threads should rank and be LLM-citable.
- **Accessibility:** WCAG-minded (keyboard, contrast, semantics).
- **Security:** input validation/sanitization (markdown XSS), rate limiting, CSRF (Better Auth), least-privilege, no secrets in client. AI guardrails per `SPEC-ai-answers`.
- **Testing:** unit (auth plugin, AI pipeline, models) + E2E (post flow, sign-in). SIP norm: **80%+ coverage on new code**; TypeScript 2-space indent, no semicolons, explicit types on public APIs, validate at boundaries.

---

## 10. OSS extraction plan (`stoa`, later)

- Keep `core/` free of SIP specifics from commit #1.
- Trigger to extract: a real 2nd consumer OR proven maturity.
- At extraction: lift `core/` → `RECTOR-LABS/stoa` (MIT), publish `@rector-labs/stoa-*` packages, **publish the SIWS Better Auth plugin as a standalone community plugin** (upstream contribution / ecosystem goodwill — see `SPEC-auth-identity` §B1).
- SIP's repo keeps only `config/` + theme, consuming the published core.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Cold-start ghost town | AI answers useful from day one; seed from existing corpus; soft-launch first |
| AI gives wrong/harmful security answer | Strict guardrails, labeling, human-deferential, flag→collapse, logging (`SPEC-ai-answers`) |
| Spam / sybil (cheap wallet accounts) | Rate limits, new-account posting limits, mod tools; heavier anti-sybil later |
| Scope creep | Tier discipline + Non-goals (§4) |
| Own-infra maintenance burden | Serverless/low-ops; accept as the cost of data ownership |
| SIWS plugin effort unknowns | Timeboxed ~1–2 days; check community plugins first; fallback to custom |

---

## 12. Milestones

- **M0 (spec):** PRD → Master PRD + Tier-0 SPECs → implementation plans (writing-plans).
- **M1 (Tier 0, ~1–2 wk):** Next app + Neon/Drizzle + Better Auth (SIWS+GitHub) + threads/replies + AI answers + deploy. Soft launch.
- **M2 (Tier 1, ~+2 wk):** categories, search (FTS+semantic), profiles, in-app notifications, moderation. **Public launch.**
- **M3+ (Tier 2):** AI depth, reactions, mentions — iterate on real usage.

---

## 13. SPEC index

Domain specs. Tier-0 specs are authored now; Tier-1 specs are stubbed here and written when we reach Tier 1 (so they're informed by what Tier 0 teaches us).

| SPEC | Domain | Status | Tier | `core`/`config` |
|---|---|---|---|---|
| [`SPEC-auth-identity`](./SPEC-auth-identity.md) | Better Auth · SIWS custom plugin · GitHub OAuth · pseudonymous identity · sessions | ✍️ Design | 0 | core (SIWS plugin) |
| [`SPEC-forum-core`](./SPEC-forum-core.md) | threads · replies · markdown/sanitize · categories · statuses · edit/soft-delete | ✍️ Design | 0 | core + config (category seeds) |
| [`SPEC-ai-answers`](./SPEC-ai-answers.md) | corpus · Cron ingestion · chunk/embed · pgvector retrieval · AI Gateway routing · guardrails · presentation | ✍️ Design | 0 | core + config (corpus sources) |
| [`SPEC-ui`](./SPEC-ui.md) | design system · `theme/` seam · app shell · shared components · a11y/responsive/SSR baseline · page inventory | ✍️ Design | 0 | core (ui primitives) + theme (SIP tokens) |
| `SPEC-search` | Postgres FTS + pgvector semantic · unified results | 📋 Planned | 1 | core |
| `SPEC-moderation` | roles · lock/delete/pin/flag · rate-limits/sybil · AI spam triage (T2) | 📋 Planned | 1 | core |
| `SPEC-notifications` | in-app · RSS feeds · notification model | 📋 Planned | 1 | core |

---

*Master PRD — supersedes the monolithic `docs/superpowers/specs/2026-07-04-sip-community-design.md` (folded in here + per-domain SPECs). Domain detail lives in the SPECs above.*

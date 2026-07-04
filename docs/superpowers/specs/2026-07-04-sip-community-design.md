# SIP Community — Product Requirements Document (PRD)

> **Status:** DRAFT — pending RECTOR review
> **Date:** 2026-07-04
> **Owner:** RECTOR (CIPHER assisting)
> **Target repo:** `sip-protocol/sip-community` (primary) → later extraction to `RECTOR-LABS/stoa` (OSS)
> **License:** MIT
> **Related:** `sip-protocol/sip-protocol` (ecosystem), T3 Superteam growth deliverable ("launch a community")

---

## 1. One-line summary

An open-source, **serverless-first, AI-native, privacy-respecting async community platform** — SIP's official community home, replacing the need for Discord — where members sign in with their **Solana wallet** (pseudonymously) and every question gets an **instant AI answer sourced from SIP's own docs/blog/SDK**, refined by humans.

---

## 2. Why this exists (context & goals)

SIP needs a community (a T3 Superteam growth deliverable). Rather than a surveillance-heavy chat platform, SIP dogfoods its own values: a community that is privacy-respecting, self-hosted, and owns its data. Built generic + MIT from commit #1 so the reusable core can later be **extracted** (not moved) into a standalone OSS product (`RECTOR-LABS/stoa`).

**Primary goals**
- G1 — Ship a real, usable community **in weeks, not months** (fast-MVP).
- G2 — Serve SIP's **dual audience**: app end-users *and* developers.
- G3 — Be **useful on day one with zero human posts** (AI-answers-from-corpus solves the forum cold-start problem).
- G4 — Coherent with SIP's thesis: **privacy-respecting, self-hosted, no third-party surveillance, own-your-data.**
- G5 — Structured for a clean later **OSS extraction** without a rewrite.

**Success signals (first 90 days)**
- Community live at `community.sip-protocol.org`, indexable, answering questions.
- End-users self-serve support via AI answers + human threads.
- Developers ask/answer SDK/integration questions.
- Satisfies the Superteam "community" deliverable.

---

## 3. Non-goals (explicit scope discipline)

The following are **deliberately out of MVP** (some are future, some are never):

- ❌ **Real-time chat** — the community is async-first. (Decision A: async is enough.)
- ❌ **Headless SDK / plugin architecture / multi-package monorepo up front** — earned later when real consumers force the seam, not built on spec.
- ❌ **EVM wallet sign-in (SIWE)** — deferred; near-free to add later (official plugin), but no EVM users *yet*.
- ❌ **Email notifications** — MVP is in-app (+ RSS) only; email = PII + third-party = privacy tension. Opt-in email deferred.
- ❌ **Badges / trust levels / gamification / karma** — not now.
- ❌ **Shielded/encrypted posts** — community content is **public by design** (SEO + AI discoverability). The privacy here is **pseudonymous identity + zero tracking**, NOT hidden posts. (Important: do not confuse this with SIP's on-chain transaction privacy.)
- ❌ **Native mobile app** — responsive web; sip-mobile deep-links into it.
- ❌ **Multi-tenant / white-label** — that is the `stoa` extraction, later.

---

## 4. Audience & use cases

SIP's community is a **genuine dual audience**. This shapes structure and auth.

| Segment | Who | Auth | Primary needs |
|---|---|---|---|
| **App end-users** | sip-mobile / sip-app users (privacy wallet, private payments, DEX). Non/semi-technical. **Hold a Solana wallet, no GitHub.** | **SIWS (Solana)** | "How do I send a private payment?", troubleshooting, feature requests, announcements |
| **Developers** | SDK / circuits / integration builders | **GitHub OAuth** (optional wallet) | SDK usage, integration Q&A, contributing, deep technical threads |
| **Institutions / DAOs** | Compliance-minded integrators | Either | Compliance/viewing-key questions, evaluation, roadmap |

**Implication:** categories split into a **Users / Support** lane and a **Developers** lane (see §6). The AI corpus must include **user-facing help**, not just SDK docs.

---

## 5. Product scope — build tiers

Build order is **Tier 0 → Tier 1**; **Tier 1 is the public-launch line** (default — confirm in §12). Each tier ships and is valuable on its own (skateboard → bicycle → motorcycle).

### Tier 0 — "Ask & Answer" (~1–2 weeks) — internal/soft launch
- Public read (every thread SEO-indexable, no login to browse)
- **SIWS (Solana) sign-in** + **GitHub OAuth** to post
- Threads + markdown replies
- **AI answer from SIP corpus** on every new question, with sources
- Flat list, newest-first (no categories yet)
- Live at `community.sip-protocol.org`

### Tier 1 — "Real forum" (~+2 weeks) — PUBLIC LAUNCH
- Categories/tags (Users/Support + Developers lanes)
- Search — Postgres FTS (keyword) **+ pgvector (semantic)**
- Minimal pseudonymous profiles
- In-app notifications (+ RSS)
- Basic moderation (lock/delete/pin, admin/mod-only)

### Tier 2 — "AI-native depth" (post-launch, earned by usage)
- AI thread TL;DR / summaries · duplicate detection on post · title/tag suggestions · AI spam triage · "community knowledge assistant" over accumulated threads · reactions · mentions

---

## 6. Key features (MVP detail)

### 6.1 Threads & replies
- Markdown (sanitized), code blocks with syntax highlighting, links, images (via Vercel Blob).
- Thread = title + body + category + tags + author + status (open/locked/pinned).
- Reply = markdown body + author + optional parent (for threading AI answer under the question).
- Edit/delete own content; soft-delete retained for moderation.

### 6.2 Categories (dual-lane)
Seed set (SIP-specific config, not core):
- **Users / Support:** Getting Started · Payments & Wallet · Troubleshooting · Feature Requests · Announcements
- **Developers:** SDK · Circuits / ZK · Integrations · Contributing
- **General**

### 6.3 AI Answers — the differentiator (detailed)
The cold-start killer. **Proactive but clearly labeled** (default — confirm §12).

- **Corpus (v1 sources):** SIP docs (docs-sip), blog (25 posts, blog-sip), SDK/package READMEs (sip-protocol), curated app help (sip-app/sip-mobile guides), org profile. GitHub issues → Tier 2.
- **Ingestion:** scheduled **Vercel Cron** job → fetch → chunk → embed → store in **pgvector**. Re-index on content change. Serverless, no daemon.
- **Retrieval-augmented answer:** on new question (and on-demand "Ask AI"), embed query → semantic top-k from pgvector → LLM via **Vercel AI Gateway** (default a strong Claude model; cheaper models routed for tags/summaries) with a strict "answer only from provided sources; cite; if unsure, say so" system prompt.
- **Presentation:** AI reply badged **"🤖 AI answer — verify with sources,"** inline source links, visually **deferential to human replies** (a human "accepted answer" always outranks it). Users can mark *helpful* or *flag wrong*.
- **⚠️ Guardrails (SIP is security software — this is non-negotiable):**
  - System prompt forbids inventing addresses, keys, seed phrases, or commands.
  - On security/financial-sensitive topics: cite docs, disclaim, **defer to humans/official docs** — never present authoritative "do X with your funds" guidance.
  - Rate-limit generation; cache identical questions; log AI answers for review; flagged answers auto-collapse pending mod review.
- **Cost posture:** embeddings cheap; generation amortized (one stored answer serves many readers via SEO). Per-user rate limits + a monthly cost ceiling.

### 6.4 Auth & identity
**Better Auth (self-hosted, data in your own Neon).** See §8 for the "why not Clerk" rationale.

| Method | MVP | Notes |
|---|---|---|
| **SIWS (Solana)** | ✅ Primary | **Custom Better Auth plugin** we author: nonce → wallet signs SIWS message → verify **ed25519** sig (`tweetnacl`/`@solana/web3.js`). ~1–2 days. Check community-plugins first. |
| **GitHub OAuth** | ✅ | Official plugin, drop-in — for developers |
| **SIWE (Ethereum)** | ⏸️ Deferred | Official plugin, near-free later; no EVM users yet |

- **Identity model:** **wallet-first, pseudonymous by default.** Display = chosen handle or truncated wallet address. Optional GitHub link for devs who want reputation.
- **Privacy posture:** minimal PII, **no tracking / no ad-tech**, no email required. (Analytics, if any, self-hosted & privacy-preserving — e.g., existing sip-umami — TBD, opt-in only.)
- **Bonus workstream:** open-source the **SIWS Better Auth plugin** as a community plugin — SIP contributes to the Solana ecosystem, gains visibility. (See §9.)

### 6.5 Search
- **Keyword:** Postgres full-text search (tsvector/tsquery).
- **Semantic:** pgvector over thread/post embeddings (reuses the AI embedding pipeline).
- Unified results UI.

### 6.6 Notifications (MVP: in-app only)
- In-app: replies to your thread, mentions, mod actions.
- RSS feed per category / global (privacy-friendly, no PII).
- Email digests → deferred (opt-in, PII).

### 6.7 Moderation (MVP: minimal)
- Roles: member / moderator / admin.
- Actions: lock, delete (soft), pin, flag-review.
- AI spam triage → Tier 2.
- Sybil note: wallet auth is cheap to sybil → new-account posting rate limits + mod tools; heavier anti-sybil deferred.

---

## 7. Architecture

**All-serverless, all-Vercel — coherent with SIP's existing topology.**

```
Next.js (App Router, RSC)  ──────────────►  Vercel (Fluid Compute)
      │
      ├─ Better Auth (Drizzle adapter)  ── SIWS plugin (custom) + GitHub OAuth
      ├─ Drizzle ORM  ───────────────────  Neon Postgres  + pgvector
      ├─ AI SDK  ─────────────────────────  Vercel AI Gateway (Claude default, provider-agnostic)
      ├─ Vercel Blob  ────────────────────  images/attachments
      └─ Vercel Cron  ────────────────────  corpus re-index (serverless, no daemon)
```

- **Framework:** Next.js App Router (matches SIP stack).
- **DB:** Neon Postgres + `pgvector`; **Drizzle** ORM. (Region: US or EU — pick at provision.)
- **Auth:** Better Auth.
- **AI:** Vercel AI Gateway + AI SDK (model-agnostic; default strong Claude, cheap model for tags/summaries).
- **Jobs:** Vercel Cron (indexing) — no persistent server (serverless-first pillar).
- **Deploy:** Vercel Git-integration auto-deploy → `community.sip-protocol.org`.

### 7.1 Modularization for extraction (design for the seam)
Single Next app, but with a **hard internal boundary**:
- `core/` — generic engine: schema, forum logic, auth wiring, AI pipeline, search. **No SIP-specific values.**
- `config/` + `theme/` — SIP branding, category seeds, corpus sources, copy.
Later extraction = lift `core/` into `RECTOR-LABS/stoa`; SIP keeps `config/`. **We design for the seam without building across it now.**

---

## 8. Why Better Auth, not Clerk (decision record)

1. **Privacy coherence** — Clerk parks members' identities on a third party; the exact "surveillance-ware" critique used to justify replacing Discord, at the login layer. Better Auth keeps identity in SIP's own Neon DB.
2. **OSS self-hostability** — `stoa` is meant to be one-click self-hostable / own-your-data. A proprietary auth SaaS taxes every self-hoster. Self-hosted auth keeps the core truly ownable.
3. **Wallet control** — self-hosted SIWS/SIWE we fully control; Solana especially (Clerk's Web3 is EVM-leaning).

**Cost accepted:** ~1–2 days to author the Solana SIWS plugin (tracked, not hidden).

---

## 9. Data model (core entities, sketch)

- `user` (Better Auth) — id, displayName (pseudonym), walletAddress, githubId?, avatar, role, createdAt
- `account` / `session` / `verification` (Better Auth)
- `category` — id, lane (users|devs|general), slug, name, description, order
- `thread` — id, categoryId, authorId, title, body(md), tags[], status, viewCount, createdAt, updatedAt
- `post` — id, threadId, authorId, body(md), parentId?, isAi(bool), aiSources(jsonb)?, createdAt, updatedAt, deletedAt?
- `embedding` — id, sourceType(corpus|thread|post), sourceUrl, chunk(text), vector(pgvector), updatedAt
- `notification` — id, userId, type, refId, read, createdAt
- `reaction` (Tier 2) — postId, userId, type

Extraction seam: entities + logic in `core/`; category **seed data** in `config/`.

---

## 10. Non-functional requirements

- **Privacy:** no third-party trackers/ad-tech; minimal PII; pseudonymous; self-hosted data. Public content is intentional (SEO/AI), identity is protected.
- **Performance:** serverless cold-start-aware (Fluid Compute); server-render threads for SEO; paginate.
- **SEO / AI discoverability:** SSR + structured data (JSON-LD Q&A), sitemap, RSS — threads should rank and be LLM-citable.
- **Accessibility:** WCAG-minded (keyboard, contrast, semantics).
- **Security:** input validation/sanitization (markdown XSS), rate limiting, CSRF (Better Auth), least-privilege, no secrets in client. AI guardrails per §6.3.
- **Testing:** unit (auth plugin, AI pipeline, models) + E2E (post flow, sign-in) — per SIP's 80%+ norm on new code.

---

## 11. OSS extraction plan (`stoa`, later)

- Keep `core/` free of SIP specifics from commit #1.
- Trigger to extract: a real 2nd consumer OR proven maturity.
- At extraction: lift `core/` → `RECTOR-LABS/stoa` (MIT), publish `@rector-labs/stoa-*` packages, **publish the SIWS Better Auth plugin as a standalone community plugin** (upstream contribution / ecosystem goodwill).
- SIP's repo keeps only `config/` + theme, consuming the published core.

---

## 12. Open decisions / defaults to confirm

Defaults are chosen; **redline any of these**:

1. **Launch tier** — default **Tier 1** (build Tier 0 → Tier 1). Leaner Tier-0 launch possible.
2. **AI answer mode** — default **proactive but clearly labeled + human-deferential**. Alt: on-demand only.
3. **AI model** — default a **strong Claude model via AI Gateway** (correctness matters on security topics); cheap model for tags/summaries.
4. **Notifications** — default **in-app + RSS only** (no email PII) for MVP.
5. **Categories** — seed set in §6.2 — adjust freely.
6. **Analytics** — default **none / self-hosted opt-in only**. Confirm.
7. **Neon region** — pick US or EU at provision.

---

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Cold-start ghost town | AI answers useful from day one; seed from existing corpus; soft-launch first |
| AI gives wrong/harmful security answer | Strict guardrails, labeling, human-deferential, flag→collapse, logging |
| Spam / sybil (cheap wallet accounts) | Rate limits, new-account posting limits, mod tools; heavier anti-sybil later |
| Scope creep | Tier discipline + Non-goals (§3) |
| Own-infra maintenance burden | Serverless/low-ops; accept as the cost of data ownership |
| SIWS plugin effort unknowns | Timeboxed ~1–2 days; check community plugins first; fallback to custom |

---

## 14. Rough milestones

- **M0 (spec):** this PRD approved → repo `sip-protocol/sip-community` created (via repo-init) → implementation plan (writing-plans).
- **M1 (Tier 0, ~1–2 wk):** Next app + Neon/Drizzle + Better Auth (SIWS+GitHub) + threads/replies + AI answers + deploy. Soft launch.
- **M2 (Tier 1, ~+2 wk):** categories, search (FTS+semantic), profiles, in-app notifications, moderation. **Public launch.**
- **M3+ (Tier 2):** AI depth, reactions, mentions — iterate on real usage.

---

*End of PRD draft. Awaiting RECTOR review (§12 decisions especially).*

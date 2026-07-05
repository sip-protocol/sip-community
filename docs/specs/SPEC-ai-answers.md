# SIP Community — SPEC: AI Answers

> **Status:** Design · **Tier:** 0 · **Part of:** [`MASTER-PRD`](./MASTER-PRD.md)
> **Owner:** RECTOR (CIPHER assisting) · **Related:** [`SPEC-forum-core`](./SPEC-forum-core.md) (stores AI reply), [`SPEC-ui`](./SPEC-ui.md) (answer card), `SPEC-search` (reuses this pipeline — Tier 1)
> **Depends on:** Vercel AI Gateway + AI SDK, Neon + **pgvector**, Vercel Cron

---

## 1. Purpose & scope

The **cold-start killer** (G3): every new question gets an **instant AI answer sourced only from SIP's own corpus**, with citations — so the forum is useful with **zero human posts**. **Proactive but clearly labeled and human-deferential** (`MASTER-PRD` §7.3, decision 2). SIP is security software, so **guardrails are non-negotiable** (§6).

**In scope (Tier 0):** corpus ingestion (Cron), chunk + embed + store (pgvector), retrieval-augmented generation via AI Gateway, source citation, answer presentation contract, guardrails, rate-limit/cost controls.
**Out of scope:** semantic *search UI* (`SPEC-search`, Tier 1, reuses this pipeline), summaries/dedup/tag-suggestion/spam-triage (Tier 2), the answer card's *visual* (`SPEC-ui`).

---

## 2. Requirements

- **R1** — On **new thread**, generate an AI answer from corpus and post it as an `isAi` reply with `aiSources`.
- **R2** — Provide **on-demand "Ask AI"** on existing threads.
- **R3** — Answers **cite sources** (inline links) and **only** use retrieved context — no free recall.
- **R4** — Answer is **labeled** ("🤖 AI answer — verify with sources") and **outranked by any human accepted answer**.
- **R5** — On **security/financial-sensitive** topics: cite + disclaim + **defer to humans/official docs**; never authoritative "do X with your funds."
- **R6** — **Never invent** addresses, keys, seed phrases, or commands.
- **R7** — **Rate-limited**, **cached**, **logged**; flagged answers **auto-collapse** pending mod review.
- **R8** — Ingestion is **serverless** (Cron), idempotent, re-indexes on content change.

---

## 3. Design

### 3.1 Corpus (v1 sources — `config/`)
SIP docs (`docs-sip`), blog (~25 posts, `blog-sip`), SDK/package READMEs (`sip-protocol`), curated app help (sip-app/sip-mobile guides), org profile. GitHub issues → Tier 2. **Source list is `config/corpus.ts`** — generic pipeline, SIP-specific sources.

### 3.2 Ingestion pipeline (Vercel Cron → pgvector)
```
Cron (scheduled)  →  fetch source  →  detect change (etag/content-hash)
   →  chunk (token-aware, overlap)  →  embed (cheap model via AI Gateway)
   →  upsert embedding rows (idempotent, keyed by sourceUrl + chunkIndex)
```
No daemon (serverless-first). Unchanged sources skipped. Deleted sources pruned. Cron route protected by a Vercel Cron secret.

### 3.3 Retrieval-augmented answer
```
question  →  embed query  →  pgvector cosine top-k (k≈6, min-similarity threshold)
   →  assemble context (sources as DATA, clearly delimited)
   →  LLM via AI Gateway (strong Claude) with strict system prompt
   →  { answer, sources[] }  →  store as isAi post (forum-core)
```
If retrieval is **below threshold** (corpus doesn't cover it): return an honest "I don't have a sourced answer — a human will help," **not** a hallucination.

### 3.4 Model routing (AI Gateway — decision 3)
- **Answers:** strong Claude (Opus/Sonnet tier) — correctness matters on security topics.
- **Embeddings / tags / summaries:** cheap model (Haiku-class / embedding model).
- Model IDs are **env-config via AI Gateway** (provider-agnostic, swappable). Never hardcode model strings in `core/` logic — read from config.

### 3.5 Presentation contract (visual in `SPEC-ui`)
Badge "🤖 AI answer — verify with sources"; inline source links; visually **deferential** to human replies; ordering: **accepted answer → human replies → AI**. Users can mark **helpful** or **flag wrong** → flag triggers auto-collapse + mod queue.

---

## 4. Guardrails (non-negotiable — SIP is security software)

- **System prompt** forbids inventing addresses/keys/seeds/commands (R6); "answer **only** from provided sources; cite; if unsure, say so" (R3).
- **Security/financial deference** (R5): detect sensitive intent → force disclaim + defer to official docs/humans.
- **Prompt-injection defense:** retrieved corpus and the user question are **untrusted data**, not instructions. System prompt instructs the model to ignore any embedded "ignore previous instructions" / tool-invoking / role-changing text in sources or questions. Sources are wrapped in explicit delimiters.
- **Rate-limit** generation per user + global; **cache** identical/near-identical questions (normalized hash) — one stored answer serves many via SEO.
- **Log** every AI answer (prompt, sources, output, model) for review/audit.
- **Flag → collapse:** flagged answers auto-hide pending `SPEC-moderation`.
- **Cost ceiling:** monthly spend cap; degrade to on-demand-only if exceeded.

---

## 5. Data model (this domain's slice)

Owns `embedding`; **populates** `post.aiSources` (column owned by `forum-core`). Canonical shape in `MASTER-PRD` §8.

```ts
// sketch — SIP style
embedding {
  id, sourceType: 'corpus' | 'thread' | 'post',
  sourceUrl: text, chunk: text, vector: vector(1536) /*dim per model*/,
  contentHash: text /*change detection*/, updatedAt
}
```
**Index:** pgvector `hnsw` (or `ivfflat`) on `vector` for cosine. `unique(sourceUrl, chunkIndex)` for idempotent upserts. `thread`/`post` embeddings (for Tier-1 semantic search) reuse this table via `sourceType`.

---

## 6. Interfaces / API surface

- `GET /api/cron/reindex` — Cron-triggered ingestion (secret-protected).
- `generateAiAnswer({ threadId })` — server action, called on thread create (R1) + "Ask AI" (R2); rate-limited; writes an `isAi` post via `forum-core`.
- `embed(text)` / `retrieve(query, k)` — internal utilities (also used by `SPEC-search`).
- Inputs validated (zod); cron auth checked before any work.

---

## 7. `core` / `config` split

- **`core/`** — pipeline (chunk/embed/retrieve/generate), guardrail **prompt scaffold**, rate-limit/cost logic, pgvector access. Generic RAG engine.
- **`config/`** — corpus source list, model IDs, SIP-specific disclaimers/deference copy, thresholds. **No SIP source URLs or copy in `core/`.**

---

## 8. Testing

- **Unit:** chunker (bounds, overlap); retrieval ranking + threshold behavior; **below-threshold → honest no-answer** (not hallucinated); citation/source formatting; guardrail prompt assembly; **prompt-injection resistance** on crafted corpus/questions; model-ID read from config (no hardcode).
- **Integration:** ingest fixture corpus → retrieve → generate (mocked/gateway) → stored `isAi` post with `aiSources`; cache hit on repeat question; cron secret enforced.
- **Eval harness:** a small labeled set — security/financial questions must **defer**; in-corpus questions must **cite**; out-of-corpus must **decline**. Run in CI as a behavioral gate.
- **Coverage:** 80%+; guardrails treated as security-critical.

---

## 9. Open questions / future

- Embedding model + dimension (pin at build; `vector(N)` depends on it).
- Chunk size/overlap tuning against the real corpus.
- Re-index cadence (Cron frequency) vs. cost.
- Tier 2: summaries, dedup-on-post, tag suggestions, spam triage, knowledge assistant — all reuse this pipeline.

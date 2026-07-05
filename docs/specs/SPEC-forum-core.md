# SIP Community — SPEC: Forum Core

> **Status:** Design · **Tier:** 0 · **Part of:** [`MASTER-PRD`](./MASTER-PRD.md)
> **Owner:** RECTOR (CIPHER assisting) · **Related:** [`SPEC-auth-identity`](./SPEC-auth-identity.md) (post-gating), [`SPEC-ai-answers`](./SPEC-ai-answers.md) (AI reply), [`SPEC-ui`](./SPEC-ui.md) (screens)
> **Depends on:** Drizzle, Neon (EU/fra1), a sanitizing markdown pipeline, Vercel Blob

---

## 1. Purpose & scope

The **content engine**: threads, replies, categories, markdown rendering. Public, SEO-indexable reads; authenticated writes. This is the `core/` heart of the platform (and of the future `stoa` extraction).

**In scope (Tier 0):** thread + reply CRUD, sanitized markdown (code + images), the `category` table (seeded `General`), thread statuses, soft-delete, flat newest-first list, cursor pagination, SSR + structured data.
**Out of scope:** dual-lane category **UX** (Tier 1), search (`SPEC-search`), notifications (`SPEC-notifications`), moderation actions (`SPEC-moderation`), reactions/mentions (Tier 2), the AI answer generation itself (`SPEC-ai-answers` — this SPEC only stores/renders it).

---

## 2. Requirements

- **R1** — Anyone can **read** any thread without login (SSR, indexable).
- **R2** — Authenticated users **create threads and replies** (gate via `requireAuth()` from `auth-identity`).
- **R3** — Bodies are **markdown**, **sanitized** (XSS-safe), with code highlighting, links, and images (Vercel Blob).
- **R4** — A thread has title, body, category, tags, author, status (`open`|`locked`|`pinned`).
- **R5** — A reply may nest under a parent (`parentId`) — used to hang the **AI answer under the question**.
- **R6** — Authors **edit/delete their own** content; delete is **soft** (retained for moderation).
- **R7** — Lists are **paginated** (cursor), newest-first at Tier 0.
- **R8** — Every thread page emits **JSON-LD Q&A** + canonical URL for SEO/LLM-citability.

---

## 3. Design

### 3.1 Threads & replies
- **Thread** = `title` + `body(md)` + `categoryId` + `tags[]` + `authorId` + `status` + `viewCount` + timestamps. Slug = `{id-short}-{kebab(title)}` for stable, readable URLs.
- **Post (reply)** = `body(md)` + `threadId` + `authorId` + `parentId?` + `isAi` + `aiSources?` + timestamps + `deletedAt?`.
- **AI answer** is a `post` with `isAi = true`, typically `parentId` = the opening post, `aiSources` = jsonb citation list (written by `ai-answers`). A human **accepted answer** always outranks it in ordering (`ai-answers` §presentation).
- **View count:** incremented server-side, deduped per session; best-effort (not transactional).

### 3.2 Markdown pipeline (security-critical)
`unified`/`remark` → `rehype` with **sanitize** (allowlist schema) → render. This is the **single XSS enforcement point** — no `dangerouslySetInnerHTML` of unsanitized input anywhere. Code blocks highlighted with **Shiki** (build/server-side, no client cost). Links get `rel="nofollow ugc noopener"`. Images restricted to Vercel Blob origins + `https:`; size/type validated on upload. The renderer component lives in `SPEC-ui` (`MarkdownRenderer`); this SPEC owns the **sanitize schema** contract.

### 3.3 Categories (table now, lanes later)
`category` = `lane` (`users`|`devs`|`general`) + `slug` + `name` + `description` + `order`. **Tier 0 seeds a single `General`.** Full dual-lane seed set (Getting Started, Payments & Wallet, SDK, Circuits/ZK, …) is **`config/`** data applied at **Tier 1**. Seeds live in `config/categories.ts`, never in `core/`.

### 3.4 Editing, deletion, lifecycle
- Edit own post → updates `body`, bumps `updatedAt`. No full edit history at MVP.
- Delete own post → sets `deletedAt` (soft); rendered as "[deleted]", body retained for mod review.
- Status transitions (`lock`/`pin`) are **mod-only** → defined in `SPEC-moderation`; the columns exist here.

### 3.5 Rendering & SEO
- Thread pages are **Server Components**, fully SSR'd. Composer/menus are client islands.
- **JSON-LD** `QAPage` → `Question` (opening post) + `suggestedAnswer`/`acceptedAnswer` (replies). Sitemap + canonical URLs. RSS wiring lands with `SPEC-notifications`; the feed data source (threads) is defined here.

---

## 4. Data model (this domain's slice)

Owns `category`, `thread`, `post` (and `reaction`, Tier 2). Canonical shape in `MASTER-PRD` §8.

```ts
// sketch — SIP style (2-space, no semicolons); final types at implementation
thread {
  id, categoryId -> category.id, authorId -> user.id,
  title: text, body: text /*md*/, tags: text[], 
  status: 'open' | 'locked' | 'pinned' = 'open',
  viewCount: integer = 0, createdAt, updatedAt
}
post {
  id, threadId -> thread.id, authorId -> user.id, parentId -> post.id?,
  body: text /*md*/, isAi: boolean = false, aiSources: jsonb?,
  createdAt, updatedAt, deletedAt?
}
```

**Indexes:** `thread(createdAt desc)` for the list; `post(threadId, createdAt)` for thread view; `thread(categoryId)`; FTS `tsvector` columns added by `SPEC-search` (Tier 1). Cursor pagination on `(createdAt, id)`.

---

## 5. Interfaces / API surface

Next.js **Server Actions** / route handlers, all write paths behind `requireAuth()`:

- `createThread({ title, body, categoryId, tags })` → thread (validated: title len, body len, tag count).
- `createReply({ threadId, body, parentId? })` → post.
- `editPost({ postId, body })` / `softDeletePost({ postId })` — author-only (mods via `moderation`).
- `listThreads({ cursor, limit })` → paginated, newest-first (public).
- `getThread(slug)` → thread + posts, ordered (accepted answer → humans → AI) (public).
- `uploadImage(file)` → Vercel Blob URL (auth, type/size validated).

Inputs validated with **zod** at every boundary (R3, security). Rate-limited (coordinate with `moderation`).

---

## 6. `core` / `config` split

- **`core/`** — schema, thread/post logic, markdown sanitize contract, pagination, SEO/JSON-LD builders. Generic forum engine.
- **`config/`** — category seed data, tag vocabulary hints, SIP copy. **No SIP category names in `core/`.**

---

## 7. Security

- **XSS** — the markdown sanitize allowlist is the crux; adversarial tests mandatory (§8).
- **AuthZ** — edit/delete restricted to author; mod overrides via `moderation`; status changes mod-only.
- **Upload** — MIME + magic-byte + size checks; Blob-only origins; strip EXIF.
- **Rate limiting** — per-user thread/reply creation caps; new-account cooldown (`auth-identity` R7 + `moderation`).
- **Input validation** — zod on every action; length/tag/URL bounds.

---

## 8. Testing

- **Unit:** markdown sanitize against an **XSS vector corpus** (`<script>`, `onerror=`, `javascript:` URLs, data URIs, SVG payloads); slug generation; cursor pagination edges; ordering (accepted → human → AI).
- **Integration:** create thread → reply → edit → soft-delete; author-only guard; view-count dedupe.
- **E2E:** post a thread, see it SSR-render with sanitized markdown + JSON-LD present; anonymous read works, anonymous write blocked.
- **Coverage:** 80%+; markdown sanitization treated as security-critical.

---

## 9. Open questions / future

- Tag model: freeform vs. curated? (MVP: freeform, capped count; curate at Tier 1).
- Accepted-answer mechanism: author-marks vs. mod-marks (default: thread author marks; mods can override).
- Profiles depth (Tier 1) folds in here.

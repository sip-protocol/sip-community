# SIP Community — SPEC: Auth & Identity

> **Status:** Design · **Tier:** 0 · **Part of:** [`MASTER-PRD`](./MASTER-PRD.md)
> **Owner:** RECTOR (CIPHER assisting) · **Related:** [`SPEC-forum-core`](./SPEC-forum-core.md) (post-gating), [`SPEC-ui`](./SPEC-ui.md) (sign-in screens)
> **Depends on:** Better Auth, Drizzle adapter, Neon (EU/fra1), `@solana/web3.js` + `tweetnacl`

---

## 1. Purpose & scope

Self-hosted, pseudonymous authentication for SIP's **dual audience**. **SIWS (Sign-In With Solana) is primary** (app end-users hold wallets, not GitHub); **GitHub OAuth is additive** (developers who want reputation). Identity lives in **our own Neon DB** (Better Auth), never on a third party — see `MASTER-PRD` §7.2 (Better Auth, not Clerk).

**In scope (Tier 0):** SIWS sign-in (custom Better Auth plugin), GitHub OAuth, session management, pseudonymous identity model, account linking, sign-up rate limiting.
**Out of scope:** SIWE/Ethereum (deferred), email/password, profiles depth (`forum-core`, Tier 1), heavy anti-sybil (`moderation`, Tier 1), the sign-in UI itself (`SPEC-ui`).

---

## 2. Requirements

- **R1** — Reading is public; **auth is required only to post** (enforced with `forum-core`).
- **R2** — A user signs in with a **Solana wallet** via SIWS, or with **GitHub**.
- **R3** — Identity is **pseudonymous by default**: display = chosen handle, else truncated wallet (`AbcD…wXyZ`) or GitHub login.
- **R4** — A user needs **at least one** identity (`walletAddress` or `githubId`); either suffices. Both can be **linked to one account** for dual reputation.
- **R5** — Sessions are cookie-based, httpOnly, secure, `SameSite=Lax`, CSRF-protected (Better Auth).
- **R6** — **No PII collected.** No email required or stored for auth. No third-party trackers in the auth flow.
- **R7** — New-account creation is **rate-limited** (wallet auth is cheap to sybil).

---

## 3. Design

### 3.1 Better Auth setup
Better Auth with the **Drizzle adapter** over Neon Postgres. Server handler mounted at `/api/auth/[...all]`. Cookie sessions (no JWT in client). Providers enabled: **GitHub** (official) + **SIWS** (custom plugin, §3.2). Exact Better Auth config APIs are **verified against current docs (Context7) at implementation** — this SPEC fixes the design, not the call signatures.

### 3.2 SIWS — custom Better Auth plugin (the ~1–2 day cost)
Better Auth ships an **official SIWE (Ethereum)** plugin but **no official Solana SIWS** plugin. **First action at build time: check the Better Auth community-plugins registry** — if a solid, maintained Solana plugin exists, adopt it. Otherwise we author our own (and open-source it — §7 / B1).

**Flow (challenge–response, replay-safe):**

```
client                              server
  │  POST /siws/nonce  ───────────►  issue single-use nonce, bind to
  │                                   {nonce, domain, issuedAt, expiresAt}, persist
  │  ◄──────────────────────────────  nonce + SIWS message to sign
  │  wallet signs SIWS message
  │  POST /siws/verify {msg, sig, pubkey} ─►  1. nonce exists, unused, unexpired
  │                                            2. domain matches (anti-phishing)
  │                                            3. ed25519 verify(sig, msg, pubkey)
  │                                            4. burn nonce; upsert user by walletAddress
  │  ◄──────────────────────────────  session cookie
```

**Message format:** CAIP-122 / "Sign in with Solana" convention — `domain`, `address`, `statement`, `nonce`, `issuedAt`, `expirationTime`. Domain-bound to prevent cross-site replay; short expiry (e.g. 5 min); nonce single-use.

**Verification (sketch, SIP style — no semicolons):**

```ts
import nacl from 'tweetnacl'
import { PublicKey } from '@solana/web3.js'

export function verifySiws(message: string, signature: Uint8Array, address: string): boolean {
  const pubkey = new PublicKey(address) // throws on non-base58 / wrong length
  return nacl.sign.detached.verify(
    new TextEncoder().encode(message),
    signature,
    pubkey.toBytes(),
  )
}
```

Nonce store: a `verification`-style row (Better Auth) or a dedicated `siwsNonce` table keyed by nonce, with `expiresAt` and `consumedAt`. Reject reused/expired nonces.

### 3.3 GitHub OAuth
Better Auth's **official GitHub provider** — drop-in. Stores `githubId`, login, avatar. For developers; optional. Linkable to an existing wallet account (R4).

### 3.4 SIWE (Ethereum) — deferred
Official Better Auth plugin, near-free to add later. No EVM users yet. Tracked in `MASTER-PRD` §4 non-goals.

### 3.5 Identity model
- `displayName` — chosen handle; falls back to truncated `walletAddress` or GitHub login.
- `walletAddress?` / `githubId?` — at least one present (R4); both allowed (linked).
- `avatar?` — from GitHub, or a deterministic identicon from the wallet address.
- `role` — `member` | `moderator` | `admin` (default `member`).
- **Account linking:** signed-in user can add the *other* method; both map to one `user`.

---

## 4. Data model (this domain's slice)

Owns `user` + Better Auth internals (`account`, `session`, `verification`) — canonical shape in `MASTER-PRD` §8.

| Column (`user`) | Type | Notes |
|---|---|---|
| `id` | text/uuid (PK) | Better Auth id |
| `displayName` | text | pseudonym; unique-ish, validated |
| `walletAddress` | text? unique | base58 Solana pubkey; nullable |
| `githubId` | text? unique | nullable |
| `avatar` | text? | url or identicon seed |
| `role` | enum | `member`\|`moderator`\|`admin` |
| `createdAt` | timestamptz | |

`account` / `session` / `verification` follow Better Auth's Drizzle schema. Nonce storage per §3.2. **Constraint:** DB-level check that `walletAddress` or `githubId` is non-null (R4).

---

## 5. Interfaces / API surface

- `POST /api/auth/[...all]` — Better Auth handler (GitHub, session, sign-out).
- `POST /siws/nonce` → `{ nonce, message }` — issue challenge.
- `POST /siws/verify` `{ message, signature, publicKey }` → session — verify + sign in.
- `getSession()` — server-side helper (RSC/route handlers) for auth state + `requireAuth()` guard used by `forum-core` write actions.
- `linkAccount(provider)` — add wallet or GitHub to current user.

All inputs validated at the boundary (zod): base58 address shape, signature length (64 bytes), message schema.

---

## 6. `core` / `config` split

- **`core/`** — SIWS plugin, auth wiring, session helpers, identity model, guards. **No SIP specifics.**
- **`config/` + `theme/`** — enabled providers list, sign-in copy/branding, SIWS `statement` string, rate-limit thresholds.

---

## 7. Security & guardrails

- **Nonce:** single-use, short expiry, domain-bound → no replay / cross-site.
- **Signature:** strict ed25519 verify; validate pubkey is valid base58 32-byte; reject malformed early.
- **Anti-phishing:** SIWS message `domain` must match request origin.
- **Sessions:** httpOnly + secure + `SameSite=Lax`; CSRF via Better Auth; rotate on privilege change.
- **Least data:** no email/PII; store only what identity needs.
- **Sybil:** per-IP + global new-account rate limits (R7); posting cooldown for brand-new accounts coordinated with `moderation`.
- **B1 (bonus workstream):** open-source the SIWS Better Auth plugin as a community plugin (`MASTER-PRD` §10) — Solana ecosystem contribution.

---

## 8. Testing

- **Unit:** `verifySiws` happy path; tampered signature → false; wrong pubkey → false; expired nonce → reject; reused nonce → reject; non-base58 address → throws/validates; message schema validation.
- **Integration:** full nonce → sign → verify → session; GitHub OAuth callback; account linking (wallet + GitHub → one user); R4 DB constraint.
- **E2E:** sign in with wallet then post; unauthenticated post attempt is gated; sign-out clears session.
- **Coverage:** 80%+ on new code (SIP norm). The SIWS verifier is security-critical → exhaustive adversarial cases.

---

## 9. Open questions / future

- Confirm at build: does a maintained community SIWS plugin exist? (adopt vs. author).
- Wallet-adapter UX (Phantom/Solflare/Backpack) — which adapters to support in `SPEC-ui` sign-in.
- Optional ENS-style handle uniqueness / claim rules (defer).

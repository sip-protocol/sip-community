# SIP Community — SPEC: UI & Design System

> **Status:** Design · **Tier:** 0 · **Part of:** [`MASTER-PRD`](./MASTER-PRD.md)
> **Owner:** RECTOR (CIPHER assisting) · **Related:** every domain SPEC (screens sit on this system)
> **Depends on:** Next.js App Router (RSC), **Tailwind CSS**, **Radix UI** + **shadcn/ui** (copy-in), **Lucide** icons

---

## 1. Purpose & scope

The **presentation layer** and the **design system**. This SPEC owns the cross-cutting UI: design tokens, the **`theme/` seam**, app shell, shared components, and the a11y/responsive/SSR baseline. **Each domain SPEC specs its own screens on top of this system** — the design system lives in one place; screens are distributed.

**In scope (Tier 0):** design tokens + theme seam, app shell/layout, shared component inventory, the `MarkdownRenderer`, responsive + a11y + SSR baselines, the Tier-0 page inventory.
**Out of scope:** domain screen logic (in each domain SPEC), pixel-level visual comps (done with the `frontend-design` skill at **build time** — this SPEC sets the system, not the final look).

---

## 2. Requirements

- **R1** — **Dark-first** theme (fits a privacy/security protocol); light theme optional/secondary.
- **R2** — **Responsive, mobile-first** — app end-users are on phones (sip-mobile deep-links in).
- **R3** — **WCAG-minded a11y**: keyboard nav, focus management, AA contrast, semantic HTML, reduced-motion, alt text.
- **R4** — **SSR-friendly**: RSC by default, minimal client JS; interactive bits are client islands. Supports `forum-core`'s SEO/JSON-LD.
- **R5** — Consistent **loading / empty / error** states for every async surface.
- **R6** — **Own the components** (shadcn copy-in) in `core/ui`; SIP look is applied only via `theme/`.
- **R7** — **Icons: Lucide only** — never Unicode emoji as UI icons (house style; status emoji in docs/copy are fine).

---

## 3. Design

### 3.1 Stack & rationale
**Tailwind** (tokens + utilities) · **Radix UI** (headless, accessible primitives) · **shadcn/ui** (Radix + Tailwind components copied into the repo — *owned*, not a versioned dependency) · **Lucide** (shadcn default). The copy-in model mirrors the project's own thesis: no proprietary UI SaaS, fully self-hostable, cleanly extractable to `stoa` by swapping `theme/`.

### 3.2 Design tokens & the `theme/` seam
- Tokens: color (dark-first semantic palette + SIP accent), typography scale, spacing, radius, shadow, motion — expressed as **Tailwind theme + CSS variables**.
- **`core/ui`** ships **neutral** tokens + the primitives. **`theme/sip`** supplies SIP palette, logo, fonts, copy by overriding the CSS variables. `stoa` reskins by replacing `theme/` only.
- Dark-first: default `:root` is dark; `.light` opt-in. Contrast validated at AA in **both**.

### 3.3 App shell & layout
- **Header:** logo, primary nav, sign-in / user menu (Radix `DropdownMenu`), theme toggle.
- **Main:** content column, readable measure, generous type for long-form threads.
- **Footer:** RSS, docs/links, license.
- **Mobile nav:** Radix `Dialog`/drawer. Route groups: `app/(public)` (readable without auth) and auth-gated actions.

### 3.4 Shared components (`core/ui`, shadcn-based)
Primitives: `Button`, `Input`, `Textarea`, `Dialog`, `DropdownMenu`, `Avatar`, `Badge`, `Tabs`, `Toast`, `Card`, `Skeleton`, `Tooltip`.
App-level (generic, themable): **`MarkdownRenderer`** (renders `forum-core`'s sanitize contract — the **single safe-render point**, no raw HTML injection), `CodeBlock` (Shiki), `ThreadCard`, **`AiAnswerCard`** (the labeled, human-deferential AI answer surface from `ai-answers` §3.5), `Pagination`, `EmptyState`, `ErrorState`, `SignInButtons` (wallet + GitHub).

### 3.5 Page inventory (Tier 0)
- **Home** — flat thread list, newest-first, "Ask" CTA.
- **Thread detail** — question + replies + AI answer card; SSR + JSON-LD (from `forum-core`).
- **New-thread composer** — markdown editor + preview (client island).
- **Sign-in** — SIWS (wallet adapters) + GitHub (`auth-identity`).
- **Profile shell** — minimal pseudonymous profile (depth in Tier 1).
- **404 / 500 / auth-gated** states.

### 3.6 Rendering & performance
RSC by default; client components only where interactive (composer, menus, toasts, theme toggle, wallet connect). No heavy client state libs at MVP. Fluid-Compute/cold-start aware; stream where it helps.

---

## 4. Interfaces / conventions

- Component API conventions: typed props, composition over config, `asChild` (Radix) for polymorphism, `cn()` for class merging.
- Route-group structure and layout composition (shared `<AppShell>`).
- Consumes: `getSession()` (`auth-identity`) for auth-aware chrome; `MarkdownRenderer` sanitize contract (`forum-core`); `AiAnswerCard` data shape (`ai-answers`).

---

## 5. `core` / `config` / `theme` split

- **`core/ui`** — components, shell, neutral tokens, a11y behavior. **Generic; no SIP look.**
- **`theme/`** — SIP palette, logo, fonts, copy (CSS-variable overrides).
- **`config/`** — nav items, footer links, enabled wallet adapters, feature copy.

---

## 6. Security

- **Render safety:** `MarkdownRenderer` is the enforcement point — only sanitized output (`forum-core` §3.2); no `dangerouslySetInnerHTML` of untrusted input; CSP-friendly (no inline event handlers).
- **Images:** Blob-origin allowlist; `next/image` with configured domains.
- **No third-party UI trackers/embeds** (privacy NFR).

---

## 7. Testing

- **Component (RTL):** shared primitives render + interaction; `MarkdownRenderer` renders sanitized markdown and **drops XSS payloads** (shared corpus with `forum-core`); loading/empty/error states.
- **a11y:** `axe` checks on key pages; keyboard-nav flows (open menu, submit composer, dialog focus-trap); AA contrast in dark **and** light.
- **E2E (with domains):** post flow renders on the real design system; responsive layout at mobile/desktop breakpoints.
- **Coverage:** 80%+ on new components.

---

## 8. Open questions / future

- Wallet-adapter set for `SignInButtons` (Phantom / Solflare / Backpack?) — confirm with `auth-identity`.
- Visual direction (typography pairing, accent, density) — resolved with `frontend-design` at build time; this SPEC fixes the system, not the comps.
- Light theme priority (ship dark-only first, add light in Tier 1?).
- Tier 1 UI: category lanes, search UI (`SPEC-search`), notification center (`SPEC-notifications`), profile depth.

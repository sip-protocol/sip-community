<div align="center">

# SIP Community

**The open-source, serverless-first, AI-native community platform — SIP's official community home.**

*Sign in with your wallet. Ask anything. Get an instant answer sourced from SIP's own docs — refined by humans.*

[![Status](https://img.shields.io/badge/status-spec%20%2F%20pre--MVP-orange.svg)](docs/superpowers/specs/2026-07-04-sip-community-design.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Powered by [SIP Protocol](https://github.com/sip-protocol) — the privacy standard for Web3.**

</div>

---

## Status

🚧 **Spec / pre-MVP.** No application code yet — this repo currently holds the product design.

- 📄 **Product Requirements:** [`docs/superpowers/specs/2026-07-04-sip-community-design.md`](docs/superpowers/specs/2026-07-04-sip-community-design.md)

Implementation begins after the PRD is finalized (see the PRD's §12 open decisions).

---

## What this is

A privacy-respecting, async community platform for the SIP ecosystem — serving **app end-users** (sip-mobile / sip-app wallet holders) *and* **developers** integrating the SDK.

- **Serverless-first** — deploys on Vercel; no persistent servers to run.
- **AI-native** — every question gets an AI answer grounded in SIP's docs/blog/SDK, with sources. The AI is a participant, not a bolted-on button.
- **Privacy-respecting** — wallet sign-in, pseudonymous by default, no tracking, no ad-tech, data in our own database. We practice what we ship.
- **Own-your-data** — self-hosted auth and storage; no third-party surveillance layer.

Community content is **public by design** (for discoverability). The privacy here is in *identity* (pseudonymous) and *no surveillance* — not hidden posts. This is distinct from SIP's on-chain transaction privacy.

## Planned stack

Next.js (App Router) · Neon Postgres + pgvector · Drizzle ORM · Better Auth (Solana SIWS + GitHub) · Vercel AI Gateway · Vercel (Blob, Cron) — deployed to `community.sip-protocol.org`.

## Roadmap (from the PRD)

- **Tier 0 — Ask & Answer:** read, wallet/GitHub sign-in, threads, AI answers. *(soft launch)*
- **Tier 1 — Real forum:** categories, search (keyword + semantic), profiles, notifications, moderation. *(public launch)*
- **Tier 2 — AI-native depth:** summaries, dedup, tag suggestions, spam triage, knowledge assistant.

## Open source

Built MIT + generic from day one. The reusable core is designed to be **extracted** later into a standalone, self-hostable OSS community platform. The Solana **SIWS** plugin we build is intended to be contributed back to the Better Auth ecosystem.

## License

[MIT](LICENSE)

# Implementation Plan

This is the build-order plan for BidPilot Pakistan. The full architectural plan lives in `SPEC.md`. This document tracks **what was built**, **what's next**, and **how to verify each milestone**.

## Stack

```
Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4
shadcn/ui · Framer Motion (motion package) · Lucide · Recharts · React Hook Form · Zod
Firebase Auth · Firestore · Firebase Storage · Firebase Admin SDK
pdf-parse · mammoth · cheerio (installed in later milestones)
AI: provider-agnostic abstraction (OpenAI / Anthropic / Gemini via env vars)
```

> Note: The scaffold pulled Next.js 16 + Tailwind v4. Key Next.js 16 differences from older guides:
> - `middleware.ts` is now **`proxy.ts`** (function exported as `proxy`).
> - `cookies()`, `headers()`, and route `params`/`searchParams` are **async** — `await` them.
> - Tailwind v4 uses `@import "tailwindcss"` and `@theme` blocks in CSS — no `tailwind.config.ts`.

## Milestones

| # | Milestone | Status |
|---|---|---|
| **1** | **Project setup, UI shell, routing, Firebase config structure, auth screens** | **in progress** |
| 2 | Company onboarding form + Firestore write | pending |
| 3 | Dashboard with empty states + seeded demo data | pending |
| 4 | Website analysis (scrape + AI extract) | pending |
| 5 | Capability library UI + proposal sample upload + style analysis | pending |
| 6 | RFP workspace create + file upload to Storage + text extraction | pending |
| 7 | RFP AI analysis (requirements, deadlines, eval criteria, mandatory clauses) | pending |
| 8 | Capability matching + compliance checklist | pending |
| 9 | Proposal generator (section-by-section, editable) | pending |
| 10 | Win probability + GO/NO-GO dashboard | pending |
| 11 | Time-saved card + dashboard polish | pending |
| 12 | Export (HTML/print → DOCX stretch) | pending |
| 13 | Demo seed data + safe demo reset | pending |
| 14 | UI polish pass (skeletons, motion, error boundaries) | pending |
| 15 | Build/lint/typecheck + demo dry run | pending |

## Milestone 1 — checklist

- [x] Initialize Next.js 16 + TypeScript + Tailwind v4 (via create-next-app)
- [x] Install dependencies (firebase, firebase-admin, motion, lucide-react, recharts, react-hook-form, zod, @hookform/resolvers, class-variance-authority, clsx, tailwind-merge, sonner, tw-animate-css)
- [ ] Write SPEC.md, IMPLEMENTATION_PLAN.md, FIREBASE_SCHEMA.md, AI_PROMPTS.md
- [ ] Configure shadcn/ui + add base components
- [ ] Globals.css with dark enterprise theme tokens
- [ ] Firebase client + admin config (env-driven)
- [ ] Auth provider context + login/signup forms (RHF + Zod)
- [ ] `/api/auth/session` (POST/DELETE) and `/api/auth/signup`
- [ ] `proxy.ts` route gating
- [ ] Landing page (`/`)
- [ ] App shell layout — sidebar + top bar
- [ ] Placeholder pages: dashboard, onboarding, company-profile, capability-library, workspaces, settings
- [ ] `pnpm/npm run lint` zero errors
- [ ] `npm run build` zero TS errors

## Verification

### After every milestone
```
npm run lint      # zero errors
npm run typecheck # zero errors
npm run build     # zero errors
npm run dev       # manual smoke test of new feature
```

### End-to-end (after Milestone 15)
The 17-step demo flow from `SPEC.md` runs without errors in under 3 minutes with the seeded company + seeded RFP + seeded proposal sample.

## What's still needed from the user

| Item | Needed by | Status |
|---|---|---|
| Firebase project + credentials (Web app config + service-account JSON) | Milestone 1 (to actually run) | pending |
| AI provider + API key (OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY) | Milestone 4 | pending |
| Professional winning proposal sample (PDF/DOCX) | Milestone 5 | pending |
| Sample RFP/tender document (PDF) | Milestone 6 | pending |
| Hackathon deadline / time available | informational | pending |

## What we deliberately won't build

- Multi-tenant enterprise roles
- Payments
- Aggressive cross-domain crawling
- Vector DB
- Admin panel
- Pixel-perfect DOCX before core features

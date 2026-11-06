# NIVASA — RWA Lifecycle Infrastructure Prototype

> **SIMULATED DEMO · NOT A REAL OFFERING**  
> This prototype is built for **ETHGlobal Mumbai (November 2026)**. It is an engineering exploration of a verifiable real-world-asset (RWA) lifecycle infrastructure. It makes NO legal title, regulatory approval, or investment claims.

---

## 1. Overview & Problem Statement

Real-world asset tokenization often stops at minting a token. NIVASA demonstrates the full connected lifecycle for a fictional Mumbai commercial property (`PROPERTY-MH-001`):
1. **Evidence Verification:** Maharashtra statutory land-record verification (Index II, 7/12, encumbrance).
2. **Attestation & Manifest:** Merkle root anchored to token document metadata.
3. **Evidence-Gated Issuance (D1):** On Hedera Testnet via Asset Tokenization Studio (ATS).
4. **Transfer Restrictions:** KYC-enforced token transfer rules with rejection proofs.
5. **Recoverable Settlement (D4):** Atomic supply reservation, outbox pattern, and background reconciliation.
6. **Evidence Drift (D2):** Unscheduled title/encumbrance changes pause token transfers on-chain.
7. **Public Verify (D3):** Public zero-PII cryptographic verification page.
8. **AI Asset Intelligence (D5):** Change analysis executed on 0G Private Computer (TEE).

---

## 2. Pinned Technical Stack

- **Framework:** Next.js 15.0.3 (App Router, Strict TypeScript)
- **Styling & Tokens:** Tailwind CSS 3.4.15 with semantic design tokens (UI §3.5)
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, pg_trgm, pgcrypto)
- **Ledger:** Hedera Testnet (Chain ID 296) via Asset Tokenization Studio (ATS)
- **TEE / AI Compute:** 0G Private Computer
- **Validation:** Zod 3.23.8 (server-only fail-closed environment validation)
- **Testing:** Vitest 2.1.4

---

## 3. Local Development

### Prerequisites
- Node.js `v22.18.0` (or `>=20.x`)
- npm `10.9.3`

### Installation
```bash
npm install
```

### Environment Verification
Check that required environment variables are configured (names only):
```bash
npm run env:check
```

### Available Scripts
- `npm run dev`: Start Next.js development server
- `npm run build`: Production build and page generation
- `npm run typecheck`: Strict TypeScript typechecking (`tsc --noEmit`)
- `npm run lint`: Next.js ESLint validation
- `npm run test`: Vitest test suite
- `npm run adversarial`: Adversarial and invariant test suite (placeholder)

---

## 4. Security & Compliance Invariants

- **No Float Math:** Financial values use arbitrary-precision decimals (`lib/money/decimal.ts`).
- **Separation of Duties:** Enforced via PostgreSQL triggers (Verifier ≠ Issuer, Proposer ≠ Approver).
- **Outbox Pattern:** Zero synchronous on-chain calls in HTTP route handlers.
- **Fail-Closed:** Unreachable reads return `UNAVAILABLE`. Production refuses to run with demo flags.


# NIVASA — UI/UX Specification

**Document:** UI.md  
**Product:** NIVASA — India-first real-world-asset (RWA) lifecycle infrastructure prototype  
**Version:** 1.0  
**Date:** 6 November 2026  
**Status:** Implementation source of truth for the frontend  
**Depends on:** `NIVASA — Architecture V4 and Execution Source of Truth.md` and `PRD.md`  
**Design reference:** [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)  
**Frontend:** Next.js App Router, TypeScript, Tailwind CSS

> **Authority and conflict rule:** Architecture V4 and PRD define product behavior, security, data truth, roles, state machines, and scope. This document defines how those requirements are presented and interacted with. It must not weaken, rename, bypass, or imply completion of a backend rule. If a UI idea conflicts with either source-of-truth document, Architecture V4 / PRD wins.

---

## 1. Product and design intent

NIVASA is not a real-estate marketplace, trading terminal, or public investment solicitation site. It is a prototype that demonstrates one complete, honest, verifiable asset lifecycle for one fictional Mumbai commercial property:

**Evidence review → rights definition → evidence-gated ATS issuance → eligible-investor participation → recoverable settlement → evidence-drift pause/resume → public verification → AI-explained change analysis.**

The interface must make that lifecycle understandable to a first-time judge without pretending that a document hash proves title, that a human demo review is legal verification, that testnet tokens represent actual ownership, or that simulated payment represents money movement.

### 1.1 Core UX principles

1. **Truth before persuasion.** Clearly show what is simulated, what is reported, what was reviewed, and what is actually confirmed on Hedera.
2. **Evidence before presentation.** Every important property or offering assertion should expose its provenance, evidence reference, timestamp, and limitation where applicable.
3. **One asset, one lifecycle.** The UI follows the lifecycle of the single demo property. Do not add marketplace discovery, multi-property browsing, secondary trading, AMM, or portfolio speculation features.
4. **Readable by non-technical users; inspectable by technical users.** Lead with plain-language status and explanation. Make hashes, transaction IDs, contract references, request IDs, and raw state inspectable in expandable technical-detail sections.
5. **Fail closed and show uncertainty.** A chain read that fails is `UNAVAILABLE`, not PASS. A pending transaction is not confirmed. A model failure does not hide deterministic metrics.
6. **Never hide workflow ownership.** The issuer, verifier, investor, admin, and public visitor have distinct capabilities. Hide unavailable actions, but also rely on server-side authorization; UI visibility is not security.
7. **Show state changes, not just current status.** Timeline, version history, previous decisions, and transaction attempt history are first-class UI elements.
8. **Accessible, responsive, restrained.** High contrast, semantic HTML, keyboard access, visible focus, reduced-motion support, and responsive layouts are mandatory.

### 1.2 Experience outcomes

A judge should be able to answer these questions from the interface:

- What fictional asset is being demonstrated, and what information is simulated?
- Which evidence documents were submitted and reviewed?
- Which exact evidence manifest version was approved?
- What rights does the demo token represent, and what does it not represent?
- Why was issuance allowed or blocked?
- Which wallet is bound and eligible in the demo?
- What is the difference between a pending order and a chain-confirmed holding?
- What happened when settlement was interrupted?
- What changed in the evidence, why was issuance paused, and what had to happen before it resumed?
- Can a stranger independently verify the on-chain references and hash checks?
- Which facts were supplied to 0G, what did the model explain, and what could it not determine?

---

## 2. UI/UX Pro Max design direction

The referenced UI/UX Pro Max catalog and reasoning data were consulted for the following product matches:

| Catalog match | Skill recommendation | NIVASA application |
|---|---|---|
| Fintech/Crypto | Trust-first; Minimalism & Swiss Style + Accessible & Ethical; navy / trust / gold mood; avoid playful crypto styling and AI gradients | Financial clarity, precise labels, clear chain status, no neon crypto aesthetic |
| Real Estate/Property | Glassmorphism + Minimalism & Swiss Style; hero-centric and feature-rich public presentation; trust blue, gold and white mood | Premium property presentation, but evidence and workflow screens remain clean and functional |
| Financial Dashboard | Data-dense dashboard; accuracy and high contrast are paramount | Clear account summaries, holdings, orders, chain-sync state, and accessible data tables |
| Next.js | Server Components by default; Client Components only for interaction; route-level loading and error boundaries; optimized images | Server-rendered reads and narrowly-scoped client interactions |
| Typography catalog | Professional and elegant pairings, with strong body readability | Inter for product UI/data; restrained editorial serif only for selected marketing headings |
| UX catalog | Keyboard, focus, reduced-motion, responsive, and visible state guidance | Applied throughout every role and public screen |

**Chosen blend:** Minimalism & Swiss Style (primary) + Soft UI Evolution (supporting) + restrained Real Estate editorial presentation. Use glass effects only for occasional overlays or navigation surfaces when contrast remains strong. Do not use glassmorphism as the base visual language for evidence tables, financial figures, forms, or verification results.

### 2.1 Design personality

- Calm, confident, institutional, premium, precise.
- Warm rather than cold: ivory surfaces, natural green, restrained gold.
- Technical without looking like a developer console.
- Premium property imagery is used to identify the demo asset, not to imply a live property listing.
- The visual system should feel credible even when all sample data is clearly labeled simulated.

### 2.2 What NIVASA must not look like

- A crypto casino, token price terminal, meme-coin dashboard, or NFT marketplace.
- A public real-estate listing portal with search filters, “buy now” buttons, or many properties.
- A government portal or an app implying government endorsement.
- A bank or regulated investment product.
- A dashboard dominated by neon purple/pink gradients, animated token prices, 3D coins, glass cards with low contrast, or decorative charts.
- A generic AI chatbot. 0G is one evidence-grounded explanation capability inside Property Intelligence, not the product's visual identity.

---

## 3. Color system

Use the previously selected NIVASA palette as the brand source. The skill's financial/property recommendations inform hierarchy and accessibility, but do not replace the approved forest-green / warm-ivory identity.

### 3.1 Brand colors

| Token | Hex | Use |
|---|---|---|
| `--brand-primary` | `#142B27` | Primary navigation, primary CTA, hero backgrounds, strong headings on light surfaces |
| `--brand-secondary` | `#24483D` | Secondary brand surfaces, active navigation, secondary CTA |
| `--brand-accent` | `#C39A60` | Muted-gold emphasis, small highlights, selected indicators, decorative rules |
| `--surface-page` | `#F5F3ED` | Main application background |
| `--surface-card` | `#FFFFFF` | Main cards, forms, tables and content panels |
| `--surface-muted` | `#E5E9E3` | Secondary panels, nested cards, selected neutral surfaces |
| `--text-primary` | `#27332F` | Main text and headings on light surfaces |
| `--text-secondary` | `#59685F` | Supporting text, descriptions, metadata on light surfaces |
| `--border` | `#DFE3DC` | Subtle separators and card borders |
| `--focus` | `#24483D` | Keyboard focus ring |

### 3.2 Semantic colors

| Token | Hex | Meaning |
|---|---|---|
| `--status-success` | `#1F704B` | Confirmed success / positive deterministic movement |
| `--status-warning` | `#94600E` | Attention required / approaching expiry / review needed |
| `--status-danger` | `#A93E36` | Failure, rejected, revoked, or destructive action |
| `--status-info` | `#176B87` | Neutral information, chain references, explanatory guidance |
| `--status-pending` | `#59685F` | Pending / processing / waiting for confirmation |

Status meaning must never rely on color alone. Every badge includes a text label and, where useful, a status icon. Use accessible text and iconography alongside the color.

### 3.3 Contrast rules

- Body text must meet WCAG AA contrast (minimum 4.5:1).
- Large text and meaningful UI graphics must meet at least 3:1.
- Use `#59685F` instead of the earlier lighter `#77847B` for secondary text on ivory; the lighter value is too low-contrast for small text.
- Use forest text (`#142B27`) on gold (`#C39A60`), not white text on gold.
- Use white text on primary forest (`#142B27`) or evergreen (`#24483D`).
- Use `#A93E36` rather than the lighter `#C65D55` for red status text on light surfaces.
- `--border` is for separation, not for small text or icon-only meaning.
- Do not use opacity to make important text “subtle” if doing so harms contrast.

### 3.4 Usage proportions

Suggested visual balance (not a strict runtime calculation):

- 60–70% light neutrals (`surface-page`, `surface-card`).
- 20–25% forest/evergreen brand surfaces and text.
- 5–10% muted gold, semantic status, and supporting accents.

Gold is a premium accent, not a second primary color. Green is not always success: the brand green must not cause a paused or pending state to look successful.

### 3.5 CSS custom properties

```css
:root {
  color-scheme: light;

  --brand-primary: #142B27;
  --brand-secondary: #24483D;
  --brand-accent: #C39A60;

  --surface-page: #F5F3ED;
  --surface-card: #FFFFFF;
  --surface-muted: #E5E9E3;

  --text-primary: #27332F;
  --text-secondary: #59685F;
  --border: #DFE3DC;
  --focus: #24483D;

  --status-success: #1F704B;
  --status-warning: #94600E;
  --status-danger: #A93E36;
  --status-info: #176B87;
  --status-pending: #59685F;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  --shadow-card: 0 2px 8px rgba(20, 43, 39, 0.06);
  --shadow-popover: 0 12px 32px rgba(20, 43, 39, 0.14);

  --motion-fast: 150ms;
  --motion-normal: 220ms;
  --motion-slow: 300ms;
}
```

Do not create a parallel palette in page-level styles. Components must consume semantic tokens rather than hard-coded hex values.

---

## 4. Typography

### 4.1 Font roles

| Role | Font | Use |
|---|---|---|
| Display / selected editorial headings | Playfair Display | Landing-page hero or occasional property name treatment only |
| Product UI, body, forms, navigation | Inter | Default font across authenticated app and public verify pages |
| Technical identifiers | JetBrains Mono | Hashes, transaction IDs, wallet addresses, contract IDs, request IDs and correlation IDs |

The UI must remain fully usable if external font loading fails. Use sensible serif / sans-serif / monospace fallbacks. Avoid using serif fonts for dense tables, numerical KPIs, status labels, transaction details, or form copy.

### 4.2 Type scale

| Token | Size / line height | Weight | Typical use |
|---|---|---|---|
| Display | 48–56 / 1.08 | 500–600 | Landing hero only; responsive down to 36 px on mobile |
| H1 | 32 / 1.2 | 600 | Page heading |
| H2 | 24 / 1.25 | 600 | Major section heading |
| H3 | 18–20 / 1.35 | 600 | Card and panel heading |
| Body | 15–16 / 1.55 | 400 | Paragraphs, form copy and descriptions |
| Body small | 14 / 1.45 | 400 | Secondary content; maintain AA contrast |
| Label | 12–13 / 1.3 | 600 | Field labels, overlines, table metadata |
| Technical | 12–13 / 1.5 | 400–500 | Monospaced identifiers |

Do not make body text smaller than 14 px on desktop or mobile. Avoid all-caps for long sentences; reserve it for short overlines such as `ASSET LIFECYCLE` and `TESTNET REFERENCE`.

### 4.3 Numeric typography

- Use tabular numerals for values that update or align in columns.
- Currency is formatted in INR (`₹`) with Indian digit grouping (for example `₹10,00,00,000`).
- Keep percentage precision consistent and state the formula where relevant.
- Do not convert database money strings to JavaScript floating-point numbers for display calculations.
- Technical identifiers must wrap or have a copy action; do not truncate without a way to inspect the full value.

---

## 5. Layout, spacing and responsive behavior

### 5.1 Grid and page width

- Desktop content max width: 1440 px.
- Standard reading width: 1120–1240 px.
- Public marketing hero may use a wider container for imagery.
- Main dashboard grid: 12 columns on wide desktop, 8 columns on tablet, 4 columns on mobile.
- Use a 24 px desktop gutter, 16 px tablet gutter, and 16 px mobile gutter.
- Prefer an 8 px spacing rhythm; common gaps are 8, 12, 16, 24, 32 and 48 px.

### 5.2 Breakpoints

| Viewport | Layout behavior |
|---|---|
| `≤ 639px` (small mobile) | Single column; compact top bar; bottom navigation for investor area; full-width actions; tables become cards or horizontal scroll with clear labels |
| `640–767px` | Single-column content with wider cards; compact navigation |
| `768–1023px` (tablet) | Collapsible side navigation; 2-column KPI grid; review panels stack when needed |
| `1024–1439px` (desktop) | Full application shell; 12-column content grid; persistent left navigation |
| `≥ 1440px` | Centered max-width content; avoid stretching tables or paragraphs excessively |

Test at 375 px, 768 px, 1024 px and 1440 px at minimum.

### 5.3 Application shell

Authenticated application shell:

- Left sidebar on desktop (240–256 px expanded; 72 px collapsed).
- Top header with page title/breadcrumb, current role label, profile menu, and wallet state when relevant.
- Persistent prototype banner directly below the header or at the top edge of the app frame.
- Main content area with a consistent 24–32 px inset on desktop and 16 px on mobile.
- Avoid a second competing navigation bar inside every page.

Public pages use a simpler header: NIVASA wordmark, `How it works`, `Public Verify`, `Prototype limits`, and a restrained `Open demo` action where applicable.

### 5.4 Navigation by role

| Role | Primary navigation |
|---|---|
| Public visitor | Overview, Demo lifecycle, Public Verify, Prototype limits |
| Issuer | Overview, My property, Evidence checklist, Manifests, Rights & offering |
| Verifier | Review queue, Property reviews, Eligibility reviews, Decision history |
| Investor | Overview, Demo offering, Wallet & eligibility, Orders & holdings, Property Intelligence |
| Admin | Operations, Offerings, Orders & reconciliation, Audit log, Demo controls |

The UI may expose read-only views across roles where allowed by the PRD, but every mutation must be permission-checked on the server. Do not add a role switcher that lets a user self-assign a different role. For the demo, a seeded role/account selector can be provided only through a clearly identified demo account switch flow, backed by authentication and server-authorized accounts; never allow a normal user to choose their own role.

---

## 6. Global trust and prototype requirements

### 6.1 Persistent simulation banner — every route

Display on every public and authenticated page:

**`SIMULATED DEMO · NOT A REAL OFFERING`**

Supporting detail (available inline or in an info popover):

> NIVASA is a technical prototype using one fictional Maharashtra commercial property and simulated figures. It does not offer real investments, establish property ownership, or imply government approval.

The banner must:

- Be visible without scrolling.
- Remain visible on mobile.
- Not be dismissible.
- Use a distinct neutral/amber treatment, not a celebratory green success treatment.
- Be screen-reader accessible and have clear text, not color-only signaling.

### 6.2 Additional demo-mode banners

When enabled, show persistent contextual banners:

- `SIMULATED PAYMENT ENABLED` when `DEMO_PAYMENTS=true`.
- `FAULT INJECTION ENABLED (DEMO)` when `DEMO_FAULTS=true`.
- `SCRIPTED PROPERTY EVENTS ENABLED (DEMO)` when `DEMO_EVENTS=true`.

The frontend must reflect actual server-provided flag state, not infer it from a local toggle. These features must be visibly disabled when not available. Their server-side production refusal remains mandatory.

### 6.3 Disclosure language

Use consistent plain-language copy:

- “Fictional demo property”
- “Simulated value” / “Issuer-reported” / “Public-source snapshot” / “Demo review completed”
- “Technical integrity check”
- “On-chain reference”
- “Testnet transaction”
- “Simulated payment”
- “Fit with your stated preferences”
- “Analysis temporarily unavailable”

Avoid:

- “Government verified”, “government approved”, “DELTA compliant”, “clear title”, “legally verified”, “guaranteed”, “safe investment”, “recommended investment”, “investment suitability”, “ownership token”, “buy property”, “invest now”, or any real-world claim not established by the source-of-truth documents.
- Calling the property “verified” without specifying that this refers to a simulated review workflow.
- Calling an order “settled” before reconciliation.

### 6.4 Legal/prototype footer

Every public page and every offering/verify page includes a concise footer statement:

> Technical prototype only. This page does not establish title, legal validity, regulatory authorization, or investment suitability. DELTA references are inspired by a proposed framework and do not mean NIVASA is compliant with or approved under it.

---

## 7. Route and screen map

The route names below follow the Architecture V4 repository shape and PRD screen requirements. Where the exact authenticated route segment is not fixed by the source documents, use the recommended route labels below consistently; do not create extra product scope.

| Route | Access | Screen |
|---|---|---|
| `/` | Public | Landing / lifecycle overview |
| `/offerings/[id]` | Public read; actions gated by auth/role | Single demo offering detail |
| `/dashboard` | Authenticated | Role-aware home / overview |
| `/issuer` | Issuer | Issuer dashboard |
| `/issuer/properties/[id]` | Issuer | Property evidence workspace |
| `/verifier` | Verifier | Review queue |
| `/verifier/properties/[id]` | Verifier | Manifest review and decision |
| `/verifier/eligibility/[id]` | Verifier | Eligibility review |
| `/investor` | Investor | Investor dashboard |
| `/investor/wallet` | Investor | Wallet binding and eligibility status |
| `/investor/orders/[id]` | Order owner | Order detail and settlement timeline |
| `/intelligence/[propertyId]` | Authorized user | Property Intelligence |
| `/admin/ops` | Admin | Operations, outbox and reconciliation |
| `/admin/audit` | Admin | Read-only audit view |
| `/admin/demo` | Admin + demo flags | Flag-gated demo controls |
| `/verify/offering/[id]` | Public, no login | Public offering verification |
| `/verify/receipt/[token]` | Public, unguessable token | Shareable receipt verification |

### 7.1 Public and authenticated navigation

- Public visitors do not see controls for issuing, approving, granting eligibility, or creating orders.
- The offering detail page may show the lifecycle and public technical information without authentication.
- Investor actions require a valid investor session and server-confirmed eligibility.
- The Verify page must remain usable without login and must not reveal private documents or personal data.
- The receipt page shows no name or email; wallet address is shortened and may be expanded/copyable only as specified by the PRD.

---

## 8. Screen specifications

## 8.1 Landing page (`/`)

**Goal:** Explain the lifecycle gap and show how NIVASA proves a single demo asset lifecycle. The page is not a property acquisition funnel.

### Layout order

1. Public header + persistent simulation banner.
2. Hero: “Make every step of an asset lifecycle verifiable.” Supporting line explains evidence, rights, issuance controls, settlement recovery, and public checks.
3. Primary CTA: `Explore the demo lifecycle` (scrolls to lifecycle overview or opens the demo offering).
4. Secondary CTA: `Open public verification` (links to the demo verify page).
5. Small factual context strip: `Hedera Testnet`, `0G Private Computer`, `One fictional Maharashtra asset`, each labeled as prototype context.
6. Lifecycle overview: eight steps shown as a sequence: Evidence → Rights → Gate → Participate → Recover → Restrict → Drift / Resume → Verify & Explain.
7. Differentiator sections D1–D5 in priority order; D6 appears as “India-first evidence context” only when implemented.
8. “What NIVASA demonstrates / What NIVASA does not claim” split section.
9. Public verification preview with PASS / FAIL / UNAVAILABLE explanation, but only show real page data; never hard-code green passes.
10. Footer with prototype and legal limitations.

### Hero content rules

- Use a single strong property/architecture image or abstract property detail visual; do not create a rotating carousel of fictional properties.
- Never show invented social proof, investor counts, transaction volume, annual return badges, or fake customer testimonials.
- Don't make the hero “Earn 7.2%” or “Own real estate from ₹X”.
- If sample numbers appear, label them simulated and define the formula nearby.

### Landing page interaction

- CTA targets must be keyboard reachable and use semantic links/buttons.
- Lifecycle steps can expand to show a short explanation and linked screen.
- Avoid scroll-jacking and parallax effects that interfere with reading.

## 8.2 Demo offering page (`/offerings/[id]`)

**Goal:** Explain the specific demo asset, token rights, evidence state, issuance gate, and chain references.

### Layout

**Top section**
- Breadcrumb: `Demo offering`.
- Offering name: `NIVASA-MH-001`.
- Asset reference: `PROPERTY-MH-001`.
- Prominent state pill from the canonical offering state (`draft`, `proposed`, `legal_review_pending`, `approved_for_demo`, `token_configured`, `active`, `paused`, `paused_evidence_drift`, `closed`). Human label maps to canonical state; keep canonical value in technical details.
- Persistent simulation banner.
- If status is `paused_evidence_drift`, show a high-visibility warning banner: `Issuance paused: evidence changed on [date], re-review in progress.` Explain that new orders are refused and a token pause may also halt holder-to-holder transfers.

**Asset overview**
- One fictional Mumbai commercial property image/illustration.
- City/locality and property type.
- `SIMULATED` valuation and asset facts, each with provenance.
- Annual rent, gross yield and calculation formula only when seeded values and evidence references exist.
- Do not present rent/yield as forecast, guaranteed return, or net yield.

**Rights summary**
- What the token represents (simulated economic interest; subject to the rights document).
- What it does not represent (title, land ownership, voting/control unless explicitly stated in the rights document).
- Income entitlement, transfer, redemption and risk disclosures from the current versioned rights document.
- Rights version and recomputed SHA-256 / on-chain document hash comparison.
- `Read full demo rights document` link.

**Evidence panel**
- Current manifest version and status.
- Completeness score with clear explanation: “Weighted checklist completeness — not a title-clearance score.”
- Document count by status.
- Manifest root, manifest hash, approval date and reviewer-role separation result.
- Link to public Verify page.

**Token / chain panel**
- ATS asset reference, contract/EVM address (when confirmed), Hedera Testnet chain ID 296.
- Cap and current supply as read from ATS; distinguish chain-confirmed from database-reported values.
- Rights and evidence-manifest document anchors with read-back state.
- HashScan links only when real transaction IDs / addresses are available.
- Last chain sync time and pending state if Mirror Node data is delayed.

**Participation panel (investor only)**
- Shows wallet status and eligibility state.
- Explain that participation is simulated and uses no real money.
- Button labels: `Connect demo wallet`, `Request eligibility review`, `Review demo rights`, `Create simulated order`.
- Never use `Invest`, `Buy now`, `Guaranteed`, or other live-offer language.
- The order flow cannot be enabled unless server state shows the offering is active and the investor is eligible with a chain-registered wallet.

### Offering UI states

| Canonical / source state | UI treatment |
|---|---|
| `token_configured` | Neutral state; show which activation-gate checks remain incomplete |
| `active` | Show “Demo offering active” plus explicit simulated label; participation still checks eligibility |
| `paused` | Warning; show manual pause reason and date if available |
| `paused_evidence_drift` | Warning / fail-closed; refuse new order actions and explain review required |
| `closed` | Neutral closed state; actions disabled |
| chain state unavailable | `UNAVAILABLE` for chain checks; do not infer state from database alone |

## 8.3 Issuer dashboard (`/issuer`)

**Goal:** Let the issuer create and maintain the fictional property evidence package without being able to approve its own submission.

### Dashboard modules

- Property workspace summary (one demo property).
- Property workflow status and current manifest version.
- Checklist completeness score and explanation.
- Required documents missing, expired, pending review, rejected or verified.
- Current offering workflow status and rights version.
- Recent activity timeline: upload, manifest submitted, reviewer decision, evidence drift, pause/resume.

### Property evidence workspace (`/issuer/properties/[id]`)

**Checklist table fields**

- Document type.
- Required / optional label.
- Current status.
- Source / issuing authority.
- Received date.
- Valid-until date when applicable.
- File name and safe preview/download affordance.
- SHA-256 (expandable, copy button).
- Limitation note.
- Actions allowed for issuer in current workflow state.

Checklist types are driven by `config/evidence-checklist.maharashtra.json`: Property Card, Sale / Conveyance Deed, Index II extract, Encumbrance Search, Approved Building Plans, Occupancy Certificate, Property Tax Receipt, Valuation Report, optional Lease / Rent evidence.

### Upload flow

1. Select checklist document type.
2. Upload PDF / PNG / JPEG only (with server-defined size rules visible).
3. Enter source / issuing authority and source reference.
4. Enter issue date and valid-until date where applicable.
5. Add optional notes / limitations.
6. Confirm that only synthetic or permitted sample documents are being uploaded.
7. Submit; show a server-computed hash once the upload is accepted.

Never show a client-computed hash as the canonical hash. Never provide a public URL for private documents. Any signed download URL is short-lived and must be issued through the server with access logging.

### Evidence-change warning

If an approved manifest exists, show a confirmation dialog before replacing, adding, or removing evidence:

> Changing evidence after approval starts a new review cycle and may pause the offering on Hedera. New orders will be blocked until the revised manifest is reviewed and the lifecycle checks complete.

This is a warning, not a user-selectable bypass. The server decides whether the action is allowed and enqueues the drift job.

### Manifest section

- Manifest version list with status, created date, document count, root, hash and review status.
- Approved manifest is read-only.
- Current draft/submitted manifest can be inspected.
- Show root/hash as full text in a copy-enabled detail panel.
- A manifest's state must come from the backend; do not style a locally generated preview as approved.

### Rights section

- Rights document versions and current version.
- Read-only comparison of current vs previous rights version.
- `Propose new rights version` only when backend permissions allow.
- Explain that any rights change requires re-approval and re-anchoring; existing orders remain pinned to the version they acknowledged.

## 8.4 Verifier dashboard (`/verifier`)

**Goal:** Provide a review queue and a defensible record of independent decisions.

### Review queue columns

- Property / offering identifier.
- Issuer (visible only to authorized verifier).
- Submitted manifest version.
- Completeness score.
- Evidence items requiring attention.
- Prior decision / previous manifest version.
- Submitted at.
- Review status.

### Manifest review screen (`/verifier/properties/[id]`)

**Header**
- Property reference and manifest version.
- Issuer identity for internal review.
- Explicit separation-of-duties state: `Eligible to review` or `You cannot review this submission`.
- `SIMULATED DEMO` banner.

**Main content**
- Side-by-side or inline diff against the previous manifest.
- Document rows with source, hash, dates, status, reviewer method and limitation note.
- Missing / expired / changed documents section.
- Checklist completeness formula and limits.
- Manifest root and canonical manifest hash.
- Prior decisions and reason history.

**Decision form**
- Decision choices follow backend-supported values (approve, reject, needs more information).
- A reason is required for every decision.
- Reviewer cannot supply or edit their own reviewer ID; it is derived from the authenticated session.
- Disable action if reviewer is the issuer or uploaded the revised evidence when the resume rule applies.
- Confirmation step summarizes the exact manifest version being approved. Approval is bound to that version only.

### Eligibility review (`/verifier/eligibility/[id]`)

- Display request ID, investor profile summary permitted for the verifier, wallet (shortened with detail reveal), submitted timestamp, requested offering, and policy version.
- Actions: approve / reject / revoke only when allowed by the backend transition.
- Reason required.
- Clearly separate database eligibility status from Hedera registration status (`not_registered`, `registered`, `revoked`).
- An eligibility approval is not complete for order reservation until chain registration is confirmed and the policy's validity requirements pass.

## 8.5 Investor dashboard (`/investor`)

**Goal:** Show a user's demo wallet state, pending workflow, chain-confirmed holdings, and order history without conflating the values.

### Dashboard hierarchy

1. Simulation banner.
2. Wallet status panel (`Not connected`, `Signature required`, `Verified for this demo`, `Reverification required`).
3. Eligibility panel (`Not requested`, `Pending review`, `Eligible`, `Ineligible`, `Expired`, `Revoked`) with separate ATS registration status.
4. Holdings summary — only chain-confirmed ATS balance; include last chain sync and chain source.
5. Pending orders — shown separately from confirmed holdings.
6. Recent orders and settlement status.
7. Property Intelligence preview with latest snapshot / change event.

### KPI rules

- Do not add “portfolio ROI”, “profit”, “annualized return”, “expected income”, or other unsupported investment performance figures.
- Do not label reserved units as owned units.
- If the contract balance is unavailable or Mirror Node is lagging, show `Last confirmed balance` with timestamp and a visible stale/pending state.
- A completed order is displayed only after backend reconciliation has set `COMPLETED`.

## 8.6 Wallet and eligibility (`/investor/wallet`)

### Wallet binding flow

1. Explain why wallet binding is required: the app needs proof of control before associating an address with the account.
2. Request nonce.
3. Show requested network: Hedera Testnet, EVM chain ID 296.
4. Ask wallet to sign the exact server-issued message.
5. Send signature to server verification.
6. Show success only after server recovery and nonce consumption succeed.

States:

- Wallet not connected.
- Awaiting signature.
- Signature rejected by user.
- Verification pending.
- Verified for demo.
- Wallet changed; prior registration revocation / new review required.
- Verification failed (with a safe, actionable message).

Never show a wallet as verified merely because a wallet extension returned an address. The server must verify the signature.

### Eligibility panel

- Request eligibility review.
- Show current policy version, status, validity and reviewer decision where allowed.
- Show on-chain ATS registration independently.
- No edit control for the investor's own eligibility status.

## 8.7 Simulated order and order detail (`/investor/orders/[id]`)

### Order creation steps

1. Confirm the demo offering is active.
2. Confirm wallet is verified and chain registration is current.
3. Show current rights version, hash, unit price snapshot, minimum units, investor maximum and available supply as computed by the server.
4. Enter number of units; calculate total using exact decimal/bigint-safe logic.
5. Present full signed acknowledgement text: offering ID, rights version/hash, units, unit price, total, wallet, nonce, expiry and explicit simulated-demo statement.
6. Request wallet signature.
7. Create order with `Idempotency-Key` on the server.
8. Show pending order state. Payment confirmation is a separate simulated step and visibly marked as such.

Do not make order creation look like an actual checkout or collect bank/card details. No real funds are accepted.

### Settlement timeline

Render canonical order states in chronological order with timestamps:

`UNITS_RESERVED → PAYMENT_PENDING → PAYMENT_CONFIRMED → ALLOCATION_PENDING → ALLOCATION_SUBMITTED → ALLOCATION_CONFIRMED → COMPLETED`

Exception states must be represented exactly as returned: `REJECTED`, `EXPIRED`, `PAYMENT_FAILED`, `ALLOCATION_FAILED`, `REFUND_PENDING`, `REFUNDED`, `RECONCILIATION_REQUIRED`, `MANUAL_REVIEW`.

Each step shows:

- Human-readable label.
- Canonical state in technical details.
- Timestamp.
- Source (application, simulated payment, worker, Hedera receipt, Mirror Node, reconciliation).
- Related attempt and transaction ID where applicable.
- Link to HashScan only for a real transaction ID.

### Failure handling UX

- `unknown` is not a failure; show “Checking transaction outcome” and look up the stored transaction ID.
- `ALLOCATION_FAILED` is not `COMPLETED`.
- If payment is simulated and allocation fails, show the refund/manual-review path truthfully.
- Do not display success toast until the server reports a persisted state; do not optimistically mark a token balance as allocated.
- The recovery assertion panel shows: units on chain, units ordered, attempts used, duplicates prevented. Values must come from the actual reconciliation result.

## 8.8 Property Intelligence (`/intelligence/[propertyId]`)

**Goal:** Make deterministic changes understandable, then let 0G explain the changes with evidence IDs. This is not an investment recommendation page.

### Page structure

1. Page heading: `Property Intelligence`.
2. Provenance legend: `Simulated`, `Issuer-reported`, `Public-source`, `Independently verified`, `Unknown` (show only values supported by the data model).
3. Snapshot selector / timeline with snapshot number, as-of date, manifest reference, provenance and event note.
4. Side-by-side snapshot comparison.
5. Deterministic metric delta table.
6. 0G explanation panel.
7. Supporting evidence list and `Cannot determine` section.
8. Analysis provenance footer showing provider, model, real request ID, input hash, output hash, timestamp and validation status where available.

### Deterministic metric presentation

For the supplied demo event, the UI may show:

| Metric | Snapshot 1 | Snapshot 2 | Display rule |
|---|---:|---:|---|
| Valuation | ₹10,00,00,000 | ₹10,50,00,000 | Simulated; show change direction |
| Occupancy | 90% | 85% | Simulated; show percentage-point change |
| Annual rent | ₹72,00,000 | ₹68,00,000 | Simulated; show absolute and percentage change |
| Operating costs | ₹14,00,000 | ₹16,00,000 | Simulated; higher cost is a weakened indicator |
| Gross yield | 7.20% | about 6.48% | Rent ÷ valuation; gross only, not net or forecast |
| Net operating income | ₹58,00,000 | ₹52,00,000 | Rent minus operating costs; simulated |
| Net income yield | 5.80% | about 4.95% | NOI ÷ valuation; only when source inputs exist |

Every number must be supplied by the deterministic TypeScript engine; the UI must not recalculate financial metrics independently with floating-point math. Explain percentage change vs percentage-point change correctly.

### Chart rules

- Use a line chart only for a time/snapshot trend when enough points exist to make a trend meaningful; for two snapshots, a side-by-side comparison or delta table may be clearer.
- Pair every chart with a visible data table or equivalent text summary.
- Label axes and units; use INR formatting and percentages consistently.
- Never use stock candlesticks, token price tickers, real-time flashing, or forecast cone charts.
- Color may reinforce direction but must not be the only encoding; include `Improved`, `Weakened`, `Unchanged`, `Unsupported` labels.
- If the charting library is not already selected in the codebase, use the lightest maintainable option and preserve an accessible table fallback. Do not add a chart package solely for decoration.

### 0G analysis panel

**Panel header:** `0G change explanation` and a status label that distinguishes `Available`, `Pending`, `Temporarily unavailable`, and `Validation failed`.

Show:

- Model-generated summary (only after Zod validation succeeds).
- Preference fit: `insufficient_evidence`, `poor_match`, `partial_match`, or `good_match` rendered with neutral, explainable labels; avoid green “recommended” styling.
- Risk flags.
- Assumptions.
- Missing information.
- Cannot determine.
- Supporting source/evidence IDs linked to the UI's evidence records.
- Real 0G request ID and analysis timestamp.
- Disclaimer: educational explanation only; not investment advice.

Do not render unvalidated raw model output. The model may explain supplied deltas; it cannot calculate authoritative numeric values, invent causes, approve evidence, determine eligibility, or trigger chain actions. If 0G is unavailable, keep deterministic metrics visible and show `Analysis temporarily unavailable`.

## 8.9 Public Verify page (`/verify/offering/[id]`)

**Goal:** Let a stranger check the offering's public technical integrity without login.

### Header

- NIVASA wordmark.
- Offering ID and asset reference.
- Hedera Testnet label.
- Overall summary derived from individual checks (e.g. “5 PASS · 1 FAIL · 1 UNAVAILABLE”), never a blanket verified badge.
- Simulation banner.

### Verification checks

Render the PRD's seven checks exactly:

| ID | Check | Display content |
|---|---|---|
| C1 | Rights document hash | Recomputed document SHA-256 vs on-chain `rights` document hash |
| C2 | Evidence manifest root | Recomputed Merkle root vs on-chain `evidence-manifest` value |
| C3 | Manifest approval | Current approved manifest; reviewer is distinct from issuer |
| C4 | Asset state | On-chain `isPaused` agrees with database offering status |
| C5 | Supply | On-chain total supply equals sum of completed orders and does not exceed cap |
| C6 | Restriction proof | Latest proof run's eligible and ineligible transfer outcomes verified on Mirror Node |
| C7 | Audit chain | Audit hash chain recomputes end to end |

Each check card has:

- `PASS`, `FAIL`, or `UNAVAILABLE` text label.
- Plain-language explanation of what was compared.
- Expected / observed values when safe to display.
- `Checked at` timestamp.
- Evidence source, transaction link or manifest reference.
- A short “This does not prove…” limitation.
- Expandable technical details with full IDs and copy controls.

**Critical rule:** any failed or unreachable chain read is `UNAVAILABLE`, never PASS. A database value must not be presented as proof of chain state. A check can PASS while still carrying its limitation statement.

### Public data and privacy

- Read only through the narrow public offering view.
- Show only offering-level and non-personal fields.
- Never expose real names, emails, KYC, wallet ownership details beyond PRD-approved shortened address displays, private document URLs, source files or service keys.
- Only the synthetic rights document and hashes-only manifest are public.
- Use a cache around the PRD's 30-second target and rate-limit reads.

## 8.10 Public receipt page (`/verify/receipt/[token]`)

Show only:

- Units and unit-price snapshot.
- Rights version and rights document hash acknowledged.
- Whether signature recovery matches the bound wallet.
- Allocation transaction ID and HashScan link.
- Whether the chain balance is at least the units.
- Shortened wallet address.
- Verification time and limitations.

Do not show investor name, email, profile details, eligibility evidence, or private documents. Receipt token must be unguessable and generated server-side.

## 8.11 Admin operations (`/admin/ops`, `/admin/audit`, `/admin/demo`)

**Goal:** Allow an operator to understand stuck jobs, recovery, chain sync and demo controls without giving admins a one-click bypass of independent review.

### Operations dashboard

- Queue counts: pending / running / failed / dead.
- Stuck orders and correlation IDs.
- Outbox job table: type, dedupe key, attempts, next run, last error, related order/offering/property.
- Latest reconciliation results and supply mismatches.
- Chain sync health / last successful Mirror Node sync.
- Role-separated action source in technical details; never reveal private keys.

### Demo controls

- Each control shows its server-backed enabled state.
- Controls: simulated payment confirmation, one-shot fault injection, scripted property event.
- Each mutation requires confirmation and a reason where the backend expects it.
- Show a persistent banner while any demo flag is enabled.
- Display an audit-log reference after a successful action.
- Disable controls when the corresponding server flag is false or the environment is production.
- Never show an action as complete before the server confirms it.

### Audit view

- Read-only, append-only presentation.
- Show actor, action, resource, timestamp, reason, before/after hash and prior/current row hash as permitted.
- Provide chain-verification state for the audit hash chain.
- Do not expose unauthorized actor metadata or sensitive payloads.

---

## 9. Shared component library

Use a consistent component vocabulary. Components should live under the existing `components/` structure; do not create a parallel design system directory without need.

### 9.1 Global / shell components

- `AppShell`
- `PublicHeader`
- `SidebarNavigation`
- `MobileBottomNavigation`
- `PageHeader`
- `Breadcrumbs`
- `PrototypeBanner`
- `DemoFlagBanner`
- `RoleLabel`
- `PageContainer`

### 9.2 Trust / evidence components

- `ProvenanceBadge`
- `EvidenceStatusBadge`
- `ChecklistProgress`
- `EvidenceChecklistTable`
- `EvidenceDocumentRow`
- `DocumentUploadDialog`
- `ManifestVersionList`
- `ManifestRootCard`
- `ManifestDiffViewer`
- `ReviewDecisionForm`
- `LimitationNote`

### 9.3 Offering / rights components

- `OfferingStateBadge`
- `EvidenceDriftBanner`
- `RightsSummary`
- `RightsVersionCard`
- `ActivationGateChecklist`
- `AtsAssetSummary`
- `ChainReference`
- `SupplySummary`

### 9.4 Wallet / investment workflow components

- `WalletConnectionCard`
- `WalletVerificationStatus`
- `EligibilityStatusCard`
- `DemoOrderForm`
- `SignedAcknowledgementPanel`
- `OrderStatusBadge`
- `SettlementTimeline`
- `AllocationAttemptList`
- `ReconciliationAssertionPanel`
- `ReceiptLinkCard`

### 9.5 Intelligence / verification / operations components

- `SnapshotComparison`
- `MetricDeltaTable`
- `AccessibleTrendChart`
- `AiExplanationPanel`
- `EvidenceCitationList`
- `CannotDetermineList`
- `VerificationSummary`
- `VerificationCheckCard`
- `HashValue`
- `TransactionReference`
- `OutboxJobsTable`
- `CorrelationId`
- `AuditLogTable`

### 9.6 Component behavior rules

- Every clickable card or row must have an explicit accessible action and visible hover/focus state.
- Use buttons for actions and links for navigation. Do not use clickable `div` elements.
- Icon-only buttons need an accessible label and tooltip where appropriate.
- Use Lucide icons (or the project's existing SVG icon set); do not use emoji as interface icons.
- Use consistent state badge sizes and labels.
- Tables must have real headers, caption/accessible name, keyboard-friendly controls, and mobile adaptation.
- Keep status labels textual and stable; do not infer status from color.
- Skeletons reserve final layout space to avoid layout shift.

---

## 10. Interaction standards

### 10.1 Buttons

Primary button:
- Forest background `#142B27`, white label.
- 44 px minimum target height (48 px preferred for major mobile actions).
- 8–12 px radius depending on component size.
- Hover: slight darkening / opacity shift; do not animate layout.
- Focus: visible 2–3 px outline using `--focus` with offset.

Secondary button:
- White or transparent background, forest text, visible border.
- Must remain distinguishable from plain links.

Destructive button:
- Danger text or border; use a confirmation dialog for irreversible actions.
- Never use gold as a warning/error substitute.

Disabled button:
- Clearly disabled, no hover lift, explanatory helper text when the reason is not obvious.
- Disabled is not the only access control; server authorization remains mandatory.

### 10.2 Motion

- Default micro-interaction: 150–220 ms.
- Standard component transitions: 200–300 ms.
- Use opacity and transform, not width/height or margin animations.
- One or two subtle motion elements per view maximum.
- Avoid endless pulsing, auto-advancing carousels, flashing transaction updates, animated number counters for financial balances, and scroll-jacking.
- Respect `prefers-reduced-motion: reduce`; remove non-essential transitions and provide static equivalents.

### 10.3 Loading states

- Use route-level `loading.tsx` and local skeletons for async sections.
- Keep page header and simulation banner stable while content loads.
- Show operation-specific progress: `Submitting`, `Waiting for Hedera receipt`, `Waiting for Mirror Node`, `Reconciling`.
- A long-running operation should not be represented as a generic spinner without a status sentence.
- Preserve the last confirmed data with a timestamp where safe; clearly label it stale/pending.

### 10.4 Empty states

Every empty state explains:
1. What is empty.
2. Why it is empty (when known).
3. What action is available to the current role.

Examples:
- “No property evidence submitted yet.” + issuer upload action.
- “No reviews waiting.” + no action for verifier.
- “No confirmed holdings yet.” + show pending orders separately.
- “No previous snapshot.” + explain that change analysis needs at least two snapshots.

### 10.5 Error states

- Use stable backend error codes to map to user-facing copy.
- Do not expose stack traces, secrets, SQL, provider credentials, raw signed transaction bytes, or private storage paths.
- Keep a correlation ID available for support/debugging.
- Retry controls must retry only safe, idempotent operations.
- A timeout is an unknown outcome until the stored transaction ID has been checked; do not show a failure prematurely.

### 10.6 Confirmation dialogs

Required for:
- Replacing/removing an approved document (explain drift and pause behavior).
- Submitting an irreversible reviewer decision.
- Proposing a new rights version.
- Pausing / resuming / closing an offering.
- Granting or revoking a role.
- Arming a demo fault or applying a scripted property event.

Dialog content must name the object, action, expected side effect, and whether it is simulated. Default action is cancel; no destructive action is preselected.

---

## 11. Data display and provenance contract

### 11.1 Provenance labels

Use only provenance values supported by the source-of-truth data model:

- `Independently verified` — only if that exact provenance has been recorded.
- `Issuer-reported`.
- `Public source` (include source and as-of date).
- `Simulated`.
- `Unknown`.

Do not upgrade a value's provenance because it appears in a polished card or AI explanation.

### 11.2 Evidence statuses

Map backend document status values to clear labels. The canonical statuses include `pending`, `in_review`, `verified`, `rejected`, `needs_more_information`, `expired`, and `revoked`. Use the backend value as the source; a frontend-only “complete” flag is not authoritative.

When a whole property workflow has been reviewed in the demo, label it `Demo review completed` or `Simulated verification`, not `Verified Property`.

### 11.3 Hashes and technical references

- Display SHA-256 and Merkle roots in monospace.
- Show shortened form by default only if `Copy` and `View full value` are available.
- Display a label that says what was hashed (rights document, canonical manifest, document bytes, input snapshot, output payload).
- State whether a value is recomputed client-side/server-side/on-chain read-back.
- A hash proves integrity of the referenced bytes or canonical structure; it does not prove authenticity, legal validity, ownership or truth of the document.

### 11.4 Chain status vs application status

Always separate:
- Application workflow status (Supabase / domain state).
- ATS on-chain asset status.
- Transaction receipt status.
- Mirror Node indexing status.

Never display one as a substitute for another. Include chain ID `296` and `Hedera Testnet` in relevant technical panels. A transaction is confirmed only by the receipt + Mirror Node criteria defined in Architecture V4 / PRD.

### 11.5 Currency, units and percentages

- Currency: INR (`₹`) with Indian digit grouping.
- Units: integer count; never show fractional units unless backend explicitly supports them.
- Use `gross yield` only for annual rent ÷ valuation.
- Use `net income yield` only if costs are available and formula is visible.
- Distinguish percentage points from percentage change.
- Label every seeded metric `SIMULATED` and show as-of date.
- Don't calculate or invent APY, ROI, appreciation forecasts, future cash flows or tax outcomes.

---

## 12. Accessibility requirements

Target WCAG 2.2 AA for the application.

- Semantic heading hierarchy; one H1 per page.
- All flows keyboard operable (Tab, Shift+Tab, Enter, Space, Escape as appropriate).
- Visible focus indicator on links, buttons, inputs, tabs, menus, table controls and custom widgets.
- Color contrast: at least 4.5:1 for normal text, 3:1 for large text / meaningful UI graphics.
- Don't rely on red/green alone for lifecycle direction or verification status.
- Every field has a persistent programmatic label; errors are associated with fields.
- Error summaries focus or announce correctly; form errors explain how to fix the problem.
- Dialogs trap focus, restore focus to the invoking element and close with Escape when safe.
- Charts include visible data tables / text summaries and keyboard-accessible values.
- Hashes and long references wrap or expose a copy/view control.
- Use meaningful alt text for property images; decorative imagery uses empty alt.
- Respect browser zoom and text scaling; do not lock viewport zoom.
- Respect `prefers-reduced-motion`.
- Announce async state updates through an appropriate live region without stealing focus.
- Test with keyboard only and at 200% browser zoom.

---

## 13. Frontend implementation rules

These rules mirror the Architecture V4 frontend constraints and the consulted UI/UX Pro Max Next.js guidance.

### 13.1 Rendering

- Use Next.js App Router and React Server Components by default.
- Reads for offering pages, dashboards, review queues, audit views, Intelligence history and public Verify should be server-rendered through the access model described in Architecture V4.
- Use Client Components only for interaction: wallet actions, form state, tabs/filters where needed, dialogs, copy controls, chart interaction and live polling.
- Do not fetch initial page data in `useEffect` when it can be loaded by a Server Component.
- Use `Suspense` boundaries for slow areas such as chain reads or AI analysis; keep deterministic content visible while AI loads.
- Add route-level `loading.tsx` and `error.tsx` for major segments.
- Use Next.js image optimization (`next/image`) for property imagery; provide explicit dimensions or responsive fill and reserve layout space.

### 13.2 Data and mutation integrity

- UI reads must use the user's RLS-scoped Supabase client or the approved narrow public function.
- Mutations go through the defined server/API layer with session-derived identity, Zod validation, role/ownership checks, Origin checks, rate limits and stable error codes.
- The browser must never call ATS contracts directly for issuance, pause/resume, eligibility registration or any privileged action.
- No browser action may claim payment succeeded or token allocation completed.
- Outbox / worker operations are not exposed as public UI endpoints.
- Do not expose service-role keys, ATS signer keys, private storage URLs, 0G API keys or cron secrets in client code.
- Do not use local component state as the source of truth for offering state, evidence approval, eligibility, chain balance or order completion.

### 13.3 Component and file organization

Use the architecture's existing component groups where possible:

```text
components/
  ui/                  # buttons, inputs, dialogs, badges, tables, skeletons
  shell/               # app shell, sidebar, public header, prototype banner
  evidence/            # checklist, upload, manifest, diff, review UI
  offering/            # rights summary, gate checklist, offering state
  investor/            # wallet, eligibility, order form, holdings
  timeline/            # order states, attempts, reconciliation proof
  verify/              # C1-C7 checks, public receipt components
  intelligence/        # snapshots, metric deltas, AI explanation
  admin/               # outbox, audit, demo controls
```

If the repository already has equivalent folders or component primitives, reuse them. Avoid duplicate components with slightly different status logic.

### 13.4 State mapping

Create one frontend presentation map from canonical backend states to display labels, icons, descriptions and semantic colors. Do not create a second, independent transition system. Buttons available on a page must be derived from server-authorized actions / state, not from guessed frontend rules.

---

## 14. Analytics and audit-friendly UI events

UI telemetry may record non-sensitive product interactions only if analytics are actually configured. Do not add a new third-party tracker without an explicit product decision.

For required workflow actions, the visible UI should make the audit relationship clear:

- Document uploaded → document ID / server-computed hash.
- Manifest submitted → manifest version and ID.
- Manifest reviewed → decision and reason.
- Rights proposed → rights version and hash.
- Activation requested → job/correlation reference and per-condition gate result.
- Eligibility changed → reviewer decision and ATS sync state.
- Order created → order ID and idempotency-safe state.
- Allocation submitted → attempt number and transaction ID.
- Reconciliation complete → evidence supporting `COMPLETED`.
- Evidence drift → previous/new manifest roots and pause transaction.
- Resume → verifier decision, manifest root read-back and unpause transaction.
- AI analysis → 0G provider/model/request ID/input hash/output hash/validation status.

Do not show sensitive or private payloads merely to make the audit trail look detailed.

---

## 15. Demo walkthrough mode

For the hackathon presentation, provide a clear path through the existing product screens, not a separate fake “presentation mode” that bypasses real functionality.

Suggested guided journey:

1. Landing page explains the lifecycle gap and simulation limits.
2. Issuer evidence workspace shows the Maharashtra checklist and current manifest.
3. Verifier reviews the exact manifest version and records a reason.
4. Rights panel shows what the interest represents / does not represent.
5. Activation gate shows rights hash + manifest root read back from the ATS asset.
6. Investor binds a demo wallet, requests eligibility and signs acknowledgement.
7. Order timeline demonstrates the actual fault / recovery path and one reconciled allocation.
8. Restriction proof shows ineligible wallet rejection.
9. Issuer uploads revised valuation evidence; offering and asset pause; a different verifier approves; asset resumes.
10. Public Verify page shows C1–C7 from real data.
11. Property Intelligence shows deterministic snapshot delta and a real 0G request ID.

Every step shown as complete must be backed by persisted application state or an inspectable chain/provider artifact. Planned-but-unbuilt features belong in the README / demo narration as planned, not in the live UI as completed.

---

## 16. Out of scope for this UI

Do not implement UI for:

- Multi-property marketplace or asset discovery feed.
- Secondary trading, order books, AMM, liquidity pools or token swaps.
- Real fiat checkout, card/bank input, custody or payout features.
- Live public KYC, Aadhaar, PAN or private deed uploads.
- Government land records, live government integrations, or government approval badges.
- Real-world legal ownership transfer claims.
- Automated buy/sell/recommendation agent.
- Return forecasts, guaranteed income or “best investment” recommendations.
- Arc, x402, Uniswap or other integrations not in the approved Architecture V4 scope.
- Distribution/dividend screens unless the Tier C stretch is explicitly built and supported by actual ATS capability.

---

## 17. UI acceptance checklist

### Brand and visual system

- [ ] NIVASA uses the approved forest-green / warm-ivory / muted-gold palette.
- [ ] All colors are referenced through semantic design tokens; no scattered hard-coded hex values.
- [ ] Body text and interactive controls meet contrast requirements.
- [ ] Inter is used for product UI; Playfair Display is restrained to editorial display use; JetBrains Mono is used for technical identifiers.
- [ ] No crypto neon, AI purple/pink gradients, fake metrics, excessive glass cards or decorative motion.
- [ ] Buttons, links, badges, cards, tables and forms share consistent spacing/radii/focus behavior.

### Truth and trust UX

- [ ] `SIMULATED DEMO · NOT A REAL OFFERING` appears on every route and cannot be dismissed.
- [ ] Additional banners reflect actual server-side demo flags.
- [ ] DELTA is described only as a proposed framework; no compliance / government approval claim.
- [ ] No wording implies tokenization equals land ownership.
- [ ] Property-level demo result is labelled `Demo review completed` / `Simulated verification`, not `Verified Property`.
- [ ] Every financial figure that comes from seeded demo data is marked simulated and has formula / provenance where relevant.
- [ ] No live-investment CTAs or real payment details.

### Lifecycle and state integrity

- [ ] UI status labels map to canonical backend states.
- [ ] Application status, ATS state, receipt status and Mirror Node sync state are distinct.
- [ ] Evidence change warning explains that approved evidence changes can pause issuance.
- [ ] Drift-paused offering blocks new order action in the UI and is still blocked server-side.
- [ ] Reviewer forms enforce reason entry and display separation-of-duties restrictions.
- [ ] Pending, unknown, failed and reconciled order states are visually distinct.
- [ ] `COMPLETED` appears only after backend reconciliation.
- [ ] Verify C1–C7 show PASS / FAIL / UNAVAILABLE; chain failure never becomes PASS.
- [ ] 0G output is rendered only after validation; unavailable analysis does not hide deterministic metrics.

### Security and privacy

- [ ] Public Verify pages expose only approved public offering data and hashes-only manifest.
- [ ] Receipt page exposes no investor name/email.
- [ ] No sensitive document, KYC data, secret key or private URL appears in client responses.
- [ ] UI cannot grant its own role, eligibility, wallet verification or reviewer status.
- [ ] Privileged mutations are server-authorized; hiding a button is not treated as authorization.

### Responsive and accessible quality

- [ ] Verified at 375, 768, 1024 and 1440 px.
- [ ] Keyboard-only use works across all main flows.
- [ ] Focus states are visible and predictable.
- [ ] Forms have labels, error messaging and semantic validation.
- [ ] Charts have a data-table / text alternative.
- [ ] Motion respects reduced-motion preference.
- [ ] Long hashes / transaction IDs can be inspected and copied.
- [ ] Loading skeletons avoid content layout shifts; route-level error states exist.

---

## 18. Reference sources and provenance

### NIVASA product sources (authoritative)

- `NIVASA — Architecture V4 and Execution Source of Truth.md`, version 4.0, 6 November 2026.
- `NIVASA — Product Requirements Document (PRD).md`, version 1.0, derived from Architecture V4.

These documents are authoritative for roles, states, functionality, scope, prototype limitations, architecture and acceptance criteria.

### UI/UX Pro Max skill (design reference)

- Repository: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- README / design system approach: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/README.md
- Product catalog: `src/ui-ux-pro-max/data/products.csv`
- Style catalog: `src/ui-ux-pro-max/data/styles.csv`
- Color catalog: `src/ui-ux-pro-max/data/colors.csv`
- Typography catalog: `src/ui-ux-pro-max/data/typography.csv`
- Landing patterns: `src/ui-ux-pro-max/data/landing.csv`
- UI reasoning rules: `src/ui-ux-pro-max/data/ui-reasoning.csv`
- Next.js stack guidance: `src/ui-ux-pro-max/data/stacks/nextjs.csv`
- UX guidance: `src/ui-ux-pro-max/data/ux-guidelines.csv`

**Applied skill guidance:** financial / fintech interfaces prioritize trust and clarity; property pages can use premium imagery and a strong explanatory hero; dashboards prioritize accuracy and scannability; Next.js uses Server Components by default and narrowly scoped Client Components for interactions; accessibility and responsive behavior are implementation requirements.

**Project-specific adaptation:** the skill catalogs include dark dashboard and trust-blue options for some finance categories. NIVASA deliberately retains the user-approved forest-green / ivory / muted-gold palette and a light-first workflow UI because the product's primary experience is evidence review and lifecycle verification, not high-frequency trading. The palette and component use must still pass the contrast requirements above.

---

## 19. Final implementation instruction

Build the frontend as a trustworthy lifecycle console with a premium real-estate identity. Every visual decision must reinforce the same promise: **NIVASA shows what was submitted, what was reviewed, what changed, what the chain confirms, what remains uncertain, and what the prototype cannot prove.**

Do not invent screens or states to make the project look more complete. Do not present sample data as live. Do not turn an infrastructure prototype into a marketplace. Keep the experience clear, inspectable, accessible, and faithful to Architecture V4 and the PRD.

# NIVASA — Prototype Limitations & Honest Boundaries

This document records the exact operational boundaries, simulation limits, and honesty guarantees for the NIVASA prototype across Hedera Testnet, 0G Private Computer, and off-chain workflow systems.

---

## 1. Evidence-Drift Detection (D2 Protocol)

* **Scope of Detection (ARCH §12.5):** Drift detection monitors evidence changes exclusively **inside NIVASA**. When an issuer uploads, replaces, or deletes a document in the property workspace (Trigger T1), or when stored files pass valid-until expiration dates (T3) or hash mismatch integrity checks (T2), the system automatically detects the drift, creates a new unapproved manifest, and triggers an on-chain asset pause on Hedera.
* **External Diligence Boundary:** External, real-world changes that occur outside NIVASA—such as a new lis pendens, encumbrance, charge, mortgage, or municipal claim registered in physical land registries or external portals without being uploaded to NIVASA—are **not automatically detected**.
* **Prototype Purpose:** The D2 evidence-drift protocol demonstrates the automated technical fail-closed mechanism: that an on-chain token lifecycle can be programmatically coupled to an evolving off-chain evidence package. It does not replace ongoing independent legal diligence or physical title investigation.

---

## 2. On-Chain Token Pause Semantics (Milestone M1 Finding)

* **Hedera ATS Behavior:** As proven on Hedera Testnet (`docs/ats-gate.md §4.1`), ATS v8 `Mint.sol` decorates `issue()` with `onlyUnpaused`.
* **Consequence:** Pausing the ATS Diamond token freezes **both secondary holder-to-holder transfers and primary token issuance**. During an evidence-drift pause (`paused_evidence_drift`), existing holders cannot transfer units, and no new units can be minted or settled.

---

## 3. Financial & Legal Boundaries

* **Simulated Payments:** The prototype simulates payment confirmation (`POST /api/demo/payment-confirmation`, `DEMO_PAYMENTS=true`). No real fiat currency (INR) or central bank digital currency moves across real banking rails.
* **Not Legal Title:** Token units represent a simulated economic interest defined in the versioned rights document. A token does NOT represent legal title, freehold deed, or municipal land registry ownership under the Maharashtra Land Revenue Code or Transfer of Property Act.
* **Gross Yield Formula:** Any displayed yield reflects a mathematical derivation (`Annual Rent ÷ Valuation`) based on illustrative demo inputs. It is not net yield, does not subtract operating costs/taxes/vacancy, and never constitutes an investment return forecast.


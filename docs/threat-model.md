# Threat model

## Assets and boundaries

Protected assets are private evidence and signed URLs, investor identity and eligibility, server credentials, ATS role keys, audit integrity, workflow correctness and accurate public verification. Trust boundaries separate the browser, session/API, RLS database, worker/outbox, Hedera ATS/Mirror Node, private evidence storage and 0G provider.

## Threats and controls

- Forged roles, KYC or eligibility: identity comes from the session; API authorization and RLS/DB checks must reject client-supplied privilege.
- Self-review or unauthorized activation/resume: database SoD constraints reject issuer/reviewer, proposer/approver, investor/reviewer and evidence-uploader/resumer conflicts.
- Over-issuance or restricted transfers: ATS cap and token-level eligibility are authoritative; reconcile supply and inspect actual chain records.
- Replayed or duplicate orders/payments: idempotency, atomic reservation, outbox deduplication and reconciliation. Simulated payment is not atomic with issuance.
- Evidence tampering or drift: file hashes and manifest roots detect changes inside NIVASA; fail closed and pause pending independent review. Hash integrity is not authenticity.
- Timeout after submission: recover by transaction identifier and chain reads; do not mark complete until reconciliation.
- Privileged-key compromise: credentials stay server-side and roles use separate accounts. This prototype has not received an independent production security audit.
- AI prompt/output manipulation: source documents are not sent to the model; validate schema, cited IDs, numeric claims and causes; AI cannot mutate the chain.
- Audit tampering: append-only hash chain and explicit verification. A hash chain alone does not protect against every database administrator or signing-key compromise.
- Demo control misuse: admin authorization, server-side flags, reasons and audit entries; demo flags must refuse production.

## Residual risk

Provider compromise/outage, inaccurate source documents, real-world title changes outside NIVASA, ATS/dependency vulnerabilities, legal classification and operational key compromise remain. Production requires independent legal, security, property-diligence and operational reviews (ARCH §27).

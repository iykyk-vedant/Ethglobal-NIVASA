# NIVASA — ATS Go/No-Go Gate Report (Milestone M1)

**Execution Date:** 6 November 2026  
**Status:** **GO — PROCEED WITH ATS INTEGRATION**  
**Selected Mode:** `ATS_ADAPTER_MODE="sdk"` (Full programmatic contract execution via `@hashgraph/sdk` and `@hashgraph/asset-tokenization-contracts`)  
**Network:** Hedera Testnet (Chain ID 296)  
**Mirror Node:** `https://testnet.mirrornode.hedera.com`  
**JSON-RPC Relay:** `https://testnet.hashio.io/api`  

---

## 1. Executive Summary

Milestone M1 establishes cryptographic and operational proof on Hedera Testnet for all Asset Tokenization Studio (ATS) capabilities required by NIVASA before building dependent features. Every operation listed in ARCH §8.6, PRD FR-6.1–6.6, and PLAN Milestone M1 was executed on-chain with real accounts and real transactions. Zero transaction IDs, contract addresses, or HashScan links are simulated.

The ATS Diamond Proxy pattern (`ResolverProxy` backed by `BusinessLogicResolver`) was proven functional. All operations—deployment, role assignments, SSI issuer onboarding, investor KYC attestation, unit issuance, versioned document anchoring, pause/unpause state control, and transfer restrictions—succeeded programmatically without manual ATS UI intervention.

---

## 2. On-Chain Testnet Addresses

| Role / Component | Hedera Account / Contract ID | EVM Address (msg.sender) | Notes |
| :--- | :--- | :--- | :--- |
| **ATS Factory v8 Proxy** | `0.0.9213391` | `0xd1f118a40f3b02883d35909ef2517e7edd78379d` | Official deployed ATS v8 Factory |
| **ATS Resolver Proxy (BLR)** | `0.0.9212226` | `0xba2d5fc2083a0b8f164c50e65d782087fba18e0a` | Contains Equity config (`0x01`, v1) and Bond config (`0x02`, v1) |
| **NIVASA Asset Diamond** | `0.0.11330441` | `0x52ed835e649a4b045a21bc5e240623d8a77f73ef` | Ref: `PROPERTY-MH-001`, ISIN: `INE002A01018`, MaxSupply: 10,000 |
| **Deployer / Admin** | `0.0.11330244` | `0x0000000000000000000000000000000000ace2c4` | Holds `DEFAULT_ADMIN_ROLE`, `ROLE_SSI_MANAGER`, `ROLE_DOCUMENTER` |
| **Issuer Agent** | `0.0.11324646` | `0x2ef488213a7675c4cb24ecf31f139f777bb4660f` | Holds `ROLE_ISSUER` |
| **Compliance Account** | `0.0.11324672` | `0x2e73ccc2559078b49c82a8fae4b3b38d5ebb1912` | Holds `ROLE_KYC` + Registered SSI Issuer |
| **Pauser Account** | `0.0.11330245` | `0x0000000000000000000000000000000000ace2c5` | Holds `ROLE_PAUSER` |
| **Eligible Investor** | `0.0.11330246` | `0x0000000000000000000000000000000000ace2c6` | KYC `GRANTED` (`1`), holds 95 issued units |
| **Ineligible Investor** | `0.0.11330247` | `0x0000000000000000000000000000000000ace2c7` | KYC `NOT_GRANTED` (`0`), zero units, transfers strictly revert |

---

## 3. ARCH §8.6 Verification Matrix

| # | Item Description | Status | Transaction ID | HashScan Link | Notes |
| :-: | :--- | :-: | :--- | :--- | :--- |
| **1** | **Existing ATS Addresses** | **PASS** | `N/A` | [Resolver 0.0.9212226](https://hashscan.io/testnet/contract/0.0.9212226) | Reused official ATS v8 deployment: Factory `0.0.9213391` and Resolver `0.0.9212226`. |
| **2** | **Documented ATS Setup** | **PASS** | `N/A` | `package.json` | Pinned `@hashgraph/asset-tokenization-contracts@^8.0.0`, `@hashgraph/sdk@^2.81.0`, `ethers@^6.17.0`. |
| **3** | **Funded ECDSA Accounts** | **PASS** | `0.0.11324646@1793914480.000000000` | [Deployer 0.0.11330244](https://hashscan.io/testnet/account/0.0.11330244) | Generated & funded 4 dedicated ECDSA accounts; verified all 6 accounts on Mirror Node. |
| **4** | **Deploy Demo Asset** | **PASS** | `0.0.11330244@1793915035.423095166` | [Tx 1793915035](https://hashscan.io/testnet/transaction/0.0.11330244-1793915035-423095166) | Deployed Equity Diamond Proxy `0.0.11330441` with ISIN `INE002A01018`, Cap 10,000, internal KYC active. Gas used: 7,377,078. |
| **5** | **Investor KYC & Issuance** | **PASS** | KYC: `0.0.11324672@1793915420.756437854`<br/>Issue: `0.0.11324646@1793915421.221170832` | [Issue Tx 1793915421](https://hashscan.io/testnet/transaction/0.0.11324646-1793915421-221170832) | Compliance granted KYC (`VC-ELIGIBLE-001`). Issuer issued 100 units. Balance confirmed via Mirror contract call. `Issued` event log retrieved. |
| **6** | **Document Anchoring & Versioning** | **PASS** | `0.0.11330244@1793915456.826762270` | [Doc Tx 1793915456](https://hashscan.io/testnet/transaction/0.0.11330244-1793915456-826762270) | Anchored `"rights"` and `"evidence-manifest"` (Merkle root). Updated `"rights"` to v2: confirmed on-chain timestamp updated from 1793915459 to 1793915463. |
| **7** | **Pause / Unpause Semantics** | **PASS** | Pause: `0.0.11330245@1793915521.144401076`<br/>Unpause: `0.0.11330245@1793915524.788717410` | [Pause Tx 1793915521](https://hashscan.io/testnet/transaction/0.0.11330245-1793915521-144401076) | Pause halted transfers (`CONTRACT_REVERT_EXECUTED`). Unpause restored transfers (5 units transferred, tx `0.0.11330246@1793915526.913445891`). |
| **8** | **Restriction Proof** | **PASS** | `0.0.11330246@1793915559.481948622` | [Failed Tx 1793915559](https://hashscan.io/testnet/transaction/0.0.11330246-1793915559-481948622) | Transfer attempt to unregistered investor `0.0.11330247` reverted with `InvalidKycStatus()` (selector `0xfc855b1b`). Recorded on Mirror Node. |
| **9** | **Operational Parameters** | **PASS** | `N/A` | [ATS Gate Script](file:///d:/Ethglobal/scripts/ats-gate.ts) | Documented valid-duration (180s), rate limits (100 req/s mirror, 100 req/10s relay), EVM long-zero addressing, and required key RBACs. |

---

## 4. Findings That Change the Design

### 4.1 Issuance Semantics While Paused
* **Finding:** In ATS v8 `Mint.sol`, `function issue` is decorated with the `onlyUnpaused` modifier.
* **On-Chain Proof:** Calling `issue()` while paused reverted with transaction error `CONTRACT_REVERT_EXECUTED` (tx `0.0.11324646@1793915525.586904740`).
* **Design Impact:** Unlike some ERC-1400 tokens where pausing only freezes peer-to-peer secondary transfers while allowing admin primary minting, ATS halts **both secondary transfers and primary issuance**.
* **Architecture Consequence:** NIVASA's Outbox Worker must check pause status before attempting unit issuance. If evidence drift triggers asset pause (D2), settlement allocation jobs must enter a `WAITING_FOR_UNPAUSE` state in the queue rather than retrying blindly and wasting gas.

### 4.2 Document Versioning & Immutability
* **Finding:** `DocumentationStorageWrapper.sol` implements `setDocumentEntry` such that calling `setDocument` with an existing `bytes32 _name` overwrites the `Document` struct (`docHash`, `uri`, `lastModified`), but preserves the entry in `docNames` without creating duplicate entries.
* **On-Chain Proof:** Updating `"rights"` to v2 updated the stored hash to `0xe90e...` and updated `lastModified` timestamp from `1793915459` to `1793915463`.
* **Design Impact:** NIVASA does not need separate document slots like `rights_v1`, `rights_v2`. The canonical document name `rights` holds the current active rights hash, and `lastModified` provides on-chain proof of when the legal terms were superseded. Historical versions are proven by comparing on-chain audit logs against the Supabase `rights_versions` table.

### 4.3 SSI Issuer Prerequisite for KYC Grant
* **Finding:** `Kyc.sol` enforces `onlyValidIssuer(_issuer)`, which checks `SsiManagementStorageWrapper.requireIssuer(_issuer)`. A caller holding `ROLE_KYC` cannot grant KYC unless the attesting issuer address is explicitly added to the SSI issuer list via `SsiManagementFacet.addIssuer()`.
* **On-Chain Proof:** Initial `grantKyc` reverted with `AccountIsNotIssuer(0x2e73ccc2559078b49c82a8fae4b3b38d5ebb1912)` (error selector `0xcd324f53`). Calling `addIssuer` with the deployer (`ROLE_SSI_MANAGER`) allowed `grantKyc` to succeed immediately.
* **Design Impact:** The asset bootstrap and provisioning script must execute `addIssuer(complianceAddress)` during initialization before investor KYC verification workflows can operate.

### 4.4 EVM Sender Addressing on Hedera
* **Finding:** Accounts created on Hedera via `AccountCreateTransaction.setKey()` without an EVM alias execute contract calls where `msg.sender` in Solidity resolves to the synthetic "long-zero" EVM address (`0x0000000000000000000000000000000000<hex(num)>`), rather than the public key's keccak-derived EVM address.
* **Design Impact:** All role grants (`grantRole`), KYC records (`grantKyc`), and transfer calls (`transfer`) must target the long-zero EVM address when interacting with native Hedera accounts.

### 4.5 Max Valid Duration & Rate Limits
* **Transaction Valid Duration:** Hedera enforces a maximum transaction valid duration of 180 seconds (`validDuration <= 180`). Outbox worker tasks must not set valid-duration greater than 180 seconds.
* **Mirror Node:** Public mirror node supports bursts of ~100 req/s. Outbox workers should cache contract view calls with a 2-second TTL.
* **JSON-RPC Relay:** Public Hashio relay enforces 100 requests per 10 seconds (10 req/s) per IP. Heavy queries should prioritize the Mirror Node REST API (`/api/v1/contracts/call`).

---

## 5. Adapter Mode Decision

* **Chosen Mode:** `ATS_ADAPTER_MODE="sdk"`
* **Rationale:** Direct contract invocation via `@hashgraph/sdk` using TypeChain contract interfaces proved 100% reliable for deployment, access control, KYC management, unit issuance, document anchoring, pausing, and transfers.
* **Manual Mode Discarded:** Manual execution via the ATS web dashboard is **not required**. The backend outbox worker will programmatically submit Hedera transactions using the operator keys.

---

## 6. How to Reproduce

Run the automated testnet gate script:
```bash
npm run ats:gate
```
Output confirms all 9 verification steps on Hedera Testnet and exits with status 0.


# NIVASA — Production & Demo Deployment Guide

This guide details how to deploy the NIVASA RWA lifecycle platform across **Vercel** (recommended serverless platform), **Docker / Container platforms** (Railway, Render, Fly.io, Cloud Run), and **Standalone Linux Servers** (PM2 + Nginx).

---

## 1. Quick Deploy on Vercel (Recommended)

NIVASA is built on Next.js 15 (App Router) and is configured for native deployment on Vercel.

### Steps
1. Push your repository to GitHub: `https://github.com/<your-username>/Ethglobal-NIVASA`.
2. Navigate to [vercel.com/new](https://vercel.com/new) and click **Import** next to your repository.
3. Keep default build settings:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
4. Add the required environment variables (see [Environment Variables Reference](#4-environment-variables-reference) below).
5. Click **Deploy**.

### Automated Background Worker (Vercel Cron)
The repository includes a [vercel.json](../vercel.json) configured for Vercel Hobby accounts (daily execution at midnight UTC):

```json
{
  "crons": [
    {
      "path": "/api/cron/worker",
      "schedule": "0 0 * * *"
    }
  ]
}
```

> [!NOTE]
> **Vercel Hobby Plan Cron Limit:**  
> Vercel Hobby (free) accounts permit cron jobs to run at most **once per day** (`0 0 * * *`). If you require **1-minute execution intervals on free tier**:
> 1. Sign up for free at [cron-job.org](https://cron-job.org) (or use EasyCron / Upstash).
> 2. Create a new cron job pointing to: `https://<your-vercel-domain>/api/cron/worker`
> 3. Schedule: Every 1 minute.
> 4. Method: `POST` or `GET`.
> 5. Header: `Authorization: Bearer <YOUR_CRON_SECRET>`

---

## 2. Docker & Container Deployment (Railway, Render, Fly.io, GCP Cloud Run)

The repository includes an optimized multi-stage [Dockerfile](../Dockerfile) leveraging Next.js `output: 'standalone'`.

### Docker Build & Run Locally
```bash
# 1. Build the production image
docker build -t nivasa-app .

# 2. Run container on port 3000 with your environment file
docker run -p 3000:3000 --env-file .env nivasa-app
```

### Deploying to Railway / Render
1. Connect your GitHub repository.
2. Railway/Render will automatically detect the `Dockerfile`.
3. Set the environment variables in the project settings.
4. Set the port to `3000`.

---

## 3. Traditional Linux Server / VPS (PM2 + Nginx)

### 1. Setup & Build
```bash
git clone https://github.com/<your-username>/Ethglobal-NIVASA.git
cd Ethglobal-NIVASA
npm ci
npm run build
```

### 2. Run with PM2
```bash
pm2 start npm --name "nivasa" -- start -- -p 3000
pm2 save
pm2 startup
```

### 3. Server Cron for Worker Processing
Add a crontab entry to execute the background worker every minute:
```bash
crontab -e
# Add line:
* * * * * curl -s -X POST http://localhost:3000/api/cron/worker -H "Authorization: Bearer YOUR_CRON_SECRET" > /dev/null 2>&1
```

---

## 4. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the deployed application (e.g. `https://nivasa.vercel.app`) |
| `APP_ENV` | Yes | Runtime environment: `production` or `demo` |
| `CRON_SECRET` | Yes | 32+ character secret token protecting `/api/cron/worker` |
| `PARCEL_HMAC_SECRET` | Yes | Secret for Maharashtra land parcel ID HMAC generation |
| **Supabase (PostgreSQL)** | | |
| `DATABASE_URL` | Yes | PostgreSQL connection pooler (port 6543) |
| `DIRECT_URL` | Yes | PostgreSQL direct connection (port 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anonymous client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Privileged backend service-role secret |
| **Hedera Testnet** | | |
| `HEDERA_NETWORK` | Yes | `testnet` |
| `HEDERA_JSON_RPC_URL` | Yes | JSON-RPC Relay URL (e.g. `https://testnet.hashio.io/api`) |
| `HEDERA_MIRROR_NODE_URL` | Yes | Mirror Node URL (`https://testnet.mirrornode.hedera.com`) |
| `HEDERA_ISSUER_AGENT_ACCOUNT_ID` | Yes | ECDSA account ID for unit allocation worker |
| `HEDERA_ISSUER_AGENT_PRIVATE_KEY` | Yes | ECDSA private key for unit allocation |
| `HEDERA_COMPLIANCE_ACCOUNT_ID` | Yes | ECDSA account ID for KYC registration |
| `HEDERA_COMPLIANCE_PRIVATE_KEY` | Yes | ECDSA private key for compliance |
| `HEDERA_PAUSER_ACCOUNT_ID` | Yes | ECDSA account ID for asset pause operations |
| `HEDERA_PAUSER_PRIVATE_KEY` | Yes | ECDSA private key for asset pause |
| `ISSUER_DAILY_UNIT_CAP` | Yes | Daily issuance cap (e.g. `100000`) |
| **ATS Asset Tokenization Studio** | | |
| `ATS_ADAPTER_MODE` | Yes | `sdk` |
| `ATS_ASSET_CONTRACT_ID` | Yes | Hedera ID of the Diamond Asset (e.g. `0.0.11330441`) |
| `ATS_ASSET_ADDRESS` | Yes | EVM address of the Diamond Asset (`0x52ed835e...`) |
| `HEDERA_ATS_FACTORY_ADDRESS` | Yes | Official ATS Factory v8 (`0.0.9213391`) |
| `HEDERA_ATS_RESOLVER_ADDRESS` | Yes | Official ATS Resolver (`0.0.9212226`) |
| **0G Private Computer (TEE Compute)** | | |
| `OG_API_KEY` | Yes | 0G Private Computer API key |
| `OG_BASE_URL` | Yes | 0G inference gateway endpoint |
| `OG_MODEL` | Yes | Model ID (e.g. `qwen-flash`) |

### Production Safety Guardrail
When `APP_ENV=production` or `NODE_ENV=production`:
- The application **strictly refuses to boot** if `DEMO_PAYMENTS`, `DEMO_FAULTS`, or `DEMO_EVENTS` are set to `true`.
- In production, set `DEMO_PAYMENTS=false`, `DEMO_FAULTS=false`, and `DEMO_EVENTS=false`.

---

## 5. Post-Deployment Verification

1. **Check Environment Configuration:**
   ```bash
   npm run env:check
   ```
2. **Scan for Secret Leakage:**
   ```bash
   npm run security:secrets
   ```
3. **Verify Public Endpoints:**
   - Public Verify page: `https://<deployed-domain>/verify`
   - Feature flags status: `https://<deployed-domain>/api/demo/flags`
4. **Trigger Worker:**
   ```bash
   curl -i -X POST https://<deployed-domain>/api/cron/worker \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```
   Expected response: `200 OK` with JSON `{ "success": true, "workerId": "...", "processedCount": ... }`.


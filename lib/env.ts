import "server-only";
import { z } from "zod";

const parseBooleanFlag = (val: unknown): boolean => {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0" || lower === "") return false;
  }
  return false;
};

export const envSchema = z
  .object({
    // App
    NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
    APP_ENV: z.enum(["demo", "development", "production", "test"]).default("demo"),
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    CRON_SECRET: z.string().optional(),
    DEMO_PAYMENTS: z.preprocess(parseBooleanFlag, z.boolean()).default(false),
    DEMO_FAULTS: z.preprocess(parseBooleanFlag, z.boolean()).default(false),
    DEMO_EVENTS: z.preprocess(parseBooleanFlag, z.boolean()).default(false),
    PARCEL_HMAC_SECRET: z.string().optional(),

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    DIRECT_URL: z.string().optional(),
    POSTGRES_URL: z.string().optional(),

    // Hedera
    HEDERA_NETWORK: z.enum(["testnet", "mainnet", "previewnet", "local"]).default("testnet"),
    HEDERA_JSON_RPC_URL: z.string().optional(),
    HEDERA_MIRROR_NODE_URL: z.string().optional(),
    HEDERA_ISSUER_AGENT_ACCOUNT_ID: z.string().optional(),
    HEDERA_ISSUER_AGENT_PRIVATE_KEY: z.string().optional(),
    HEDERA_COMPLIANCE_ACCOUNT_ID: z.string().optional(),
    HEDERA_COMPLIANCE_PRIVATE_KEY: z.string().optional(),
    HEDERA_PAUSER_ACCOUNT_ID: z.string().optional(),
    HEDERA_PAUSER_PRIVATE_KEY: z.string().optional(),
    HCS_AUDIT_TOPIC_ID: z.string().optional(),
    ISSUER_DAILY_UNIT_CAP: z.string().optional(),

    // ATS
    ATS_ADAPTER_MODE: z.enum(["sdk", "manual"]).default("sdk"),
    ATS_ASSET_REF: z.string().optional(),
    ATS_FACTORY_ADDRESS: z.string().optional(),
    ATS_RESOLVER_ADDRESS: z.string().optional(),
    ATS_ASSET_CONTRACT_ID: z.string().optional(),
    ATS_ASSET_ADDRESS: z.string().optional(),
    HEDERA_ATS_FACTORY_ADDRESS: z.string().optional(),
    HEDERA_ATS_RESOLVER_ADDRESS: z.string().optional(),

    // 0G
    OG_API_KEY: z.string().optional(),
    OG_BASE_URL: z.string().optional(),
    OG_MODEL: z.string().optional(),
    OG_STORAGE_PRIVATE_KEY: z.string().optional(),
    OG_STORAGE_RPC: z.string().optional(),
    OG_STORAGE_INDEXER: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Non-negotiable safety guard: refuse to start in production with DEMO_* flags active
    if (data.APP_ENV === "production" || data.NODE_ENV === "production") {
      const activeDemoFlags = [];
      if (data.DEMO_PAYMENTS) activeDemoFlags.push("DEMO_PAYMENTS");
      if (data.DEMO_FAULTS) activeDemoFlags.push("DEMO_FAULTS");
      if (data.DEMO_EVENTS) activeDemoFlags.push("DEMO_EVENTS");

      if (activeDemoFlags.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `REFUSING TO START: production runtime has DEMO flags active: ${activeDemoFlags.join(", ")}. Demo flags are prohibited in production.`,
          path: [data.APP_ENV === "production" ? "APP_ENV" : "NODE_ENV"],
        });
      }
    }
  });

export type ValidatedEnv = z.infer<typeof envSchema>;

export function isProductionRuntime(rawEnv: Record<string, unknown> = process.env): boolean {
  return rawEnv.APP_ENV === "production" || rawEnv.NODE_ENV === "production";
}

export function validateEnv(rawEnv: Record<string, unknown> = process.env): ValidatedEnv {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `[${e.path.join(".")}]: ${e.message}`).join("\n");
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}

let cachedEnv: ValidatedEnv | null = null;

export function getEnv(): ValidatedEnv {
  if (!cachedEnv) {
    cachedEnv = validateEnv(process.env);
  }
  return cachedEnv;
}

export const env = new Proxy({} as ValidatedEnv, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof ValidatedEnv];
  },
});


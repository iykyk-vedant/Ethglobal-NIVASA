import { describe, it, expect } from "vitest";
import { validateEnv } from "./env";

describe("lib/env.ts - Environment Validator & Safety Guard", () => {
  it("successfully parses a valid demo environment", () => {
    const raw = {
      APP_ENV: "demo",
      DEMO_PAYMENTS: "true",
      DEMO_FAULTS: "false",
      DEMO_EVENTS: "true",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      HEDERA_NETWORK: "testnet",
    };

    const parsed = validateEnv(raw);
    expect(parsed.APP_ENV).toBe("demo");
    expect(parsed.DEMO_PAYMENTS).toBe(true);
    expect(parsed.DEMO_FAULTS).toBe(false);
    expect(parsed.DEMO_EVENTS).toBe(true);
    expect(parsed.HEDERA_NETWORK).toBe("testnet");
  });

  it("REFUSES TO START when APP_ENV=production and DEMO_PAYMENTS is true", () => {
    const raw = {
      APP_ENV: "production",
      DEMO_PAYMENTS: "true",
    };

    expect(() => validateEnv(raw)).toThrowError(
      /REFUSING TO START: APP_ENV is 'production' but DEMO flags are active: DEMO_PAYMENTS/
    );
  });

  it("REFUSES TO START when APP_ENV=production and multiple DEMO flags are true", () => {
    const raw = {
      APP_ENV: "production",
      DEMO_PAYMENTS: "true",
      DEMO_FAULTS: "true",
      DEMO_EVENTS: "true",
    };

    expect(() => validateEnv(raw)).toThrowError(
      /DEMO_PAYMENTS, DEMO_FAULTS, DEMO_EVENTS/
    );
  });

  it("allows production when all DEMO flags are false or omitted", () => {
    const raw = {
      APP_ENV: "production",
      DEMO_PAYMENTS: "false",
      DEMO_FAULTS: "false",
      DEMO_EVENTS: "0",
    };

    const parsed = validateEnv(raw);
    expect(parsed.APP_ENV).toBe("production");
    expect(parsed.DEMO_PAYMENTS).toBe(false);
    expect(parsed.DEMO_FAULTS).toBe(false);
    expect(parsed.DEMO_EVENTS).toBe(false);
  });
});


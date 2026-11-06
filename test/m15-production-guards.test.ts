import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as workerPost } from '@/app/api/cron/worker/route';
import { isFaultInjectionEnabled } from '@/lib/settlement/faults';
import { isPropertyEventsEnabled } from '@/lib/demo/property-events';

const keys = ['APP_ENV', 'NODE_ENV', 'DEMO_PAYMENTS', 'DEMO_FAULTS', 'DEMO_EVENTS', 'CRON_SECRET'] as const;
const original = new Map(keys.map((key) => [key, process.env[key]]));
const mutableEnv = process.env as Record<string, string | undefined>;

afterEach(() => {
  for (const key of keys) {
    const value = original.get(key);
    if (value === undefined) delete mutableEnv[key];
    else mutableEnv[key] = value;
  }
});

describe('M15 production demo guards', () => {
  it('disables fault and event helpers when NODE_ENV is production even if APP_ENV says demo', () => {
    process.env.APP_ENV = 'demo';
    mutableEnv.NODE_ENV = 'production';
    process.env.DEMO_FAULTS = 'true';
    process.env.DEMO_EVENTS = 'true';

    expect(isFaultInjectionEnabled()).toBe(false);
    expect(isPropertyEventsEnabled()).toBe(false);
  });

  it('does not allow the worker demo-trigger bypass in a production runtime', async () => {
    process.env.APP_ENV = 'demo';
    mutableEnv.NODE_ENV = 'production';
    process.env.DEMO_PAYMENTS = 'true';
    delete process.env.CRON_SECRET;

    const request = new NextRequest('http://localhost/api/cron/worker', {
      method: 'POST',
      headers: { 'x-demo-user-id': '00000000-0000-0000-0000-000000000001' },
    });
    const response = await workerPost(request);

    expect(response.status).toBe(401);
  });
});

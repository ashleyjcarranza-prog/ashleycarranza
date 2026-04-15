import { drizzle } from 'drizzle-orm/d1';

export type AnalyticsPoint = {
  indexes?: string[];
  blobs?: string[];
  doubles?: number[];
};

export type OptionalRateLimiter = {
  limit?: (options: { key: string }) => Promise<{ success: boolean }> | { success: boolean };
};

export type OptionalAnalyticsEngine = {
  writeDataPoint?: (point: AnalyticsPoint) => void;
};

export type AppBindings = {
  ASSETS: { fetch: typeof fetch };
  DB: D1Database;
  MEDIA?: R2Bucket;
  ANALYTICS?: OptionalAnalyticsEngine;
  LOGIN_LIMITER?: OptionalRateLimiter;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD_HASH: string;
  SESSION_SECRET: string;
  SITE_URL: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
};

export function getDb(env: AppBindings) {
  return drizzle(env.DB);
}

export function nowIso() {
  return new Date().toISOString();
}

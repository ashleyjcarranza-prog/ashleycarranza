import { eq } from 'drizzle-orm';
import { getDb, nowIso, type AppBindings } from '../db';
import { adminCredentials } from '../db/schema';

const PRIMARY_ADMIN_KEY = 'primary';

export async function getResolvedAdminCredentials(env: AppBindings) {
  const db = getDb(env);
  const rows = await db.select().from(adminCredentials).where(eq(adminCredentials.key, PRIMARY_ADMIN_KEY)).limit(1);
  const stored = rows[0] ?? null;

  if (stored) {
    return {
      email: stored.email.trim().toLowerCase(),
      passwordHash: stored.passwordHash
    };
  }

  return {
    email: env.ADMIN_EMAIL.trim().toLowerCase(),
    passwordHash: env.ADMIN_PASSWORD_HASH
  };
}

export async function upsertAdminCredentials(env: AppBindings, email: string, passwordHash: string) {
  const db = getDb(env);
  const now = nowIso();

  await db
    .insert(adminCredentials)
    .values({
      key: PRIMARY_ADMIN_KEY,
      email: email.trim().toLowerCase(),
      passwordHash,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: adminCredentials.key,
      set: {
        email: email.trim().toLowerCase(),
        passwordHash,
        updatedAt: now
      }
    });
}

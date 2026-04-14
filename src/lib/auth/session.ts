import { eq } from 'drizzle-orm';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { adminSessions } from '../db/schema';
import { getDb, nowIso, type AppBindings } from '../db';

const encoder = new TextEncoder();

export const ADMIN_SESSION_COOKIE = 'ashley_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashSessionToken(secret: string, token: string) {
  return sha256Hex(`${secret}:${token}`);
}

export async function issueAdminSession(env: AppBindings, email: string) {
  const db = getDb(env);
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const id = crypto.randomUUID();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const tokenHash = await hashSessionToken(env.SESSION_SECRET, token);

  await db.insert(adminSessions).values({
    id,
    tokenHash,
    email,
    expiresAt,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now
  });

  return { token, expiresAt };
}

export async function getAdminSession(env: AppBindings, token: string) {
  const db = getDb(env);
  const tokenHash = await hashSessionToken(env.SESSION_SECRET, token);
  const rows = await db
    .select()
    .from(adminSessions)
    .where(eq(adminSessions.tokenHash, tokenHash))
    .limit(1);

  const session = rows[0] ?? null;
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await db.delete(adminSessions).where(eq(adminSessions.id, session.id));
    return null;
  }

  await db
    .update(adminSessions)
    .set({
      lastSeenAt: nowIso(),
      updatedAt: nowIso()
    })
    .where(eq(adminSessions.id, session.id));

  return session;
}

export async function revokeAdminSession(env: AppBindings, token: string) {
  const db = getDb(env);
  const tokenHash = await hashSessionToken(env.SESSION_SECRET, token);
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
}

export async function revokeAdminSessionById(env: AppBindings, id: string) {
  const db = getDb(env);
  await db.delete(adminSessions).where(eq(adminSessions.id, id));
}

export function setAdminCookie(c: Context, token: string, expiresAt: string) {
  const secure = new URL(c.req.url).protocol === 'https:';
  setCookie(c, ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure,
    expires: new Date(expiresAt),
    path: '/'
  });
}

export function clearAdminCookie(c: Context) {
  deleteCookie(c, ADMIN_SESSION_COOKIE, {
    path: '/'
  });
}

export function readAdminCookie(c: Context) {
  return getCookie(c, ADMIN_SESSION_COOKIE);
}

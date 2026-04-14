import { auditLog } from './db/schema';
import { getDb, nowIso, type AppBindings } from './db';

type AuditEntry = {
  actorEmail: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  summary: string;
  changedFields?: string[] | null;
};

export async function recordAudit(env: AppBindings, entry: AuditEntry) {
  const db = getDb(env);
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorEmail: entry.actorEmail,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    action: entry.action,
    summary: entry.summary,
    changedFields: entry.changedFields?.length ? JSON.stringify(entry.changedFields) : null,
    createdAt: nowIso()
  });
}


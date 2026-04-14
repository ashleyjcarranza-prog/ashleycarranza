import { sql } from 'drizzle-orm';
import { getDb, type AppBindings } from './db';

type TrafficSeries = {
  path: string;
  count: number;
}[];

async function queryTraffic(env: AppBindings): Promise<TrafficSeries | null> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) return null;

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query:
        "SELECT blob1 AS path, COUNT(*) AS count FROM ashleycarranza_site WHERE blob2 = 'pageview' AND timestamp > NOW() - INTERVAL '30 days' GROUP BY path ORDER BY count DESC LIMIT 5"
    })
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { result?: { rows?: Array<Record<string, unknown>> } };
  const rows = payload.result?.rows ?? [];
  return rows.map((row) => ({
    path: String(row.path ?? '/'),
    count: Number(row.count ?? 0)
  }));
}

export async function writePageview(env: AppBindings, pathname: string) {
  env.ANALYTICS?.writeDataPoint?.({
    indexes: [new Date().toISOString().slice(0, 10)],
    blobs: [pathname, 'pageview'],
    doubles: [1]
  });
}

export async function getAdminAnalytics(env: AppBindings) {
  const db = getDb(env);

  const [summaryRows, linkGroupRows, speakingTypeRows, recentActivityRows, recentItemRows, changeSeriesRows, traffic] = await Promise.all([
    db.run(sql`
      SELECT
        (SELECT COUNT(*) FROM links) AS link_count,
        (SELECT COUNT(*) FROM speaking_items) AS speaking_count,
        (SELECT COUNT(*) FROM content_documents) AS document_count,
        (SELECT MAX(updated_at) FROM (
          SELECT updated_at FROM content_documents
          UNION ALL
          SELECT updated_at FROM links
          UNION ALL
          SELECT updated_at FROM speaking_items
        )) AS last_updated
    `),
    db.run(sql`
      SELECT group_name AS label, COUNT(*) AS count
      FROM links
      GROUP BY group_name
      ORDER BY count DESC, label ASC
    `),
    db.run(sql`
      SELECT type AS label, COUNT(*) AS count
      FROM speaking_items
      GROUP BY type
      ORDER BY count DESC, label ASC
    `),
    db.run(sql`
      SELECT actor_email, entity_type, action, summary, created_at
      FROM audit_log
      ORDER BY created_at DESC
      LIMIT 10
    `),
    db.run(sql`
      SELECT 'link' AS kind, label AS title, updated_at
      FROM links
      UNION ALL
      SELECT 'speaking' AS kind, talk_title AS title, updated_at
      FROM speaking_items
      UNION ALL
      SELECT 'document' AS kind, key AS title, updated_at
      FROM content_documents
      ORDER BY updated_at DESC
      LIMIT 8
    `),
    db.run(sql`
      SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count
      FROM audit_log
      WHERE created_at >= datetime('now', '-30 day')
      GROUP BY substr(created_at, 1, 10)
      ORDER BY day ASC
    `),
    queryTraffic(env)
  ]);

  const summary = (summaryRows.results?.[0] ?? {}) as Record<string, unknown>;
  const linkGroupResults = (linkGroupRows.results ?? []) as Array<Record<string, unknown>>;
  const speakingTypeResults = (speakingTypeRows.results ?? []) as Array<Record<string, unknown>>;
  const recentActivityResults = (recentActivityRows.results ?? []) as Array<Record<string, unknown>>;
  const recentItemResults = (recentItemRows.results ?? []) as Array<Record<string, unknown>>;
  const changeSeriesResults = (changeSeriesRows.results ?? []) as Array<Record<string, unknown>>;

  return {
    summary: {
      linkCount: Number(summary.link_count ?? 0),
      speakingCount: Number(summary.speaking_count ?? 0),
      documentCount: Number(summary.document_count ?? 0),
      lastUpdated: String(summary.last_updated ?? '')
    },
    countsByLinkGroup: linkGroupResults.map((row) => ({
      label: String(row.label ?? ''),
      count: Number(row.count ?? 0)
    })),
    countsBySpeakingType: speakingTypeResults.map((row) => ({
      label: String(row.label ?? ''),
      count: Number(row.count ?? 0)
    })),
    recentActivity: recentActivityResults.map((row) => ({
      actorEmail: String(row.actor_email ?? ''),
      entityType: String(row.entity_type ?? ''),
      action: String(row.action ?? ''),
      summary: String(row.summary ?? ''),
      createdAt: String(row.created_at ?? '')
    })),
    recentlyUpdatedItems: recentItemResults.map((row) => ({
      kind: String(row.kind ?? ''),
      title: String(row.title ?? ''),
      updatedAt: String(row.updated_at ?? '')
    })),
    changeSeries: changeSeriesResults.map((row) => ({
      day: String(row.day ?? ''),
      count: Number(row.count ?? 0)
    })),
    trafficTopPages: traffic
  };
}

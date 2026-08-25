import { env } from 'cloudflare:workers';

let initialized = false;
async function ensureAuditTable() {
  if (initialized) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, metadata TEXT, ip_address TEXT, created_at INTEGER NOT NULL)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at)`).run();
  initialized = true;
}

export async function writeAudit(input: { userId: string; action: string; entityType: string; entityId: string; metadata?: unknown; ipAddress?: string | null }) {
  await ensureAuditTable();
  await env.DB.prepare(`INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,metadata,ip_address,created_at) VALUES (?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), input.userId, input.action, input.entityType, input.entityId, JSON.stringify(input.metadata ?? {}), input.ipAddress ?? null, Date.now()).run();
}

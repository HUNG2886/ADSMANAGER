import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), email: text('email').notNull(), name: text('name'), image: text('image'), passwordHash: text('password_hash'), role: text('role').notNull().default('COLLABORATOR'), isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(), updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [uniqueIndex('idx_users_email').on(table.email)]);

export const googleConnections = sqliteTable('google_connections', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), googleEmail: text('google_email').notNull(), refreshTokenEncrypted: text('refresh_token_encrypted').notNull(), accessTokenEncrypted: text('access_token_encrypted'), expiresAt: integer('expires_at', { mode: 'timestamp_ms' }), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(), updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [index('idx_google_connections_user_id').on(table.userId)]);

export const mccAccounts = sqliteTable('mcc_accounts', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), connectionId: text('connection_id').notNull(), customerId: text('customer_id').notNull(), name: text('name').notNull(), currency: text('currency'), timezone: text('timezone'), status: text('status').notNull(), lastSyncAt: integer('last_sync_at', { mode: 'timestamp_ms' }), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(), updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [index('idx_mcc_user_id').on(table.userId), uniqueIndex('idx_mcc_customer_user').on(table.customerId, table.userId), index('idx_mcc_status').on(table.status)]);

export const customerAccounts = sqliteTable('customer_accounts', {
  id: text('id').primaryKey(), mccId: text('mcc_id').notNull(), customerId: text('customer_id').notNull(), name: text('name').notNull(), currency: text('currency'), timezone: text('timezone'), status: text('status').notNull(), lastSyncAt: integer('last_sync_at', { mode: 'timestamp_ms' }), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(), updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [index('idx_customer_accounts_mcc_id').on(table.mccId), uniqueIndex('idx_customer_accounts_customer_mcc').on(table.customerId, table.mccId), index('idx_customer_accounts_status').on(table.status)]);

export const campaigns = sqliteTable('campaigns', {
  id: text('id').primaryKey(), customerAccountId: text('customer_account_id').notNull(), campaignId: text('campaign_id').notNull(), name: text('name').notNull(), status: text('status').notNull(), type: text('type').notNull(), budgetMicros: integer('budget_micros', { mode: 'number' }).notNull(), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(), updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [index('idx_campaigns_account_id').on(table.customerAccountId), uniqueIndex('idx_campaigns_campaign_account').on(table.campaignId, table.customerAccountId), index('idx_campaigns_status').on(table.status)]);

export const dailyMetrics = sqliteTable('daily_metrics', {
  id: text('id').primaryKey(), customerAccountId: text('customer_account_id').notNull(), campaignId: text('campaign_id'), date: text('date').notNull(), impressions: integer('impressions').notNull(), clicks: integer('clicks').notNull(), costMicros: integer('cost_micros', { mode: 'number' }).notNull(), conversions: real('conversions').notNull(), conversionValue: real('conversion_value').notNull(), ctr: real('ctr').notNull(), averageCpcMicros: integer('average_cpc_micros', { mode: 'number' }).notNull(),
}, table => [index('idx_daily_metrics_account_date').on(table.customerAccountId, table.date), index('idx_daily_metrics_campaign_date').on(table.campaignId, table.date), uniqueIndex('idx_daily_metrics_unique').on(table.customerAccountId, table.campaignId, table.date)]);

export const syncJobs = sqliteTable('sync_jobs', {
  id: text('id').primaryKey(), type: text('type').notNull(), status: text('status').notNull(), mccId: text('mcc_id'), customerAccountId: text('customer_account_id'), progress: integer('progress').notNull().default(0), startedAt: integer('started_at', { mode: 'timestamp_ms' }), completedAt: integer('completed_at', { mode: 'timestamp_ms' }), error: text('error'), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [index('idx_sync_jobs_status_created').on(table.status, table.createdAt), index('idx_sync_jobs_mcc_id').on(table.mccId), index('idx_sync_jobs_account_id').on(table.customerAccountId)]);

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), action: text('action').notNull(), entityType: text('entity_type').notNull(), entityId: text('entity_id').notNull(), metadata: text('metadata', { mode: 'json' }), ipAddress: text('ip_address'), createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, table => [index('idx_audit_logs_user_created').on(table.userId, table.createdAt), index('idx_audit_logs_entity').on(table.entityType, table.entityId), index('idx_audit_logs_action').on(table.action)]);

export function scopedDatabaseUrl(rawUrl = process.env.DATABASE_URL) {
  const schema = process.env.DATABASE_SCHEMA?.trim();
  if (!rawUrl || !schema) return rawUrl;

  const url = new URL(rawUrl);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) return rawUrl;
  url.searchParams.set('schema', schema);
  return url.toString();
}

export function configureDatabaseUrl() {
  const url = scopedDatabaseUrl();
  if (url) process.env.DATABASE_URL = url;
  return url;
}

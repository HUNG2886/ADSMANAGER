import pino from 'pino';
export const logger=pino({level:process.env.LOG_LEVEL||'info',redact:{paths:['*.accessToken','*.refreshToken','*.clientSecret','req.headers.authorization','req.headers.cookie'],censor:'[REDACTED]'}});

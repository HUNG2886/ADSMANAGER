import pino from 'pino';
export const logger=pino({level:process.env.LOG_LEVEL||'info',redact:{paths:[
  'accessToken','refreshToken','clientSecret','developerToken','authSecret','AUTH_SECRET',
  '*.accessToken','*.refreshToken','*.clientSecret','*.developerToken','*.authSecret','*.AUTH_SECRET',
  'req.headers.authorization','req.headers.cookie',
],censor:'[REDACTED]'}});

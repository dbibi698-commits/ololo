'use strict';
require('dotenv').config();
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { openDb, migrate } = require('./services/db');
const { purgeExpiredSessions } = require('./services/auth');

const config = {
  port: +(process.env.PORT || 3000),
  isProd: process.env.NODE_ENV === 'production',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
  sessionTtlHours: +(process.env.SESSION_TTL_HOURS || 12),
  trustProxy: process.env.TRUST_PROXY === 'true',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
};

function createApp(db) {
  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'blob:'], styleSrc: ["'self'"], scriptSrc: ["'self'"], frameAncestors: ["'none'"] } } }));

  // CORS: same-origin by default; only explicitly listed origins are allowed.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id, X-CSRF-Token');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use((req, res, next) => { // structured request log; never logs bodies or file contents
    const t = Date.now();
    res.on('finish', () => { if (req.path !== '/health') console.log(JSON.stringify({ t: new Date().toISOString(), m: req.method, p: req.path, s: res.statusCode, ms: Date.now() - t })); });
    next();
  });

  app.use(express.json({ limit: '100kb' }));
  app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  app.use(require('./routes/public')(db, config));
  app.use('/api/auth', require('./routes/auth')(db, config));
  app.use('/api/admin', require('./routes/admin')(db));
  app.use('/api/device', require('./routes/device')(db));

  // Only /public is served statically. /uploads is never exposed.
  app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error(JSON.stringify({ t: new Date().toISOString(), error: err.message }));
    res.status(err.status || 500).json({ error: err.status && err.status < 500 ? err.message : 'Server error.' });
  });
  return app;
}

if (require.main === module) {
  const db = openDb(process.env.DB_FILE || './data/murshid.db');
  migrate(db);
  setInterval(() => purgeExpiredSessions(db), 60 * 60 * 1000).unref();
  createApp(db).listen(config.port, () => console.log(`MURSHID AUTO PRINT running at http://localhost:${config.port}`));
}
module.exports = { createApp, config };

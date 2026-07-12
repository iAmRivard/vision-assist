import { createApp } from './app.js'; import { loadEnv } from './config/env.js'; import { createPool } from './database/pool.js';
const env = loadEnv(); const db = createPool(env); const server = createApp(env, db).listen(env.PORT, () => console.log(`VisionAssist API listening on :${env.PORT}`));
const shutdown = () => server.close(() => void db.end()); process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

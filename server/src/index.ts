import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { runMigrations } from './database/migrate.js';
import { createPool } from './database/pool.js';

const env = loadEnv();
const db = createPool(env);

async function start() {
  try {
    const applied = await runMigrations(db);
    for (const name of applied) console.log(`Database migration applied: ${name}`);

    const server = createApp(env, db).listen(env.PORT, () => {
      console.log(`VisionAssist API listening on :${env.PORT}`);
    });
    const shutdown = () => server.close(() => void db.end());
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('VisionAssist startup failed.', error);
    await db.end();
    process.exitCode = 1;
  }
}

void start();

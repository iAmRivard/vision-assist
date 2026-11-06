import { readFile, readdir } from 'node:fs/promises';
import type { Pool } from 'pg';

const migrationDirectory = new URL('./migrations/', import.meta.url);

export async function runMigrations(db: Pool, directory = migrationDirectory): Promise<string[]> {
  const files = (await readdir(directory)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  if (files.length === 0) {
    throw new Error('No database migrations found. Run the server build before starting.');
  }
  const migrations = await Promise.all(files.map(async name => ({
    name,
    sql: await readFile(new URL(name, directory), 'utf8'),
  })));
  const client = await db.connect();
  let discardClient = false;

  try {
    await client.query('BEGIN');
    // Serialize startup migrations across application instances until commit or rollback.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('vision-assist:migrations'))");
    await client.query(`CREATE TABLE IF NOT EXISTS vision_schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const result = await client.query<{ name: string }>('SELECT name FROM vision_schema_migrations');
    const applied = new Set(result.rows.map(row => row.name));
    const pending: string[] = [];

    for (const { name, sql } of migrations) {
      if (applied.has(name)) continue;
      try {
        await client.query(sql);
        await client.query('INSERT INTO vision_schema_migrations (name) VALUES ($1)', [name]);
      } catch (error) {
        throw new Error(`Database migration failed: ${name}`, { cause: error });
      }
      pending.push(name);
    }

    await client.query('COMMIT');
    return pending;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      discardClient = true;
    }
    throw error;
  } finally {
    client.release(discardClient);
  }
}

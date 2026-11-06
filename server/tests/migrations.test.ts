import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from '../src/database/migrate.js';
import { AnalysisRepository } from '../src/database/repositories/analysis.repository.js';

const databaseUrl = process.env['TEST_DATABASE_URL'];
const migrationDirectory = new URL('../src/database/migrations/', import.meta.url);
const migrationNames = ['001_create_vision_analyses.sql', '002_add_analysis_owner.sql'];

describe.skipIf(!databaseUrl)('database migrations (PostgreSQL)', () => {
  let admin: pg.Pool;
  let db: pg.Pool;
  let schema: string;

  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: databaseUrl });
    await admin.query('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public');
  });

  beforeEach(async () => {
    schema = `migration_test_${randomUUID().replaceAll('-', '')}`;
    await admin.query(`CREATE SCHEMA "${schema}"`);
    db = new pg.Pool({
      connectionString: databaseUrl,
      options: `-c search_path=${schema},public`,
    });
  });

  afterEach(async () => {
    await db.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
  });

  afterAll(async () => {
    await admin.end();
  });

  async function createLegacyAnalysis() {
    await db.query(await readFile(new URL(migrationNames[0]!, migrationDirectory), 'utf8'));
    const id = randomUUID();
    await db.query('INSERT INTO vision_analyses (id, object_name) VALUES ($1, $2)', [id, 'Legacy analysis']);
    return id;
  }

  async function recordedMigrations() {
    const result = await db.query<{ name: string }>('SELECT name FROM vision_schema_migrations ORDER BY name');
    return result.rows.map(row => row.name);
  }

  it('initializes a fresh database and supports saving and reading owned analyses', async () => {
    expect(await runMigrations(db)).toEqual(migrationNames);
    expect(await recordedMigrations()).toEqual(migrationNames);
    const ownerHash = 'a'.repeat(64);
    const repository = new AnalysisRepository(db);
    const saved = await repository.create(randomUUID(), ownerHash, {
      objectName: 'Router', category: 'Red', brand: null, model: null,
      confidence: 0.8, description: 'Distribuye Wi-Fi.', visibleText: [], warnings: [],
    });
    const history = await repository.list(ownerHash, 1, 20);
    expect(history.total).toBe(1);
    expect(history.items[0]?.id).toBe(saved.id);
    expect((await db.query("SELECT to_regclass('idx_vision_analyses_owner_created_at') AS name")).rows[0]?.name)
      .toBe('idx_vision_analyses_owner_created_at');
  });

  it('adds owner_hash to a legacy database while preserving existing records', async () => {
    const id = await createLegacyAnalysis();

    expect(await runMigrations(db)).toEqual(migrationNames);
    const result = await db.query('SELECT id, object_name, owner_hash FROM vision_analyses WHERE id=$1', [id]);
    expect(result.rows).toEqual([{ id, object_name: 'Legacy analysis', owner_hash: null }]);
    expect(await recordedMigrations()).toEqual(migrationNames);
  });

  it('adopts manually applied migrations and skips them on subsequent starts', async () => {
    const id = await createLegacyAnalysis();
    await db.query(await readFile(new URL(migrationNames[1]!, migrationDirectory), 'utf8'));
    expect(await runMigrations(db)).toEqual(migrationNames);

    expect(await runMigrations(db)).toEqual([]);
    expect(await recordedMigrations()).toEqual(migrationNames);
    expect((await db.query('SELECT id FROM vision_analyses')).rows).toEqual([{ id }]);
  });

  it('serializes simultaneous starts so each migration is applied once', async () => {
    const results = await Promise.all([runMigrations(db), runMigrations(db)]);

    expect(results.map(names => names.length).sort()).toEqual([0, 2]);
    expect(await recordedMigrations()).toEqual(migrationNames);
  });

  it('rolls back failed upgrades and allows a later retry', async () => {
    const id = await createLegacyAnalysis();
    const directory = await mkdtemp(join(tmpdir(), 'vision-assist-migrations-'));
    try {
      await cp(migrationDirectory, directory, { recursive: true });
      await writeFile(join(directory, '003_broken.sql'),
        'CREATE TABLE partial_upgrade (id INTEGER); SELECT missing_column FROM vision_analyses;');

      await expect(runMigrations(db, pathToFileURL(`${directory}${sep}`)))
        .rejects.toThrow('Database migration failed: 003_broken.sql');
      const tables = await db.query(`SELECT to_regclass('vision_schema_migrations') AS migrations,
        to_regclass('partial_upgrade') AS partial`);
      expect(tables.rows[0]).toEqual({ migrations: null, partial: null });
      const columns = await db.query(`SELECT column_name FROM information_schema.columns
        WHERE table_schema=$1 AND table_name='vision_analyses' AND column_name='owner_hash'`, [schema]);
      expect(columns.rows).toEqual([]);
      expect((await db.query('SELECT id FROM vision_analyses')).rows).toEqual([{ id }]);

      expect(await runMigrations(db)).toEqual(migrationNames);
      expect(await recordedMigrations()).toEqual(migrationNames);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

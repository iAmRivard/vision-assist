import type { Pool } from 'pg';
import type { StoredAnalysis, VisionAnalysis } from '../../types/vision.js';

const columns = `id, object_name AS "objectName", category, brand, model,
 confidence::float AS confidence, description, visible_text AS "visibleText",
 warnings, created_at AS "createdAt"`;

export class AnalysisRepository {
  constructor(private readonly db: Pool) {}
  async create(id: string, ownerHash: string, value: VisionAnalysis): Promise<StoredAnalysis> {
    const result = await this.db.query<StoredAnalysis>(`INSERT INTO vision_analyses
      (id, owner_hash, object_name, category, brand, model, confidence, description, visible_text, warnings)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${columns}`,
      [id, ownerHash, value.objectName, value.category, value.brand, value.model, value.confidence,
       value.description, JSON.stringify(value.visibleText), JSON.stringify(value.warnings)]);
    return result.rows[0]!;
  }
  async list(ownerHash: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const [items, count] = await Promise.all([
      this.db.query<StoredAnalysis>(`SELECT ${columns} FROM vision_analyses WHERE owner_hash=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [ownerHash, limit, offset]),
      this.db.query<{ count: string }>('SELECT COUNT(*) FROM vision_analyses WHERE owner_hash=$1', [ownerHash]),
    ]);
    const total = Number(count.rows[0]?.count ?? 0);
    return { items: items.rows, page, limit, total, totalPages: Math.ceil(total / limit) };
  }
  async find(ownerHash: string, id: string) { return (await this.db.query<StoredAnalysis>(`SELECT ${columns} FROM vision_analyses WHERE id=$1 AND owner_hash=$2`, [id, ownerHash])).rows[0] ?? null; }
  async delete(ownerHash: string, id: string) { return (await this.db.query('DELETE FROM vision_analyses WHERE id=$1 AND owner_hash=$2', [id, ownerHash])).rowCount === 1; }
  async deleteAll(ownerHash: string) { return (await this.db.query('DELETE FROM vision_analyses WHERE owner_hash=$1', [ownerHash])).rowCount ?? 0; }
}

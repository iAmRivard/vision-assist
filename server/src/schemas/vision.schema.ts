import { z } from 'zod';

const normalizeStringList = (value: unknown): unknown[] => {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return values.filter(item => typeof item !== 'string' || item.trim().length > 0);
};

export const visionAnalysisSchema = z.object({
  objectName: z.string().trim().min(1).max(255),
  category: z.preprocess(value => value ?? 'Sin categoría', z.string().trim().min(1).max(255)),
  brand: z.string().trim().min(1).max(255).nullable().catch(null),
  model: z.string().trim().min(1).max(255).nullable().catch(null),
  confidence: z.number().min(0).max(1),
  description: z.string().trim().min(1).max(2000),
  visibleText: z.preprocess(normalizeStringList, z.array(z.string().trim().min(1).max(500)).max(30)),
  warnings: z.preprocess(normalizeStringList, z.array(z.string().trim().min(1).max(500)).max(20)),
}).strict();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidSchema = z.string().uuid();

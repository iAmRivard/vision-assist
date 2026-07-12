import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  VISION_API_KEY: z.string().min(1),
  VISION_MODEL: z.string().default('gpt-4.1-mini'),
  VISION_API_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  MAX_IMAGE_SIZE_MB: z.coerce.number().positive().default(8),
  VISION_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  CORS_ORIGIN: z.string().default('http://localhost:8100'),
  ANALYZE_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
  CLIENT_ID_HASH_SECRET: z.string().min(32).default('development-only-change-this-secret'),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && value.CLIENT_ID_HASH_SECRET === 'development-only-change-this-secret') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['CLIENT_ID_HASH_SECRET'], message: 'Debe configurarse en producción.' });
  }
});

export type Environment = z.infer<typeof schema>;
export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Environment => schema.parse(source);

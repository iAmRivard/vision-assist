import pg from 'pg';
import type { Environment } from '../config/env.js';
export const createPool = (env: Environment) => new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });

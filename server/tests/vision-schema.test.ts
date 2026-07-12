import { describe, expect, it } from 'vitest'; import { visionAnalysisSchema } from '../src/schemas/vision.schema.js';
const valid = { objectName: 'Router', category: 'Red', brand: null, model: null, confidence: .8, description: 'Distribuye Wi-Fi.', visibleText: [], warnings: [] };
describe('visionAnalysisSchema', () => { it('accepts normalized data', () => expect(visionAnalysisSchema.parse(valid)).toEqual(valid)); it('rejects invented fields and invalid confidence', () => expect(visionAnalysisSchema.safeParse({ ...valid, confidence: 2, secret: true }).success).toBe(false)); });

export interface VisionAnalysis {
  objectName: string;
  category: string;
  brand: string | null;
  model: string | null;
  confidence: number;
  description: string;
  visibleText: string[];
  warnings: string[];
}

export interface VisionProvider { analyzeImage(image: Buffer): Promise<VisionAnalysis>; }
export interface StoredAnalysis extends VisionAnalysis { id: string; createdAt: string; }

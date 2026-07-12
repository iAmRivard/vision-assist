export type ScannerState = 'IDLE'|'SEARCHING'|'OBJECT_DETECTED'|'WAITING_FOR_STABILITY'|'CAPTURING'|'ANALYZING'|'RESULT'|'ERROR';
export interface VisionAnalysis { objectName:string; category:string; brand:string|null; model:string|null; confidence:number; description:string; visibleText:string[]; warnings:string[]; }
export interface StoredAnalysis extends VisionAnalysis { id:string; createdAt:string; }
export interface AnalyzeResponse { success:true; analysisId:string; result:VisionAnalysis; }
export interface HistoryResponse { success:true; items:StoredAnalysis[]; page:number; limit:number; total:number; totalPages:number; }
export interface FrameMetrics { brightness:number; variance:number; sharpness:number; motionScore:number; hasContent:boolean; acceptableExposure:boolean; sharp:boolean; }

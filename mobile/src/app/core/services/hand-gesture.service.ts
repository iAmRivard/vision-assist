import { Injectable } from '@angular/core';
import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

const MEDIAPIPE_VERSION = '0.10.35';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

@Injectable({ providedIn: 'root' })
export class HandGestureService {
  private landmarker?: HandLandmarker;
  private initializing?: Promise<void>;
  initialize(): Promise<void> { if (this.landmarker) return Promise.resolve(); return this.initializing ??= this.createLandmarker(); }
  isOpenPalm(video: HTMLVideoElement, timestampMs: number): boolean {
    if (!this.landmarker || video.readyState < 2) return false;
    const hand = this.landmarker.detectForVideo(video, timestampMs).landmarks[0];
    return hand ? this.extendedFingerCount(hand) >= 4 : false;
  }
  close(): void { this.landmarker?.close(); this.landmarker = undefined; this.initializing = undefined; }
  private async createLandmarker(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    const options = { runningMode: 'VIDEO' as const, numHands: 1, minHandDetectionConfidence: .65, minHandPresenceConfidence: .65, minTrackingConfidence: .6 };
    try { this.landmarker = await HandLandmarker.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' } }); }
    catch { this.landmarker = await HandLandmarker.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' } }); }
  }
  private extendedFingerCount(points: NormalizedLandmark[]): number {
    const wrist = points[0]!; const pairs = [[4,3],[8,6],[12,10],[16,14],[20,18]] as const;
    return pairs.filter(([tip,joint]) => this.distance(points[tip]!,wrist) > this.distance(points[joint]!,wrist)*1.12).length;
  }
  private distance(a:NormalizedLandmark,b:NormalizedLandmark):number { return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z); }
}

import { Injectable } from '@angular/core'; import { visionConfig } from '../config/vision.config'; import type { FrameMetrics } from '../models/vision.models';
@Injectable({providedIn:'root'}) export class FrameAnalysisService {
  measure(current: ImageData, previous?: ImageData): FrameMetrics {
    const {data,width,height}=current; const x0=Math.floor(width*(1-visionConfig.roiRatio)/2), y0=Math.floor(height*(1-visionConfig.roiRatio)/2), x1=width-x0, y1=height-y0;
    let sum=0,sumSq=0,sharp=0,motion=0,count=0;
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){ const i=(y*width+x)*4; const gray=(data[i]!+data[i+1]!+data[i+2]!)/3; sum+=gray;sumSq+=gray*gray;count++;
      if(x>x0){const p=i-4;sharp+=Math.abs(gray-(data[p]!+data[p+1]!+data[p+2]!)/3)}
      if(previous){const pd=previous.data;const old=(pd[i]!+pd[i+1]!+pd[i+2]!)/3;if(Math.abs(gray-old)>18)motion++;}
    }
    const brightness=sum/count, variance=sumSq/count-brightness*brightness, sharpness=sharp/count, motionScore=previous?motion/count:1;
    return {brightness,variance,sharpness,motionScore,hasContent:variance>=visionConfig.minimumVariance,acceptableExposure:brightness>=visionConfig.minimumBrightness&&brightness<=visionConfig.maximumBrightness,sharp:sharpness>=visionConfig.minimumSharpness};
  }
  perceptualHash(data:ImageData):string { const values:number[]=[]; for(let gy=0;gy<8;gy++)for(let gx=0;gx<8;gx++){const x=Math.floor((gx+.5)*data.width/8),y=Math.floor((gy+.5)*data.height/8),i=(y*data.width+x)*4;values.push((data.data[i]!+data.data[i+1]!+data.data[i+2]!)/3)} const avg=values.reduce((a,b)=>a+b,0)/values.length;return values.map(v=>v>=avg?'1':'0').join(''); }
  hashDistance(a:string,b:string):number { let n=0;for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])n++;return n+Math.abs(a.length-b.length); }
}

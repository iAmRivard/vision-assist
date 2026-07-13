import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

export type VoiceCommand = 'start' | 'stop';

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

@Injectable({ providedIn: 'root' })
export class VoiceCommandService {
  readonly commands$ = new Subject<VoiceCommand>();
  readonly errors$ = new Subject<string>();
  private recognition?: SpeechRecognitionLike;
  private shouldListen = false;

  constructor(private zone: NgZone) {}

  get available() {
    return Boolean(this.constructorForBrowser());
  }

  start() {
    const Recognition = this.constructorForBrowser();
    if (!Recognition) return false;
    this.shouldListen = true;
    if (!this.recognition) {
      this.recognition = new Recognition();
      this.recognition.lang = 'es-SV';
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.onresult = event => this.zone.run(() => this.handleResult(event));
      this.recognition.onerror = event => this.zone.run(() => this.handleError(event.error));
      this.recognition.onend = () => {
        if (this.shouldListen) window.setTimeout(() => this.beginListening(), 250);
      };
    }
    this.beginListening();
    return true;
  }

  stop() {
    this.shouldListen = false;
    try { this.recognition?.stop(); } catch { /* ya estaba detenido */ }
  }

  private beginListening() {
    try { this.recognition?.start(); } catch { /* ya está escuchando */ }
  }

  private handleResult(event: SpeechRecognitionEventLike) {
    for (let index = 0; index < event.results.length; index++) {
      const transcript = this.normalize(event.results[index]?.[0]?.transcript ?? '');
      if (/\b(comenzar|iniciar|empezar) (el )?analisis\b/.test(transcript)) this.commands$.next('start');
      if (/\b(pausar|detener|parar|terminar) (el )?analisis\b/.test(transcript)) this.commands$.next('stop');
    }
  }

  private handleError(error: string) {
    if (error === 'no-speech' || error === 'aborted') return;
    this.shouldListen = false;
    this.errors$.next(error === 'not-allowed' || error === 'service-not-allowed'
      ? 'Permiso de micrófono rechazado'
      : 'Los comandos de voz no están disponibles.');
  }

  private normalize(value: string) {
    return value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  private constructorForBrowser(): SpeechRecognitionConstructor | undefined {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  }
}

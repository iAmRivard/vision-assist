import { NgZone } from '@angular/core';
import { VoiceCommandService } from './voice-command.service';

class FakeRecognition {
  static instance: FakeRecognition;
  continuous = false;
  interimResults = false;
  lang = '';
  onresult = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  starts = 0;
  constructor() { FakeRecognition.instance = this; }
  start() { this.starts++; }
  stop() {}
}

describe('VoiceCommandService', () => {
  const speechWindow = window as typeof window & { webkitSpeechRecognition?: typeof FakeRecognition };
  const original = speechWindow.webkitSpeechRecognition;
  beforeEach(() => speechWindow.webkitSpeechRecognition = FakeRecognition);
  afterEach(() => speechWindow.webkitSpeechRecognition = original);

  it('stops restarting after a persistent recognition error', () => {
    const service = new VoiceCommandService({ run: <T>(action: () => T) => action() } as NgZone);
    service.start();
    FakeRecognition.instance.onerror?.({ error: 'network' });
    FakeRecognition.instance.onend?.();
    expect(FakeRecognition.instance.starts).toBe(1);
  });
});

import { Injectable } from '@angular/core';

const storageKey = 'vision-assist.client-id';

@Injectable({ providedIn: 'root' })
export class ClientIdentityService {
  readonly id = this.loadOrCreate();

  private loadOrCreate() {
    const stored = localStorage.getItem(storageKey);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(storageKey, id);
    return id;
  }
}

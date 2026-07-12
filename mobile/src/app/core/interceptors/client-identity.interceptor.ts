import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ClientIdentityService } from '../services/client-identity.service';

export const clientIdentityInterceptor: HttpInterceptorFn = (request, next) => {
  const identity = inject(ClientIdentityService);
  return next(request.clone({ setHeaders: { 'X-Client-ID': identity.id } }));
};

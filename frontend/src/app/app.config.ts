import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('http://localhost:3000')) {
    return next(req);
  }

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('techx_token') : null;
  if (!token) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
  ]
};

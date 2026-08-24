import { HttpInterceptorFn } from '@angular/common/http';

/** Reads JWT from localStorage only — never inject AuthService (NG0908 / NG0200). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/api')) {
    let token: string | null = null;
    try {
      token = localStorage.getItem('sextante.accessToken');
    } catch {
      token = null;
    }
    if (token) {
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
    }
  }
  return next(req);
};

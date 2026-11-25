import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const token = auth.accessToken;

  const isAuthEndpoint =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh');

  let authReq = req;
  if (token && !isAuthEndpoint) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint && auth.refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return auth.refresh().pipe(
            switchMap((res) => {
              isRefreshing = false;
              refreshTokenSubject.next(res.accessToken);
              return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } }));
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              auth.clearSession();
              toast.error('Your session expired. Please sign in again.');
              void router.navigate(['/login']);
              return throwError(() => refreshErr);
            })
          );
        }

        return refreshTokenSubject.pipe(
          filter((t): t is string => t !== null),
          take(1),
          switchMap((newToken) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }))
          )
        );
      }

      if (error.status === 500) {
        toast.error('Server error occurred. Please retry or contact support.');
      }

      return throwError(() => error);
    })
  );
};

export function extractApiError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (body && typeof body === 'object') {
      if (body.errors && typeof body.errors === 'object') {
        const firstKey = Object.keys(body.errors)[0];
        if (firstKey && Array.isArray(body.errors[firstKey]) && body.errors[firstKey].length > 0) {
          return String(body.errors[firstKey][0]);
        }
      }
      if (body.message) return String(body.message);
    }

    switch (err.status) {
      case 0:
        return 'Unable to reach the hospital server. Please verify the API is running and CORS is allowed.';
      case 400:
        return 'Invalid request. Please verify the submitted details.';
      case 401:
        return 'Authentication failed or session expired. Please sign in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Requested hospital record was not found.';
      case 409:
        return 'A conflicting record or booking already exists.';
      case 422:
        return 'Validation failed. Please check the highlighted fields.';
      case 500:
        return 'Unexpected hospital server error occurred.';
    }
  }
  return fallback;
}

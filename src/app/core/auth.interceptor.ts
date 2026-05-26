import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { SessionService } from './session.service';

let refreshInFlight$:
  | ReturnType<AuthApiService['refresh']>
  | null = null;

function isAuthEndpoint(url: string) {
  return url.includes('/api/auth/');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const api = inject(AuthApiService);
  const router = inject(Router);

  const skipAuth = req.headers.has('X-Skip-Auth') || isAuthEndpoint(req.url);
  const accessToken = session.accessToken();

  const authReq = !skipAuth && accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      const refreshToken = session.refreshToken();
      if (
        !(err instanceof HttpErrorResponse) ||
        err.status !== 401 ||
        skipAuth ||
        !refreshToken
      ) {
        return throwError(() => err);
      }

      if (!refreshInFlight$) {
        refreshInFlight$ = api.refresh(refreshToken).pipe(
          shareReplay(1),
          finalize(() => {
            refreshInFlight$ = null;
          })
        );
      }

      return refreshInFlight$.pipe(
        switchMap((tokens) => {
          session.setTokens(tokens);
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${tokens.accessToken}` }
          });
          return next(retryReq);
        }),
        catchError((refreshErr: unknown) => {
          session.clear();
          router.navigateByUrl('/login');
          return throwError(() => refreshErr);
        })
      );
    })
  );
};


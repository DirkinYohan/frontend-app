import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';
import type { Role } from './models';

export const authGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.isAuthenticated()) return true;
  return router.parseUrl('/login');
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (!session.isAuthenticated()) return true;
  return router.parseUrl('/');
};

export function roleGuard(requiredRole: Role): CanActivateFn {
  return () => {
    const session = inject(SessionService);
    const router = inject(Router);

    const role = session.user()?.role;
    if (!role) return router.parseUrl('/');
    if (role === requiredRole) return true;
    return router.parseUrl('/');
  };
}

